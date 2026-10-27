import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, X, Factory, PackageCheck, Warehouse, PackageX, Users } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { PageHeader, LoadingSpinner, EmptyState, Pagination, SummaryCard } from '../components/UI'
import StatusBadge from '../components/StatusBadge'
import { ReceiveModal } from '../components/PackingFlowModals'
import { formatDate, formatCount, PACKING_BATCH_STATUSES } from '../utils/helpers'
import toast from 'react-hot-toast'

// Received units split into packed / rejected / still to pack
export function PackingProgress({ batch }) {
  const { receivedQty: total, packedQty, rejectedQty } = batch
  if (!total) return null
  const pct = n => `${(n / total) * 100}%`
  return (
    <div className="flex h-1.5 w-full rounded-full bg-gray-100 overflow-hidden" title={`${packedQty} packed · ${rejectedQty} rejected · ${batch.pendingPackingQty} to pack`}>
      <div className="bg-forest-500" style={{ width: pct(packedQty) }} />
      <div className="bg-red-400" style={{ width: pct(rejectedQty) }} />
    </div>
  )
}

export default function PackingBatchList() {
  const { user } = useAuth()
  const canEdit = user?.role === 'admin' || user?.role === 'manager'
  const [batches, setBatches] = useState([])
  const [pagination, setPagination] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [period, setPeriod] = useState({ from: '', to: '' })
  const [page, setPage] = useState(1)
  const [showReceive, setShowReceive] = useState(false)

  const fetchBatches = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 25 }
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
      const res = await api.get('/packing-batches', { params })
      setBatches(res.data.data)
      setPagination(res.data.pagination)
    } catch { toast.error('Failed to load packing batches') }
    finally { setLoading(false) }
  }, [page, filters])

  const fetchSummary = useCallback(() => {
    const params = {}
    if (period.from) params.from = period.from
    if (period.to) params.to = period.to
    api.get('/packing-batches/summary', { params }).then(r => setSummary(r.data.data)).catch(() => {})
  }, [period])

  useEffect(() => { fetchBatches() }, [fetchBatches])
  useEffect(() => { fetchSummary() }, [fetchSummary])

  const setFilter = field => e => { setFilters(f => ({ ...f, [field]: e.target.value })); setPage(1) }
  const p = summary?.period || {}
  const c = summary?.current || {}

  return (
    <div>
      <PageHeader
        title="Packing Batches"
        subtitle="Production → Packing → Warehouse"
        actions={<>
          <Link to="/employees" className="btn-secondary"><Users size={15} /> Employees</Link>
          {canEdit && <button onClick={() => setShowReceive(true)} className="btn-primary"><Plus size={15} /> Receive from Production</button>}
        </>}
      />

      <div className="grid grid-cols-2 gap-4 mb-4">
        <SummaryCard title="Waiting to Pack" value={formatCount(c.pendingPacking)} subtitle={`${(c.batchesByStatus?.['Awaiting Packing'] || 0) + (c.batchesByStatus?.Packing || 0)} batches in packing`} icon={Factory} color="amber" />
        <SummaryCard title="Packed, Not in Warehouse" value={formatCount(c.inHand)} subtitle={`${c.batchesByStatus?.Packed || 0} batches ready to transfer`} icon={PackageCheck} color="purple" />
      </div>

      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <h2 className="font-semibold text-gray-800 flex-1">Movement {period.from || period.to ? 'in Period' : '(All Time)'}</h2>
          <input type="date" value={period.from} onChange={e => setPeriod(v => ({ ...v, from: e.target.value }))} className="input w-auto" aria-label="From date" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={period.to} onChange={e => setPeriod(v => ({ ...v, to: e.target.value }))} className="input w-auto" aria-label="To date" />
          {(period.from || period.to) && <button onClick={() => setPeriod({ from: '', to: '' })} className="btn-ghost text-red-500"><X size={14} /> All time</button>}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="From Production" value={formatCount(p.received)} subtitle="Units received" icon={Factory} color="blue" />
          <SummaryCard title="Packed" value={formatCount(p.packed)} subtitle={`${p.packingEntries || 0} packing entries`} icon={PackageCheck} color="forest" />
          <SummaryCard title="Rejected" value={formatCount(p.rejected)} subtitle={p.packed + p.rejected ? `${((p.rejected / (p.packed + p.rejected)) * 100).toFixed(1)}% of handled` : 'Damaged in packing'} icon={PackageX} color="red" />
          <SummaryCard title="To Warehouse" value={formatCount(p.transferred)} subtitle="Units transferred" icon={Warehouse} color="purple" />
        </div>
      </div>

      <div className="card p-4 mb-4">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={filters.search} onChange={setFilter('search')} placeholder="Search batch, product, production lot..." className="input pl-9" />
          </div>
          <select value={filters.status} onChange={setFilter('status')} className="input w-auto">
            <option value="">All Statuses</option>
            {PACKING_BATCH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {(filters.search || filters.status) && (
            <button onClick={() => { setFilters({ search: '', status: '' }); setPage(1) }} className="btn-ghost text-red-500"><X size={14} /> Clear</button>
          )}
        </div>
      </div>

      <div className="card">
        {loading ? <LoadingSpinner /> : batches.length === 0 ? (
          <EmptyState title="No packing batches" description="Receive finished product from production to start packing"
            action={canEdit && <button onClick={() => setShowReceive(true)} className="btn-primary">Receive from Production</button>} />
        ) : (
          <>
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Batch</th>
                    <th className="table-th">Product</th>
                    <th className="table-th">Received</th>
                    <th className="table-th">Packed</th>
                    <th className="table-th">Rejected</th>
                    <th className="table-th">To Pack</th>
                    <th className="table-th">To Warehouse</th>
                    <th className="table-th">In Hand</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {batches.map(b => (
                    <tr key={b._id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-td">
                        <Link to={`/packing-batches/${b._id}`} className="font-mono font-semibold text-forest-700 hover:underline">{b.batchNo}</Link>
                        <span className="block text-xs text-gray-400">{formatDate(b.receivedDate)}</span>
                      </td>
                      <td className="table-td">
                        <span className="font-medium text-gray-800 block truncate max-w-[200px]">{b.productName}</span>
                        <div className="mt-1 w-32"><PackingProgress batch={b} /></div>
                      </td>
                      <td className="table-td">{formatCount(b.receivedQty)} <span className="text-xs text-gray-400">{b.unit}</span></td>
                      <td className="table-td font-semibold text-forest-700">{formatCount(b.packedQty)}</td>
                      <td className="table-td text-red-600">{b.rejectedQty ? formatCount(b.rejectedQty) : '—'}</td>
                      <td className={`table-td ${b.pendingPackingQty ? 'font-semibold text-amber-700' : 'text-gray-400'}`}>{formatCount(b.pendingPackingQty)}</td>
                      <td className="table-td">{formatCount(b.transferredQty)}</td>
                      <td className={`table-td ${b.inHandQty ? 'font-semibold text-purple-700' : 'text-gray-400'}`}>{formatCount(b.inHandQty)}</td>
                      <td className="table-td"><StatusBadge status={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      <ReceiveModal
        open={showReceive}
        onClose={() => setShowReceive(false)}
        onDone={() => { setShowReceive(false); fetchBatches(); fetchSummary() }}
      />
    </div>
  )
}

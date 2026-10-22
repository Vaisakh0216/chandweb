import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, X } from 'lucide-react'
import api from '../api/axios'
import { PageHeader, LoadingSpinner, EmptyState, Pagination } from '../components/UI'
import StatusBadge from '../components/StatusBadge'
import { formatDate, formatCurrency, PROCUREMENT_STATUSES, DELIVERY_STATUSES } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function ProcurementList() {
  const [records, setRecords] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ search: '', status: '', deliveryStatus: '', dateFrom: '', dateTo: '' })
  const [page, setPage] = useState(1)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 25, ...filters }
      Object.keys(params).forEach(k => !params[k] && delete params[k])
      const res = await api.get('/procurement', { params })
      setRecords(res.data.data)
      setPagination(res.data.pagination)
    } catch { toast.error('Failed to load orders') }
    finally { setLoading(false) }
  }, [page, filters])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const clearFilters = () => { setFilters({ search: '', status: '', deliveryStatus: '', dateFrom: '', dateTo: '' }); setPage(1) }
  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        subtitle="Track all procurement orders and delivery status"
        actions={<Link to="/procurement/new" className="btn-primary"><Plus size={15} /> New Order</Link>}
      />

      <div className="card p-4 mb-4">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1) }}
              placeholder="Search product, vendor, PO ref..." className="input pl-9" />
          </div>
          <select value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1) }} className="input w-auto">
            <option value="">All Statuses</option>
            {PROCUREMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filters.deliveryStatus} onChange={e => { setFilters(f => ({ ...f, deliveryStatus: e.target.value })); setPage(1) }} className="input w-auto">
            <option value="">Delivery Status</option>
            {DELIVERY_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary"><Filter size={14} /></button>
          {hasFilters && <button onClick={clearFilters} className="btn-ghost text-red-500"><X size={14} /></button>}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
            <div><label className="label">Date From</label><input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="input" /></div>
            <div><label className="label">Date To</label><input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} className="input" /></div>
          </div>
        )}
      </div>

      <div className="card">
        {loading ? <LoadingSpinner /> : records.length === 0 ? (
          <EmptyState title="No purchase orders" description="Create your first purchase order" action={<Link to="/procurement/new" className="btn-primary">New Order</Link>} />
        ) : (
          <>
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Order Date</th>
                    <th className="table-th">Code</th>
                    <th className="table-th">Product Name</th>
                    <th className="table-th">Vendor</th>
                    <th className="table-th">Qty</th>
                    <th className="table-th">Total Price</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Delivery</th>
                    <th className="table-th">By</th>
                    <th className="table-th"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {records.map(r => (
                    <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-td text-gray-500">{formatDate(r.orderDate)}</td>
                      <td className="table-td">
                        {r.productCode ? <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{r.productCode}</span> : '—'}
                      </td>
                      <td className="table-td max-w-[200px]">
                        <p className="font-medium text-gray-800 truncate">{r.productName}</p>
                        {r.vendorResponse && <p className="text-xs text-gray-400 truncate">{r.vendorResponse}</p>}
                      </td>
                      <td className="table-td text-gray-600">{r.vendorSnapshot?.name || r.vendor?.name || '—'}</td>
                      <td className="table-td">{r.quantity ? `${r.quantity} ${r.unit}` : r.unit}</td>
                      <td className="table-td font-semibold">{r.totalPrice ? formatCurrency(r.totalPrice, r.currency) : '—'}</td>
                      <td className="table-td"><StatusBadge status={r.status} /></td>
                      <td className="table-td"><StatusBadge status={r.deliveryStatus} /></td>
                      <td className="table-td text-gray-500 text-xs">{r.orderedBy?.name || r.orderedByName || '—'}</td>
                      <td className="table-td"><Link to={`/procurement/${r._id}`} className="text-forest-600 text-xs font-medium hover:underline">View →</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}

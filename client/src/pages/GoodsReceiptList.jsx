import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, Download, X } from 'lucide-react'
import api from '../api/axios'
import { PageHeader, LoadingSpinner, EmptyState, Pagination } from '../components/UI'
import StatusBadge from '../components/StatusBadge'
import { formatDate, formatCurrency, QUALITY_STATUSES } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function GoodsReceiptList() {
  const [records, setRecords] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ search: '', qualityStatus: '', dateFrom: '', dateTo: '' })
  const [page, setPage] = useState(1)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 25, sort: '-receivedDate', ...filters }
      Object.keys(params).forEach(k => !params[k] && delete params[k])
      const res = await api.get('/goods-receipts', { params })
      setRecords(res.data.data)
      setPagination(res.data.pagination)
    } catch { toast.error('Failed to load goods receipts') }
    finally { setLoading(false) }
  }, [page, filters])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const clearFilters = () => { setFilters({ search: '', qualityStatus: '', dateFrom: '', dateTo: '' }); setPage(1) }
  const hasFilters = Object.values(filters).some(Boolean)

  const exportCSV = () => {
    const token = localStorage.getItem('token')
    const params = new URLSearchParams({ ...filters })
    Object.keys(filters).forEach(k => !filters[k] && params.delete(k))
    window.open(`/api/reports/export/goods-receipts?${params}`, '_blank')
  }

  return (
    <div>
      <PageHeader
        title="Goods Received"
        subtitle="Record and track all material deliveries — mirrors your Goods Receiving Data sheet"
        actions={
          <>
            <button onClick={exportCSV} className="btn-secondary"><Download size={15} /> Export CSV</button>
            <Link to="/goods-receipts/new" className="btn-primary"><Plus size={15} /> Record Receipt</Link>
          </>
        }
      />

      <div className="card p-4 mb-4">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={filters.search}
              onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1) }}
              placeholder="Search product, vendor, invoice no..." className="input pl-9" />
          </div>
          <select value={filters.qualityStatus}
            onChange={e => { setFilters(f => ({ ...f, qualityStatus: e.target.value })); setPage(1) }}
            className="input w-auto">
            <option value="">QC Status</option>
            {QUALITY_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary"><Filter size={14} /></button>
          {hasFilters && <button onClick={clearFilters} className="btn-ghost text-red-500"><X size={14} /></button>}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
            <div><label className="label">Received From</label><input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="input" /></div>
            <div><label className="label">Received To</label><input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} className="input" /></div>
          </div>
        )}
      </div>

      <div className="card">
        {loading ? <LoadingSpinner /> : records.length === 0 ? (
          <EmptyState title="No goods receipts" description="Record your first delivery" action={<Link to="/goods-receipts/new" className="btn-primary">Record Receipt</Link>} />
        ) : (
          <>
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">SL#</th>
                    <th className="table-th">Received Date</th>
                    <th className="table-th">Product Code</th>
                    <th className="table-th">Product Name</th>
                    <th className="table-th">Vendor</th>
                    <th className="table-th">Invoice No</th>
                    <th className="table-th">Invoice Date</th>
                    <th className="table-th">Received Qty</th>
                    <th className="table-th">Total Price</th>
                    <th className="table-th">Rate Per Unit</th>
                    <th className="table-th">Price/kg</th>
                    <th className="table-th">QC</th>
                    <th className="table-th"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {records.map((r, i) => (
                    <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-td text-gray-400 text-xs">{(pagination ? (pagination.page - 1) * pagination.limit : 0) + i + 1}</td>
                      <td className="table-td text-gray-600">{formatDate(r.receivedDate)}</td>
                      <td className="table-td">
                        {r.productCode ? <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{r.productCode}</span> : '—'}
                      </td>
                      <td className="table-td max-w-[200px]">
                        <p className="font-medium text-gray-800 truncate">{r.productName}</p>
                      </td>
                      <td className="table-td text-gray-600">{r.vendorSnapshot?.name || r.vendor?.name || '—'}</td>
                      <td className="table-td font-mono text-xs text-gray-600">{r.invoiceNo || '—'}</td>
                      <td className="table-td text-gray-500">{formatDate(r.invoiceDate)}</td>
                      <td className="table-td">{r.receivedQuantity} {r.unit}</td>
                      <td className="table-td font-semibold">{r.totalPrice ? formatCurrency(r.totalPrice, r.currency) : '—'}</td>
                      <td className="table-td text-gray-700">{r.ratePerUnit ? formatCurrency(r.ratePerUnit, r.currency) : '—'}</td>
                      <td className="table-td font-semibold text-forest-700">
                        {r.pricePerKg ? formatCurrency(r.pricePerKg, r.currency) + '/kg' : '—'}
                      </td>
                      <td className="table-td"><StatusBadge status={r.qualityStatus} /></td>
                      <td className="table-td">
                        <Link to={`/goods-receipts/${r._id}`} className="text-forest-600 text-xs font-medium hover:underline">View →</Link>
                      </td>
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

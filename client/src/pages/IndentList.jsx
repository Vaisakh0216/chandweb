import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, Download, ChevronDown, X } from 'lucide-react'
import api from '../api/axios'
import { PageHeader, LoadingSpinner, EmptyState, Pagination } from '../components/UI'
import StatusBadge from '../components/StatusBadge'
import { formatDate, INDENT_STATUSES } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function IndentList() {
  const [indents, setIndents] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ search: '', status: '', dateFrom: '', dateTo: '' })
  const [page, setPage] = useState(1)

  const fetchIndents = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 25, ...filters }
      Object.keys(params).forEach(k => !params[k] && delete params[k])
      const res = await api.get('/indents', { params })
      setIndents(res.data.data)
      setPagination(res.data.pagination)
    } catch {
      toast.error('Failed to load indents')
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => { fetchIndents() }, [fetchIndents])

  const clearFilters = () => { setFilters({ search: '', status: '', dateFrom: '', dateTo: '' }); setPage(1) }
  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div>
      <PageHeader
        title="Procurement Indents"
        subtitle="Plan and track material requirements for production"
        actions={
          <>
            <button
              onClick={() => { window.location.href = '/api/reports/export/indents?token=' + localStorage.getItem('token') }}
              className="btn-secondary"
            >
              <Download size={15} /> Export CSV
            </button>
            <Link to="/indents/new" className="btn-primary">
              <Plus size={15} /> New Indent
            </Link>
          </>
        }
      />

      {/* Search & Filter Bar */}
      <div className="card p-4 mb-4">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1) }}
              placeholder="Search product, vendor..."
              className="input pl-9"
            />
          </div>
          <select
            value={filters.status}
            onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1) }}
            className="input w-auto"
          >
            <option value="">All Statuses</option>
            {INDENT_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary">
            <Filter size={14} /> Filters {showFilters ? <ChevronDown size={14} className="rotate-180" /> : <ChevronDown size={14} />}
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost text-red-500">
              <X size={14} /> Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
            <div>
              <label className="label">Date From</label>
              <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Date To</label>
              <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} className="input" />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card">
        {loading ? <LoadingSpinner /> : indents.length === 0 ? (
          <EmptyState icon={ClipboardListIcon} title="No indents found" description="Create your first procurement indent to get started" action={<Link to="/indents/new" className="btn-primary">New Indent</Link>} />
        ) : (
          <>
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Indent Date</th>
                    <th className="table-th">Code</th>
                    <th className="table-th">Product / RM Name</th>
                    <th className="table-th">Qty to Order</th>
                    <th className="table-th">Vendor</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Assigned To</th>
                    <th className="table-th">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {indents.map(indent => (
                    <tr key={indent._id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-td text-gray-600">{formatDate(indent.indentDate)}</td>
                      <td className="table-td">
                        {indent.productCode
                          ? <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{indent.productCode}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="table-td max-w-[220px]">
                        <p className="font-medium text-gray-800 truncate">{indent.productName}</p>
                        {indent.cnsRemarks && <p className="text-xs text-gray-400 truncate max-w-[200px]">{indent.cnsRemarks}</p>}
                      </td>
                      <td className="table-td">
                        {indent.qtyToBeOrdered ? `${indent.qtyToBeOrdered} ${indent.unit}` : <span className="text-gray-400 text-xs">{indent.unit}</span>}
                      </td>
                      <td className="table-td text-gray-600">{indent.vendorName || indent.vendor?.name || <span className="text-gray-300">—</span>}</td>
                      <td className="table-td"><StatusBadge status={indent.status} /></td>
                      <td className="table-td text-gray-600">{indent.assignedTo?.name || indent.assignedToName || '—'}</td>
                      <td className="table-td">
                        <Link to={`/indents/${indent._id}`} className="text-forest-600 hover:text-forest-800 text-xs font-medium">View →</Link>
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

function ClipboardListIcon({ size }) { return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect width="6" height="4" x="9" y="3" rx="1"/><path d="M9 12h6M9 16h6"/></svg> }

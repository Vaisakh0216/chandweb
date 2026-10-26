import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search, Upload, Boxes, AlertTriangle, PackageX } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { PageHeader, LoadingSpinner, EmptyState, Pagination, SummaryCard } from '../components/UI'
import { StockActionModal, MaterialFormModal, ImportModal } from '../components/PackingStockModals'
import { formatDate, formatCurrency } from '../utils/helpers'
import toast from 'react-hot-toast'

export function StockLevel({ material }) {
  const { availableStock: stock, reorderLevel, unit } = material
  const tone = stock <= 0 ? 'text-red-600' : reorderLevel > 0 && stock <= reorderLevel ? 'text-amber-600' : 'text-gray-800'
  return (
    <span className={`font-semibold ${tone}`}>
      {Number(stock).toLocaleString('en-IN')} <span className="text-xs font-normal text-gray-500">{unit}</span>
    </span>
  )
}

export default function PackingStockList() {
  const { user } = useAuth()
  const canEdit = user?.role === 'admin' || user?.role === 'manager'
  const [materials, setMaterials] = useState([])
  const [summary, setSummary] = useState(null)
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState({ search: '', department: '', materialClass: '', stockStatus: searchParams.get('stockStatus') || '' })
  const [page, setPage] = useState(1)
  const [action, setAction] = useState(null) // { material, type }
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const fetchSummary = () => api.get('/packing-materials/summary').then(r => setSummary(r.data.data)).catch(() => {})

  const fetchMaterials = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 50 }
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
      const res = await api.get('/packing-materials', { params })
      setMaterials(res.data.data)
      setPagination(res.data.pagination)
    } catch { toast.error('Failed to load packing stock') }
    finally { setLoading(false) }
  }, [page, filters])

  useEffect(() => { fetchMaterials() }, [fetchMaterials])
  useEffect(() => { fetchSummary() }, [])

  const setFilter = field => e => { setFilters(f => ({ ...f, [field]: e.target.value })); setPage(1) }
  const refresh = () => { fetchMaterials(); fetchSummary() }

  const handleStockDone = (updated) => {
    setMaterials(list => list.map(m => (m._id === updated._id ? updated : m)))
    setAction(null)
    fetchSummary()
  }

  return (
    <div>
      <PageHeader
        title="Packing Material Stock"
        subtitle="Track available stock and record usage"
        actions={canEdit && (
          <>
            <button onClick={() => setShowImport(true)} className="btn-secondary"><Upload size={15} /> Import Sheet</button>
            <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={15} /> Add Material</button>
          </>
        )}
      />

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <SummaryCard title="Total Items" value={summary.totalItems} icon={Boxes} />
          <button onClick={() => { setFilters(f => ({ ...f, stockStatus: 'low' })); setPage(1) }} className="text-left">
            <SummaryCard title="Low Stock" value={summary.lowStock} subtitle="At or below reorder level" icon={AlertTriangle} color="amber" />
          </button>
          <button onClick={() => { setFilters(f => ({ ...f, stockStatus: 'out' })); setPage(1) }} className="text-left">
            <SummaryCard title="Out of Stock" value={summary.outOfStock} icon={PackageX} color="red" />
          </button>
        </div>
      )}

      <div className="card p-4 mb-4 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={filters.search} onChange={setFilter('search')}
            placeholder="Search by code, name, brand..." className="input pl-9" />
        </div>
        <select value={filters.department} onChange={setFilter('department')} className="input lg:w-44">
          <option value="">All Departments</option>
          {summary?.departments.map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={filters.materialClass} onChange={setFilter('materialClass')} className="input lg:w-44">
          <option value="">All Classes</option>
          {summary?.classes.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filters.stockStatus} onChange={setFilter('stockStatus')} className="input lg:w-40">
          <option value="">All Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>

      <div className="card">
        {loading ? <LoadingSpinner /> : materials.length === 0 ? (
          <EmptyState icon={Boxes} title="No packing materials found"
            description={canEdit ? 'Import your PMST sheet or add materials one by one' : undefined} />
        ) : (
          <>
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Code</th>
                    <th className="table-th">Product Name</th>
                    <th className="table-th">Brand</th>
                    <th className="table-th">Dept / Class</th>
                    <th className="table-th text-right">Available Stock</th>
                    <th className="table-th text-right">MRP</th>
                    <th className="table-th">Last Received</th>
                    <th className="table-th"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {materials.map(m => (
                    <tr key={m._id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-td"><span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{m.productCode}</span></td>
                      <td className="table-td font-medium text-gray-800 max-w-md truncate" title={m.productName}>
                        <Link to={`/packing-stock/${m._id}`} className="hover:text-forest-700">{m.productName}</Link>
                      </td>
                      <td className="table-td text-gray-500">{m.brand || '—'}</td>
                      <td className="table-td text-gray-500 text-xs">{[m.department, m.materialClass].filter(Boolean).join(' / ') || '—'}</td>
                      <td className="table-td text-right"><StockLevel material={m} /></td>
                      <td className="table-td text-right text-gray-500">{m.mrp != null ? formatCurrency(m.mrp) : '—'}</td>
                      <td className="table-td text-gray-500">{formatDate(m.lastReceiveDate)}</td>
                      <td className="table-td text-right">
                        {canEdit && (
                          <>
                            <button onClick={() => setAction({ material: m, type: 'issue' })} disabled={m.availableStock <= 0}
                              className="text-forest-700 text-xs font-semibold hover:underline mr-3 disabled:text-gray-300 disabled:no-underline">Use</button>
                            <button onClick={() => setAction({ material: m, type: 'receive' })}
                              className="text-blue-600 text-xs font-medium hover:underline mr-3">Receive</button>
                          </>
                        )}
                        <Link to={`/packing-stock/${m._id}`} className="text-gray-500 text-xs hover:underline">History →</Link>
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

      <StockActionModal material={action?.material} action={action?.type} onClose={() => setAction(null)} onDone={handleStockDone} />
      <MaterialFormModal open={showForm} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); refresh() }} />
      <ImportModal open={showImport} onClose={() => setShowImport(false)} onDone={refresh} />
    </div>
  )
}

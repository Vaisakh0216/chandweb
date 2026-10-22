import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import api from '../api/axios'
import { PageHeader, LoadingSpinner, EmptyState, Pagination } from '../components/UI'
import toast from 'react-hot-toast'

export default function ProductList() {
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 30 }
      if (search) params.search = search
      const res = await api.get('/products', { params })
      setProducts(res.data.data)
      setPagination(res.data.pagination)
    } catch { toast.error('Failed to load products') }
    finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete product "${name}"?`)) return
    try { await api.delete(`/products/${id}`); fetchProducts(); toast.success('Deleted') }
    catch (err) { toast.error(err.response?.data?.message || 'Delete failed') }
  }

  return (
    <div>
      <PageHeader
        title="Product Master"
        subtitle="Manage your raw material and product catalog"
        actions={
          <button onClick={() => {
            const name = prompt('Product Name:')
            const code = prompt('Product Code:')
            if (name) api.post('/products', { productName: name, productCode: code }).then(fetchProducts).catch(e => toast.error(e.response?.data?.message || 'Error'))
          }} className="btn-primary"><Plus size={15} /> Quick Add</button>
        }
      />

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by code, name, brand..." className="input pl-9" />
        </div>
      </div>

      <div className="card">
        {loading ? <LoadingSpinner /> : products.length === 0 ? (
          <EmptyState title="No products found" description="Add products from your PMST catalog" />
        ) : (
          <>
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Product Code</th>
                    <th className="table-th">Product Name</th>
                    <th className="table-th">Brand</th>
                    <th className="table-th">Category</th>
                    <th className="table-th">Default Unit</th>
                    <th className="table-th">Status</th>
                    <th className="table-th"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map(p => (
                    <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-td"><span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{p.productCode}</span></td>
                      <td className="table-td font-medium text-gray-800">{p.productName}</td>
                      <td className="table-td text-gray-500">{p.brand || '—'}</td>
                      <td className="table-td text-gray-500">{p.category || '—'}</td>
                      <td className="table-td text-gray-500">{p.defaultUnit}</td>
                      <td className="table-td">
                        <span className={`badge ${p.isActive ? 'status-received' : 'status-cancelled'}`}>{p.isActive ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="table-td">
                        <Link to={`/reports?productCode=${p.productCode}`} className="text-forest-600 text-xs font-medium hover:underline mr-3">Price History</Link>
                        <button onClick={() => handleDelete(p._id, p.productName)} className="text-red-400 hover:text-red-600 text-xs">Delete</button>
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

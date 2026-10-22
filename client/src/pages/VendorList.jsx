import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, X } from 'lucide-react'
import api from '../api/axios'
import { PageHeader, LoadingSpinner, EmptyState, Pagination } from '../components/UI'
import { formatDate } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function VendorList() {
  const [vendors, setVendors] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isActive, setIsActive] = useState('')
  const [page, setPage] = useState(1)

  const fetchVendors = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 25 }
      if (search) params.search = search
      if (isActive !== '') params.isActive = isActive
      const res = await api.get('/vendors', { params })
      setVendors(res.data.data)
      setPagination(res.data.pagination)
    } catch { toast.error('Failed to load vendors') }
    finally { setLoading(false) }
  }, [page, search, isActive])

  useEffect(() => { fetchVendors() }, [fetchVendors])

  return (
    <div>
      <PageHeader
        title="Vendor Management"
        subtitle="Manage your supplier database"
        actions={<Link to="/vendors/new" className="btn-primary"><Plus size={15} /> Add Vendor</Link>}
      />

      <div className="card p-4 mb-4">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by name, contact, email..." className="input pl-9" />
          </div>
          <select value={isActive} onChange={e => { setIsActive(e.target.value); setPage(1) }} className="input w-auto">
            <option value="">All Vendors</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          {(search || isActive) && (
            <button onClick={() => { setSearch(''); setIsActive(''); setPage(1) }} className="btn-ghost text-red-500">
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {loading ? <LoadingSpinner /> : vendors.length === 0 ? (
          <EmptyState title="No vendors found" description="Add your first vendor" action={<Link to="/vendors/new" className="btn-primary">Add Vendor</Link>} />
        ) : (
          <>
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Vendor Name</th>
                    <th className="table-th">Contact Person</th>
                    <th className="table-th">Phone</th>
                    <th className="table-th">Email</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Added</th>
                    <th className="table-th"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {vendors.map(v => (
                    <tr key={v._id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-td">
                        <Link to={`/vendors/${v._id}`} className="font-semibold text-forest-700 hover:underline">{v.name}</Link>
                      </td>
                      <td className="table-td text-gray-600">{v.contactPerson || '—'}</td>
                      <td className="table-td text-gray-600">{v.phone || '—'}</td>
                      <td className="table-td text-gray-600">{v.email || '—'}</td>
                      <td className="table-td">
                        <span className={`badge ${v.isActive ? 'status-received' : 'status-cancelled'}`}>
                          {v.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-td text-gray-500">{formatDate(v.createdAt)}</td>
                      <td className="table-td">
                        <Link to={`/vendors/${v._id}/edit`} className="text-forest-600 text-xs font-medium hover:underline">Edit</Link>
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

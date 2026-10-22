import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Edit, Trash2, ArrowLeft } from 'lucide-react'
import api from '../api/axios'
import { LoadingSpinner, ConfirmDialog, Pagination } from '../components/UI'
import StatusBadge from '../components/StatusBadge'
import { formatDate, formatCurrency } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function VendorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [vendor, setVendor] = useState(null)
  const [history, setHistory] = useState([])
  const [histPagination, setHistPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [histPage, setHistPage] = useState(1)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    api.get(`/vendors/${id}`).then(r => setVendor(r.data.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    api.get(`/vendors/${id}/history`, { params: { page: histPage } })
      .then(r => { setHistory(r.data.data); setHistPagination(r.data.pagination) })
      .catch(() => {})
  }, [id, histPage])

  const handleDelete = async () => {
    try {
      await api.delete(`/vendors/${id}`)
      toast.success('Vendor deleted')
      navigate('/vendors')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete vendor')
      setConfirmDelete(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (!vendor) return <div className="text-center py-16 text-gray-400">Vendor not found</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/vendors" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <h1 className="page-title flex-1 truncate">{vendor.name}</h1>
        <span className={`badge ${vendor.isActive ? 'status-received' : 'status-cancelled'}`}>{vendor.isActive ? 'Active' : 'Inactive'}</span>
        <Link to={`/vendors/${id}/edit`} className="btn-secondary"><Edit size={14} /> Edit</Link>
        <button onClick={() => setConfirmDelete(true)} className="btn-danger"><Trash2 size={14} /></button>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          <div><p className="label">Contact Person</p><p className="text-sm text-gray-800">{vendor.contactPerson || '—'}</p></div>
          <div><p className="label">Phone</p><p className="text-sm text-gray-800">{vendor.phone || '—'}</p></div>
          <div><p className="label">Email</p><p className="text-sm text-gray-800">{vendor.email || '—'}</p></div>
          <div className="sm:col-span-3"><p className="label">Address</p><p className="text-sm text-gray-800 whitespace-pre-line">{vendor.address || '—'}</p></div>
          {vendor.notes && <div className="sm:col-span-3"><p className="label">Notes</p><p className="text-sm text-gray-700">{vendor.notes}</p></div>}
        </div>
      </div>

      {/* Purchase History */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Purchase History</h2>
          <p className="text-xs text-gray-500">All goods received from {vendor.name}</p>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No purchase history yet</p>
        ) : (
          <>
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Date</th>
                    <th className="table-th">Product</th>
                    <th className="table-th">Invoice No</th>
                    <th className="table-th">Qty</th>
                    <th className="table-th">Total</th>
                    <th className="table-th">Rate/kg</th>
                    <th className="table-th">QC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.map(r => (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="table-td text-gray-500">{formatDate(r.receivedDate)}</td>
                      <td className="table-td">
                        <Link to={`/goods-receipts/${r._id}`} className="font-medium text-forest-700 hover:underline truncate max-w-[160px] block">{r.productName}</Link>
                        {r.productCode && <span className="font-mono text-xs text-gray-400">{r.productCode}</span>}
                      </td>
                      <td className="table-td font-mono text-xs text-gray-600">{r.invoiceNo || '—'}</td>
                      <td className="table-td">{r.receivedQuantity} {r.unit}</td>
                      <td className="table-td font-semibold">{r.totalPrice ? formatCurrency(r.totalPrice, r.currency) : '—'}</td>
                      <td className="table-td font-semibold text-forest-700">{r.pricePerKg ? formatCurrency(r.pricePerKg, r.currency) + '/kg' : r.ratePerUnit ? formatCurrency(r.ratePerUnit) : '—'}</td>
                      <td className="table-td"><StatusBadge status={r.qualityStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={histPagination} onPageChange={setHistPage} />
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Vendor"
        message={`Delete "${vendor.name}"? If this vendor has purchase history, deletion will be blocked.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

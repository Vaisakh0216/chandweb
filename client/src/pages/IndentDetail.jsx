import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Edit, Trash2, ArrowLeft, ShoppingCart } from 'lucide-react'
import api from '../api/axios'
import { LoadingSpinner, ConfirmDialog } from '../components/UI'
import StatusBadge from '../components/StatusBadge'
import { formatDate } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function IndentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [indent, setIndent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    api.get(`/indents/${id}`)
      .then(r => setIndent(r.data.data))
      .catch(() => toast.error('Failed to load indent'))
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    try {
      await api.delete(`/indents/${id}`)
      toast.success('Indent deleted')
      navigate('/indents')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    }
  }

  if (loading) return <LoadingSpinner />
  if (!indent) return <div className="text-center py-16 text-gray-400">Indent not found</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/indents" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <h1 className="page-title flex-1 truncate">{indent.productName}</h1>
        <div className="flex gap-2">
          <Link to={`/indents/${id}/edit`} className="btn-secondary"><Edit size={14} /> Edit</Link>
          <button onClick={() => setConfirmDelete(true)} className="btn-danger"><Trash2 size={14} /></button>
        </div>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          <Field label="Indent Date" value={formatDate(indent.indentDate)} />
          <Field label="Product Code" value={<span className="font-mono">{indent.productCode || '—'}</span>} />
          <Field label="Status" value={<StatusBadge status={indent.status} size="md" />} />
          <Field label="Qty to Order" value={indent.qtyToBeOrdered ? `${indent.qtyToBeOrdered} ${indent.unit}` : `${indent.unit}`} />
          <Field label="Vendor" value={indent.vendorName || indent.vendor?.name || '—'} />
          <Field label="Contact No" value={indent.contactNo || '—'} />
          <Field label="Assigned To" value={indent.assignedTo?.name || indent.assignedToName || '—'} />
          <Field label="Created" value={formatDate(indent.createdAt)} />
        </div>

        {indent.productDescription && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Field label="Product Description" value={indent.productDescription} />
          </div>
        )}

        {indent.cnsRemarks && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="label">CNS Remarks</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{indent.cnsRemarks}</p>
          </div>
        )}

        {indent.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="label">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{indent.notes}</p>
          </div>
        )}
      </div>

      {/* Convert to PO button */}
      <div className="card p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">Convert to Purchase Order</p>
          <p className="text-xs text-gray-500">Create a formal purchase order from this indent</p>
        </div>
        <Link
          to={`/procurement/new?indentId=${id}&productCode=${indent.productCode || ''}&productName=${encodeURIComponent(indent.productName)}&qty=${indent.qtyToBeOrdered || ''}&unit=${indent.unit}&vendorId=${indent.vendor?._id || ''}`}
          className="btn-primary"
        >
          <ShoppingCart size={14} /> Create PO
        </Link>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Indent"
        message={`Are you sure you want to delete the indent for "${indent.productName}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="text-sm text-gray-800">{value || '—'}</p>
    </div>
  )
}

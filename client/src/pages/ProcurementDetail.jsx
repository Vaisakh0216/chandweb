import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Edit, Trash2, ArrowLeft, PackageCheck } from 'lucide-react'
import api from '../api/axios'
import { LoadingSpinner, ConfirmDialog } from '../components/UI'
import StatusBadge from '../components/StatusBadge'
import PriceComparison from '../components/PriceComparison'
import { formatDate, formatCurrency } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function ProcurementDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [record, setRecord] = useState(null)
  const [priceComparison, setPriceComparison] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    api.get(`/procurement/${id}`)
      .then(r => { setRecord(r.data.data); setPriceComparison(r.data.priceComparison) })
      .catch(() => toast.error('Failed to load order'))
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    try {
      await api.delete(`/procurement/${id}`)
      toast.success('Order deleted')
      navigate('/procurement')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    }
  }

  if (loading) return <LoadingSpinner />
  if (!record) return <div className="text-center py-16 text-gray-400">Order not found</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/procurement" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <h1 className="page-title flex-1 truncate">{record.productName}</h1>
        <Link to={`/procurement/${id}/edit`} className="btn-secondary"><Edit size={14} /> Edit</Link>
        <button onClick={() => setConfirmDelete(true)} className="btn-danger"><Trash2 size={14} /></button>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          <Field label="Order Date" value={formatDate(record.orderDate)} />
          <Field label="Intended Date" value={formatDate(record.intendedDate)} />
          <Field label="Expected Delivery" value={formatDate(record.expectedDeliveryDate)} />
          <Field label="Product Code" value={<span className="font-mono">{record.productCode || '—'}</span>} />
          <Field label="Order Status" value={<StatusBadge status={record.status} size="md" />} />
          <Field label="Delivery Status" value={<StatusBadge status={record.deliveryStatus} size="md" />} />
          <Field label="Vendor" value={record.vendorSnapshot?.name || record.vendor?.name || '—'} />
          <Field label="Contact" value={record.vendorSnapshot?.phone || record.vendor?.phone || '—'} />
          <Field label="PO Reference" value={record.poReference || '—'} />
          <Field label="Quantity" value={record.quantity ? `${record.quantity} ${record.unit}` : record.unit} />
          <Field label="Total Price" value={record.totalPrice ? formatCurrency(record.totalPrice, record.currency) : '—'} />
          <Field label="Price Per Kg" value={record.pricePerKg ? formatCurrency(record.pricePerKg, record.currency) + '/kg' : '—'} />
          <Field label="Ordered By" value={record.orderedBy?.name || record.orderedByName || '—'} />
          <Field label="Created" value={formatDate(record.createdAt)} />
        </div>

        {record.vendorResponse && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="label">Vendor Response</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{record.vendorResponse}</p>
          </div>
        )}
        {record.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="label">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{record.notes}</p>
          </div>
        )}
      </div>

      {priceComparison && <PriceComparison comparison={priceComparison} currency={record.currency} />}

      {/* Convert to Goods Receipt */}
      {(record.status === 'Ordered' || record.status === 'Partially Received') && (
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">Record Goods Receipt</p>
            <p className="text-xs text-gray-500">Mark this order as received with invoice details</p>
          </div>
          <Link
            to={`/goods-receipts/new?procId=${id}&productCode=${record.productCode || ''}&productName=${encodeURIComponent(record.productName)}&unit=${record.unit}&vendorId=${record.vendor?._id || ''}`}
            className="btn-primary"
          >
            <PackageCheck size={14} /> Record Receipt
          </Link>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Purchase Order"
        message={`Delete order for "${record.productName}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function Field({ label, value }) {
  return <div><p className="label">{label}</p><p className="text-sm text-gray-800">{value || '—'}</p></div>
}

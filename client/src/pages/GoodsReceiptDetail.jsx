import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Edit, Trash2, ArrowLeft } from 'lucide-react'
import api from '../api/axios'
import { LoadingSpinner, ConfirmDialog } from '../components/UI'
import StatusBadge from '../components/StatusBadge'
import PriceComparison from '../components/PriceComparison'
import { formatDate, formatCurrency } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function GoodsReceiptDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [receipt, setReceipt] = useState(null)
  const [priceComparison, setPriceComparison] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    api.get(`/goods-receipts/${id}`)
      .then(r => { setReceipt(r.data.data); setPriceComparison(r.data.priceComparison) })
      .catch(() => toast.error('Failed to load receipt'))
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    try {
      await api.delete(`/goods-receipts/${id}`)
      toast.success('Receipt deleted')
      navigate('/goods-receipts')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    }
  }

  if (loading) return <LoadingSpinner />
  if (!receipt) return <div className="text-center py-16 text-gray-400">Receipt not found</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/goods-receipts" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <h1 className="page-title flex-1 truncate">{receipt.productName}</h1>
        <Link to={`/goods-receipts/${id}/edit`} className="btn-secondary"><Edit size={14} /> Edit</Link>
        <button onClick={() => setConfirmDelete(true)} className="btn-danger"><Trash2 size={14} /></button>
      </div>

      {/* Main Info — matches Goods Receiving Data columns */}
      <div className="card p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          <Field label="Received Date" value={formatDate(receipt.receivedDate)} />
          <Field label="Product Code" value={<span className="font-mono">{receipt.productCode || '—'}</span>} />
          <Field label="Invoice No" value={<span className="font-mono">{receipt.invoiceNo || '—'}</span>} />
          <Field label="Invoice Date" value={formatDate(receipt.invoiceDate)} />
          <Field label="Vendor" value={receipt.vendorSnapshot?.name || receipt.vendor?.name || '—'} />
          <Field label="Vendor Phone" value={receipt.vendorSnapshot?.phone || receipt.vendor?.phone || '—'} />
          <Field label="Vendor Email" value={receipt.vendorSnapshot?.email || receipt.vendor?.email || '—'} />
          <Field label="Received Qty" value={`${receipt.receivedQuantity} ${receipt.unit}`} />
          <Field label="Total Price" value={receipt.totalPrice ? formatCurrency(receipt.totalPrice, receipt.currency) : '—'} />
          <Field label="Rate Per Unit" value={receipt.ratePerUnit ? formatCurrency(receipt.ratePerUnit, receipt.currency) + `/${receipt.unit}` : '—'} />
          <Field label="Price Per KG" value={receipt.pricePerKg ? <span className="font-bold text-forest-700">{formatCurrency(receipt.pricePerKg, receipt.currency)}/kg</span> : '—'} />
          <Field label="QC Status" value={<StatusBadge status={receipt.qualityStatus} size="md" />} />
          <Field label="Received By" value={receipt.receivedBy?.name || receipt.receivedByName || '—'} />
        </div>

        {receipt.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="label">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{receipt.notes}</p>
          </div>
        )}
      </div>

      {/* Price Comparison */}
      {priceComparison && <PriceComparison comparison={priceComparison} currency={receipt.currency} />}

      {/* Linked PO */}
      {receipt.procurement && (
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Linked Purchase Order</p>
          <Link to={`/procurement/${receipt.procurement._id || receipt.procurement}`} className="text-sm text-forest-600 hover:underline font-medium">
            View Purchase Order →
          </Link>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Goods Receipt"
        message={`Delete receipt for "${receipt.productName}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function Field({ label, value }) {
  return <div><p className="label">{label}</p><div className="text-sm text-gray-800">{value || '—'}</div></div>
}

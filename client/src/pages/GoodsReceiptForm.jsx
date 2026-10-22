import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import VendorSelector from '../components/VendorSelector'
import PriceCalculatorPreview from '../components/PriceCalculatorPreview'
import { PageHeader, LoadingSpinner } from '../components/UI'
import { UNITS, QUALITY_STATUSES, CURRENCIES, formatDateInput } from '../utils/helpers'
import toast from 'react-hot-toast'

const EMPTY = {
  receivedDate: formatDateInput(new Date()),
  invoiceDate: '', invoiceNo: '',
  productCode: '', productName: '',
  vendor: '', receivedQuantity: '', unit: 'kg',
  totalPrice: '', currency: 'INR',
  qualityStatus: 'Pending Inspection', notes: '',
}

export default function GoodsReceiptForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [form, setForm] = useState({
    ...EMPTY,
    productCode: searchParams.get('productCode') || '',
    productName: searchParams.get('productName') || '',
    unit: searchParams.get('unit') || 'kg',
    vendor: searchParams.get('vendorId') || '',
  })
  const [procId] = useState(searchParams.get('procId') || '')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    api.get(`/goods-receipts/${id}`).then(r => {
      const d = r.data.data
      setForm({
        receivedDate: formatDateInput(d.receivedDate),
        invoiceDate: formatDateInput(d.invoiceDate),
        invoiceNo: d.invoiceNo || '',
        productCode: d.productCode || '',
        productName: d.productName || '',
        vendor: d.vendor?._id || '',
        receivedQuantity: d.receivedQuantity || '',
        unit: d.unit || 'kg',
        totalPrice: d.totalPrice || '',
        currency: d.currency || 'INR',
        qualityStatus: d.qualityStatus || 'Pending Inspection',
        notes: d.notes || '',
      })
    }).catch(() => toast.error('Failed to load')).finally(() => setFetching(false))
  }, [id, isEdit])

  const set = field => e => setForm(f => ({ ...f, [field]: typeof e === 'string' ? e : e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.productName.trim()) { toast.error('Product name is required'); return }
    if (!form.receivedQuantity) { toast.error('Received quantity is required'); return }
    setLoading(true)
    try {
      const payload = { ...form }
      if (!payload.vendor) delete payload.vendor
      if (!payload.totalPrice) delete payload.totalPrice
      if (procId) payload.procurement = procId
      if (isEdit) await api.put(`/goods-receipts/${id}`, payload)
      else await api.post('/goods-receipts', payload)
      toast.success(isEdit ? 'Receipt updated!' : 'Receipt recorded!')
      navigate('/goods-receipts')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <LoadingSpinner />

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title={isEdit ? 'Edit Goods Receipt' : 'Record Goods Receipt'}
        subtitle="Log a material delivery — matches your Goods Receiving Data sheet"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Receipt Info */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Receipt Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Received Date *</label>
              <input type="date" value={form.receivedDate} onChange={set('receivedDate')} className="input" required />
            </div>
            <div>
              <label className="label">Invoice No</label>
              <input type="text" value={form.invoiceNo} onChange={set('invoiceNo')} className="input" placeholder="e.g. NSC/2350/26-27" />
            </div>
            <div>
              <label className="label">Invoice Date</label>
              <input type="date" value={form.invoiceDate} onChange={set('invoiceDate')} className="input" />
            </div>
          </div>
        </div>

        {/* Product */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Product</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Product Code</label>
              <input type="text" value={form.productCode} onChange={set('productCode')} className="input" placeholder="e.g. 14370" />
            </div>
            <div>
              <label className="label">Product / RM Name *</label>
              <input type="text" value={form.productName} onChange={set('productName')} className="input" placeholder="Material name" required />
            </div>
          </div>
        </div>

        {/* Vendor */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Vendor</h2>
          <VendorSelector value={form.vendor} onChange={v => setForm(f => ({ ...f, vendor: v }))} />
        </div>

        {/* Quantity & Price */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Received Quantity & Price</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Received Qty *</label>
              <input type="number" value={form.receivedQuantity} onChange={set('receivedQuantity')} className="input" placeholder="0" min="0" step="any" required />
            </div>
            <div>
              <label className="label">Unit</label>
              <select value={form.unit} onChange={set('unit')} className="input">
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Total Price</label>
              <input type="number" value={form.totalPrice} onChange={set('totalPrice')} className="input" placeholder="0.00" min="0" step="any" />
            </div>
            <div>
              <label className="label">Currency</label>
              <select value={form.currency} onChange={set('currency')} className="input">
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <PriceCalculatorPreview quantity={form.receivedQuantity} unit={form.unit} totalPrice={form.totalPrice} currency={form.currency} />
        </div>

        {/* QC */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Quality Check</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">QC Status</label>
              <select value={form.qualityStatus} onChange={set('qualityStatus')} className="input">
                {QUALITY_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea value={form.notes} onChange={set('notes')} className="input" rows={2} placeholder="Inspection notes, observations..." />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/goods-receipts')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : isEdit ? 'Update Receipt' : 'Record Receipt'}
          </button>
        </div>
      </form>
    </div>
  )
}

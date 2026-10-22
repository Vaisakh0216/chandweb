import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import VendorSelector from '../components/VendorSelector'
import PriceCalculatorPreview from '../components/PriceCalculatorPreview'
import { PageHeader, LoadingSpinner } from '../components/UI'
import { UNITS, PROCUREMENT_STATUSES, DELIVERY_STATUSES, CURRENCIES, formatDateInput } from '../utils/helpers'
import toast from 'react-hot-toast'

const EMPTY = {
  orderDate: formatDateInput(new Date()),
  intendedDate: '', expectedDeliveryDate: '',
  productCode: '', productName: '', productDescription: '',
  vendor: '', quantity: '', unit: 'kg', totalPrice: '', currency: 'INR',
  status: 'Ordered', deliveryStatus: 'Awaiting',
  poReference: '', vendorResponse: '', notes: '',
}

export default function ProcurementForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [form, setForm] = useState({
    ...EMPTY,
    productCode: searchParams.get('productCode') || '',
    productName: searchParams.get('productName') || '',
    quantity: searchParams.get('qty') || '',
    unit: searchParams.get('unit') || 'kg',
    vendor: searchParams.get('vendorId') || '',
  })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    api.get(`/procurement/${id}`).then(r => {
      const d = r.data.data
      setForm({
        orderDate: formatDateInput(d.orderDate),
        intendedDate: formatDateInput(d.intendedDate),
        expectedDeliveryDate: formatDateInput(d.expectedDeliveryDate),
        productCode: d.productCode || '',
        productName: d.productName || '',
        productDescription: d.productDescription || '',
        vendor: d.vendor?._id || '',
        quantity: d.quantity || '',
        unit: d.unit || 'kg',
        totalPrice: d.totalPrice || '',
        currency: d.currency || 'INR',
        status: d.status || 'Ordered',
        deliveryStatus: d.deliveryStatus || 'Awaiting',
        poReference: d.poReference || '',
        vendorResponse: d.vendorResponse || '',
        notes: d.notes || '',
      })
    }).catch(() => toast.error('Failed to load order')).finally(() => setFetching(false))
  }, [id, isEdit])

  const set = field => e => setForm(f => ({ ...f, [field]: typeof e === 'string' ? e : e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.productName.trim()) { toast.error('Product name is required'); return }
    setLoading(true)
    try {
      const payload = { ...form }
      if (!payload.vendor) delete payload.vendor
      if (!payload.quantity) delete payload.quantity
      if (!payload.totalPrice) delete payload.totalPrice
      if (isEdit) await api.put(`/procurement/${id}`, payload)
      else await api.post('/procurement', payload)
      toast.success(isEdit ? 'Order updated!' : 'Order created!')
      navigate('/procurement')
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
        title={isEdit ? 'Edit Purchase Order' : 'New Purchase Order'}
        subtitle="Record a vendor order for materials"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Info */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Order Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Order Date *</label>
              <input type="date" value={form.orderDate} onChange={set('orderDate')} className="input" required />
            </div>
            <div>
              <label className="label">Intended Date (Required for Production)</label>
              <input type="date" value={form.intendedDate} onChange={set('intendedDate')} className="input" />
            </div>
            <div>
              <label className="label">Expected Delivery Date</label>
              <input type="date" value={form.expectedDeliveryDate} onChange={set('expectedDeliveryDate')} className="input" />
            </div>
            <div>
              <label className="label">PO / Invoice Reference</label>
              <input type="text" value={form.poReference} onChange={set('poReference')} className="input" placeholder="e.g. PO-2026-001" />
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
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <input type="text" value={form.productDescription} onChange={set('productDescription')} className="input" placeholder="Optional description" />
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
          <h2 className="font-semibold text-gray-800 mb-4">Quantity & Price</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Quantity</label>
              <input type="number" value={form.quantity} onChange={set('quantity')} className="input" placeholder="0" min="0" step="any" />
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
          <PriceCalculatorPreview quantity={form.quantity} unit={form.unit} totalPrice={form.totalPrice} currency={form.currency} />
        </div>

        {/* Status */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Order Status</label>
              <select value={form.status} onChange={set('status')} className="input">
                {PROCUREMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Delivery Status</label>
              <select value={form.deliveryStatus} onChange={set('deliveryStatus')} className="input">
                {DELIVERY_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Remarks</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Vendor Response / Remarks</label>
              <textarea value={form.vendorResponse} onChange={set('vendorResponse')} className="input" rows={3} placeholder="Vendor's response, sample dispatch info, etc." />
            </div>
            <div>
              <label className="label">Internal Notes</label>
              <textarea value={form.notes} onChange={set('notes')} className="input" rows={2} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/procurement')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : isEdit ? 'Update Order' : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  )
}

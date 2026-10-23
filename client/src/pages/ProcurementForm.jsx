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
  status: 'Ordered', deliveryStatus: 'Awaiting', receivedQuantity: '',
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
    intendedDate: searchParams.get('intendedDate') || '',
  })
  const indentId = !isEdit ? searchParams.get('indentId') : null
  const [linkedIndent, setLinkedIndent] = useState(null)
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
        receivedQuantity: d.receivedQuantity || '',
        poReference: d.poReference || '',
        vendorResponse: d.vendorResponse || '',
        notes: d.notes || '',
      })
      setLinkedIndent(d.indentRef || null)
    }).catch(() => toast.error('Failed to load order')).finally(() => setFetching(false))
  }, [id, isEdit])

  useEffect(() => {
    if (!indentId) return
    api.get(`/indents/${indentId}`).then(r => setLinkedIndent(r.data.data)).catch(() => {})
  }, [indentId])

  const set = field => e => setForm(f => ({ ...f, [field]: typeof e === 'string' ? e : e.target.value }))

  // Received / Partially Received mean the same thing in both dropdowns, so keep them in step
  const RECEIVED_STATES = ['Received', 'Partially Received']
  const setLinkedStatus = (field, other) => e => {
    const value = e.target.value
    setForm(f => ({ ...f, [field]: value, ...(RECEIVED_STATES.includes(value) && { [other]: value }) }))
  }

  const isPartial = form.status === 'Partially Received'
  const orderedQty = parseFloat(form.quantity) || 0
  const receivedQty = parseFloat(form.receivedQuantity) || 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.productName.trim()) { toast.error('Product name is required'); return }
    if (isPartial) {
      if (!(receivedQty > 0)) { toast.error('Please enter the partially received quantity'); return }
      if (orderedQty && receivedQty >= orderedQty) {
        toast.error(`Received quantity must be less than the ordered quantity (${orderedQty})`); return
      }
    }
    setLoading(true)
    try {
      const payload = { ...form }
      if (!payload.vendor) delete payload.vendor
      if (!payload.quantity) delete payload.quantity
      if (!payload.totalPrice) delete payload.totalPrice
      if (!isPartial) delete payload.receivedQuantity
      if (indentId) payload.indentRef = indentId
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

      {linkedIndent && (
        <div className="mb-4 p-3 rounded-lg bg-forest-50 border border-forest-200 text-sm text-forest-800">
          Linked to indent <span className="font-semibold">{linkedIndent.productName}</span>
          {linkedIndent.indentDate && <> dated {new Date(linkedIndent.indentDate).toLocaleDateString()}</>}
          . Status changes here will update the indent automatically.
        </div>
      )}

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
              <select value={form.status} onChange={setLinkedStatus('status', 'deliveryStatus')} className="input">
                {PROCUREMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Delivery Status</label>
              <select value={form.deliveryStatus} onChange={setLinkedStatus('deliveryStatus', 'status')} className="input">
                {DELIVERY_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            {isPartial && (
              <div className="col-span-2">
                <label className="label">Received Quantity So Far *</label>
                <div className="flex items-center gap-3">
                  <input type="number" value={form.receivedQuantity} onChange={set('receivedQuantity')}
                    className="input max-w-[200px]" placeholder="0" min="0" step="any"
                    max={orderedQty || undefined} required />
                  <span className="text-sm text-gray-600">
                    {form.unit}
                    {orderedQty > 0 && <> of {orderedQty} {form.unit} ordered
                      {receivedQty > 0 && receivedQty < orderedQty && (
                        <span className="text-amber-700 font-medium"> · {+(orderedQty - receivedQty).toFixed(3)} {form.unit} pending</span>
                      )}
                    </>}
                  </span>
                </div>
              </div>
            )}
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

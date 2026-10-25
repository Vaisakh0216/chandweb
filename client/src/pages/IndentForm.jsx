import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios'
import VendorSelector from '../components/VendorSelector'
import { PageHeader, LoadingSpinner } from '../components/UI'
import { UNITS, INDENT_STATUSES, formatDateInput } from '../utils/helpers'
import toast from 'react-hot-toast'

const EMPTY = {
  indentDate: formatDateInput(new Date()),
  productCode: '', productName: '', productDescription: '',
  qtyToBeOrdered: '', unit: 'kg', vendor: '', vendorName: '', vendorAlternate: '',
  status: 'Pending', cnsRemarks: '', contactNo: '', notes: '',
}

export default function IndentForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [form, setForm] = useState(EMPTY)
  const [linkedPO, setLinkedPO] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    api.get(`/indents/${id}`).then(r => {
      const d = r.data.data
      setForm({
        indentDate: formatDateInput(d.indentDate),
        productCode: d.productCode || '',
        productName: d.productName || '',
        productDescription: d.productDescription || '',
        qtyToBeOrdered: d.qtyToBeOrdered || '',
        unit: d.unit || 'kg',
        vendor: d.vendor?._id || '',
        vendorName: d.vendorName || '',
        vendorAlternate: d.vendorAlternate || '',
        status: d.status || 'Pending',
        cnsRemarks: d.cnsRemarks || '',
        contactNo: d.contactNo || '',
        notes: d.notes || '',
      })
      setLinkedPO(d.purchaseOrderRef || null)
    }).catch(() => toast.error('Failed to load indent')).finally(() => setFetching(false))
  }, [id, isEdit])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: typeof e === 'string' ? e : e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.productName.trim()) { toast.error('Product/RM Name is required'); return }
    setLoading(true)
    try {
      const payload = { ...form }
      if (!payload.vendor) delete payload.vendor
      if (linkedPO) delete payload.status
      if (isEdit) await api.put(`/indents/${id}`, payload)
      else await api.post('/indents', payload)
      toast.success(isEdit ? 'Indent updated!' : 'Indent created!')
      navigate('/indents')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save indent')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <LoadingSpinner />

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title={isEdit ? 'Edit Indent' : 'New Procurement Indent'}
        subtitle="Record a material requirement for production"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Indent Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Indent Date *</label>
              <input type="date" value={form.indentDate} onChange={set('indentDate')} className="input" required />
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={set('status')} className="input" disabled={!!linkedPO}>
                {INDENT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              {linkedPO && (
                <p className="text-xs text-gray-500 mt-1">Synced from the linked purchase order. Change it there.</p>
              )}
            </div>
            <div>
              <label className="label">Product Code</label>
              <input type="text" value={form.productCode} onChange={set('productCode')} className="input" placeholder="e.g. 14370, RM-001" />
            </div>
            <div className="sm:col-span-1">
              <label className="label">Product / RM Name *</label>
              <input type="text" value={form.productName} onChange={set('productName')} className="input" placeholder="e.g. Sodium Cocoyl Glycinate" required />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Product Description</label>
              <input type="text" value={form.productDescription} onChange={set('productDescription')} className="input" placeholder="Optional details" />
            </div>
          </div>
        </div>

        {/* Quantity */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Quantity Required</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Qty to Be Ordered</label>
              <input type="number" value={form.qtyToBeOrdered} onChange={set('qtyToBeOrdered')} className="input" placeholder="0" min="0" step="any" />
            </div>
            <div>
              <label className="label">Unit</label>
              <select value={form.unit} onChange={set('unit')} className="input">
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Vendor */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Vendor</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Select Vendor</label>
              <VendorSelector value={form.vendor} onChange={(v) => setForm(f => ({ ...f, vendor: v }))} />
            </div>
            <div>
              <label className="label">Vendor Name (Free Text)</label>
              <input type="text" value={form.vendorName} onChange={set('vendorName')} className="input" placeholder="Or type vendor name directly" />
            </div>
            <div>
              <label className="label">Contact No</label>
              <input type="text" value={form.contactNo} onChange={set('contactNo')} className="input" placeholder="Vendor contact number" />
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Remarks</h2>
          <div className="space-y-4">
            <div>
              <label className="label">CNS Remarks</label>
              <textarea value={form.cnsRemarks} onChange={set('cnsRemarks')} className="input" rows={3} placeholder="Notes, clarifications, vendor queries..." />
            </div>
            <div>
              <label className="label">Additional Notes</label>
              <textarea value={form.notes} onChange={set('notes')} className="input" rows={2} placeholder="Internal notes" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/indents')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : isEdit ? 'Update Indent' : 'Create Indent'}
          </button>
        </div>
      </form>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios'
import { PageHeader, LoadingSpinner } from '../components/UI'
import toast from 'react-hot-toast'

const EMPTY = { name: '', contactPerson: '', phone: '', email: '', address: '', notes: '', isActive: true }

export default function VendorForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    api.get(`/vendors/${id}`).then(r => {
      const d = r.data.data
      setForm({ name: d.name, contactPerson: d.contactPerson || '', phone: d.phone || '', email: d.email || '', address: d.address || '', notes: d.notes || '', isActive: d.isActive })
    }).catch(() => toast.error('Failed to load vendor')).finally(() => setFetching(false))
  }, [id, isEdit])

  const set = field => e => setForm(f => ({ ...f, [field]: field === 'isActive' ? e.target.checked : e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Vendor name is required'); return }
    setLoading(true)
    try {
      if (isEdit) await api.put(`/vendors/${id}`, form)
      else await api.post('/vendors', form)
      toast.success(isEdit ? 'Vendor updated!' : 'Vendor created!')
      navigate(isEdit ? `/vendors/${id}` : '/vendors')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save vendor')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <LoadingSpinner />

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title={isEdit ? 'Edit Vendor' : 'Add New Vendor'} />
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6 space-y-4">
          <div>
            <label className="label">Vendor / Company Name *</label>
            <input type="text" value={form.name} onChange={set('name')} className="input" placeholder="e.g. ATULYA CHEMICALS" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Contact Person</label>
              <input type="text" value={form.contactPerson} onChange={set('contactPerson')} className="input" placeholder="Name" />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input type="tel" value={form.phone} onChange={set('phone')} className="input" placeholder="+91 98765 43210" />
            </div>
          </div>
          <div>
            <label className="label">Email Address</label>
            <input type="email" value={form.email} onChange={set('email')} className="input" placeholder="vendor@company.com" />
          </div>
          <div>
            <label className="label">Address</label>
            <textarea value={form.address} onChange={set('address')} className="input" rows={2} placeholder="Office / warehouse address" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea value={form.notes} onChange={set('notes')} className="input" rows={2} placeholder="Any relevant notes about this vendor" />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={set('isActive')} className="w-4 h-4 accent-forest-600" />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active vendor</label>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/vendors')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : isEdit ? 'Update Vendor' : 'Add Vendor'}</button>
        </div>
      </form>
    </div>
  )
}

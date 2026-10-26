import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios'
import { PageHeader, LoadingSpinner } from '../components/UI'
import { INFLUENCER_PLATFORMS } from '../utils/helpers'
import toast from 'react-hot-toast'

const EMPTY = { name: '', handle: '', platform: 'Instagram', followers: '', phone: '', email: '', commissionRate: 5, notes: '', isActive: true }

export default function InfluencerForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    api.get(`/influencers/${id}`).then(r => {
      const d = r.data.data
      setForm({
        name: d.name, handle: d.handle || '', platform: d.platform || 'Instagram', followers: d.followers ?? '',
        phone: d.phone || '', email: d.email || '', commissionRate: d.commissionRate ?? 5, notes: d.notes || '', isActive: d.isActive,
      })
    }).catch(() => toast.error('Failed to load influencer')).finally(() => setFetching(false))
  }, [id, isEdit])

  const set = field => e => setForm(f => ({ ...f, [field]: field === 'isActive' ? e.target.checked : e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Influencer name is required'); return }
    const payload = { ...form, followers: form.followers === '' ? undefined : Number(form.followers), commissionRate: Number(form.commissionRate) }
    setLoading(true)
    try {
      if (isEdit) await api.put(`/influencers/${id}`, payload)
      else await api.post('/influencers', payload)
      toast.success(isEdit ? 'Influencer updated!' : 'Influencer created!')
      navigate(isEdit ? `/influencers/${id}` : '/influencers')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save influencer')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <LoadingSpinner />

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title={isEdit ? 'Edit Influencer' : 'Add New Influencer'} />
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6 space-y-4">
          <div>
            <label className="label">Name *</label>
            <input type="text" value={form.name} onChange={set('name')} className="input" placeholder="Full name" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Platform</label>
              <select value={form.platform} onChange={set('platform')} className="input">
                {INFLUENCER_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Handle / Channel</label>
              <input type="text" value={form.handle} onChange={set('handle')} className="input" placeholder="@handle" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Followers</label>
              <input type="number" min="0" value={form.followers} onChange={set('followers')} className="input" placeholder="e.g. 25000" />
            </div>
            <div>
              <label className="label">Commission on Orders (%)</label>
              <input type="number" min="0" max="100" step="0.01" value={form.commissionRate} onChange={set('commissionRate')} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Phone Number</label>
              <input type="tel" value={form.phone} onChange={set('phone')} className="input" placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input type="email" value={form.email} onChange={set('email')} className="input" placeholder="name@example.com" />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea value={form.notes} onChange={set('notes')} className="input" rows={2} placeholder="Bank / UPI details for refunds, niche, etc." />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={set('isActive')} className="w-4 h-4 accent-forest-600" />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active influencer</label>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/influencers')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : isEdit ? 'Update Influencer' : 'Add Influencer'}</button>
        </div>
      </form>
    </div>
  )
}

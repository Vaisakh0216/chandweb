import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, ChevronDown, Plus, X, Phone, Mail, Pencil } from 'lucide-react'
import api from '../api/axios'
import { Modal } from './UI'
import toast from 'react-hot-toast'

const EMPTY_VENDOR = { name: '', contactPerson: '', phone: '', email: '' }

// Create a vendor, or edit an existing vendor's contact details, without leaving the current form.
// Portalled to <body> because the selector usually sits inside the page's own <form>.
function VendorQuickModal(props) {
  return createPortal(<VendorQuickModalContent {...props} />, document.body)
}

function VendorQuickModalContent({ open, vendor, defaults, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_VENDOR)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(vendor)

  useEffect(() => {
    if (!open) return
    const src = vendor || defaults || {}
    setForm({ name: src.name || '', contactPerson: src.contactPerson || '', phone: src.phone || '', email: src.email || '' })
  }, [open, vendor, defaults])

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Vendor name is required'); return }
    setSaving(true)
    try {
      const res = isEdit
        ? await api.put(`/vendors/${vendor._id}`, form)
        : await api.post('/vendors', form)
      toast.success(isEdit ? 'Vendor contact updated' : 'Vendor created')
      onSaved(res.data.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save vendor')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} title={isEdit ? 'Edit Vendor Contact' : 'Create New Vendor'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Vendor / Company Name *</label>
          <input type="text" value={form.name} onChange={set('name')} className="input" placeholder="e.g. ATULYA CHEMICALS" required autoFocus={!isEdit} />
        </div>
        <div>
          <label className="label">Contact Person</label>
          <input type="text" value={form.contactPerson} onChange={set('contactPerson')} className="input" placeholder="Name" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Phone Number</label>
            <input type="tel" value={form.phone} onChange={set('phone')} className="input" placeholder="+91 98765 43210" autoFocus={isEdit} />
          </div>
          <div>
            <label className="label">Email Address</label>
            <input type="email" value={form.email} onChange={set('email')} className="input" placeholder="vendor@gmail.com" />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : isEdit ? 'Save Contact' : 'Create Vendor'}</button>
        </div>
      </form>
    </Modal>
  )
}

// onChange(vendorId, vendor) — vendor is the full record ({ name, phone, email, ... }) or null when cleared.
// createDefaults pre-fills the create form (e.g. a vendor name typed elsewhere on the form).
export default function VendorSelector({ value, onChange, createDefaults }) {
  const [search, setSearch] = useState('')
  const [vendors, setVendors] = useState([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [modal, setModal] = useState(null) // { vendor } to edit contact, { defaults } to create
  const ref = useRef(null)

  useEffect(() => {
    api.get('/vendors/dropdown').then(r => setVendors(r.data.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (value && vendors.length) {
      const v = vendors.find(v => v._id === value)
      if (v) setSelected(v)
    } else if (!value) {
      setSelected(null)
    }
  }, [value, vendors])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const term = search.trim().toLowerCase()
  const filtered = vendors.filter(v =>
    v.name.toLowerCase().includes(term) ||
    (v.contactPerson || '').toLowerCase().includes(term) ||
    (v.phone || '').toLowerCase().includes(term) ||
    (v.email || '').toLowerCase().includes(term)
  )
  const exactMatch = vendors.some(v => v.name.trim().toLowerCase() === term)

  const select = (vendor) => {
    setSelected(vendor)
    onChange(vendor._id, vendor)
    setOpen(false)
    setSearch('')
  }

  const clear = (e) => {
    e.stopPropagation()
    setSelected(null)
    onChange('', null)
  }

  const openCreate = () => {
    setOpen(false)
    setModal({ defaults: { ...createDefaults, ...(search.trim() ? { name: search.trim() } : {}) } })
  }

  const handleSaved = (vendor) => {
    setVendors(list => {
      const rest = list.filter(v => v._id !== vendor._id)
      return [...rest, vendor].sort((a, b) => a.name.localeCompare(b.name))
    })
    setModal(null)
    select(vendor)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input text-left flex items-center justify-between gap-2"
      >
        <span className={selected ? 'text-gray-800' : 'text-gray-400'}>
          {selected ? selected.name : 'Select vendor...'}
        </span>
        <div className="flex items-center gap-1">
          {selected && <X size={14} className="text-gray-400 hover:text-gray-600" onClick={clear} />}
          <ChevronDown size={15} className="text-gray-400" />
        </div>
      </button>

      {selected && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1"><Phone size={12} className="text-gray-400" />{selected.phone || <span className="text-gray-400">No phone</span>}</span>
          <span className="inline-flex items-center gap-1"><Mail size={12} className="text-gray-400" />{selected.email || <span className="text-gray-400">No email</span>}</span>
          <button type="button" onClick={() => setModal({ vendor: selected })} className="inline-flex items-center gap-1 text-forest-600 font-medium hover:underline">
            <Pencil size={11} /> {selected.phone && selected.email ? 'Edit contact' : 'Add contact'}
          </button>
        </div>
      )}

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-72 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, phone, email..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-forest-500"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-44">
            {filtered.map(v => (
              <button
                key={v._id}
                type="button"
                onClick={() => select(v)}
                className="w-full text-left px-3 py-2.5 hover:bg-forest-50 text-sm border-b border-gray-50 last:border-0"
              >
                <p className="font-medium text-gray-800">{v.name}</p>
                {(v.contactPerson || v.phone || v.email) && (
                  <p className="text-xs text-gray-500">{[v.contactPerson, v.phone, v.email].filter(Boolean).join(' • ')}</p>
                )}
              </button>
            ))}
            {filtered.length === 0 && <p className="text-sm text-gray-500 px-3 py-2">No vendors found</p>}
          </div>
          <div className="border-t border-gray-100 p-2">
            <button
              type="button"
              onClick={openCreate}
              disabled={exactMatch}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-forest-600 hover:bg-forest-50 rounded font-medium disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <Plus size={14} /> {search.trim() && !exactMatch ? `Create "${search.trim()}" as new vendor` : 'Create new vendor'}
            </button>
          </div>
        </div>
      )}

      <VendorQuickModal
        open={Boolean(modal)}
        vendor={modal?.vendor}
        defaults={modal?.defaults}
        onClose={() => setModal(null)}
        onSaved={handleSaved}
      />
    </div>
  )
}

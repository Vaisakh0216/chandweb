import { useState, useEffect, useRef } from 'react'
import { Search, ChevronDown, Plus, X } from 'lucide-react'
import api from '../api/axios'

export default function VendorSelector({ value, onChange, onCreateNew }) {
  const [search, setSearch] = useState('')
  const [vendors, setVendors] = useState([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
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

  const filtered = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.contactPerson || '').toLowerCase().includes(search.toLowerCase())
  )

  const select = (vendor) => {
    setSelected(vendor)
    onChange(vendor._id)
    setOpen(false)
    setSearch('')
  }

  const clear = (e) => {
    e.stopPropagation()
    setSelected(null)
    onChange('')
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

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search vendors..."
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
                {v.contactPerson && <p className="text-xs text-gray-500">{v.contactPerson} {v.phone && `• ${v.phone}`}</p>}
              </button>
            ))}
            {filtered.length === 0 && <p className="text-sm text-gray-500 px-3 py-2">No vendors found</p>}
          </div>
          {onCreateNew && (
            <div className="border-t border-gray-100 p-2">
              <button
                type="button"
                onClick={() => { setOpen(false); onCreateNew() }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-forest-600 hover:bg-forest-50 rounded font-medium"
              >
                <Plus size={14} /> Create new vendor
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Upload } from 'lucide-react'
import api from '../api/axios'
import { Modal } from './UI'
import { UNITS, formatDateInput } from '../utils/helpers'
import { mapPmstRows, readWorkbook } from '../utils/csv'
import toast from 'react-hot-toast'

const ACTIONS = {
  issue: {
    title: 'Use Stock', button: 'Use Stock', qtyLabel: 'Quantity Used *',
    refLabel: 'Used For', refPlaceholder: 'e.g. Batch no., product, production order',
  },
  receive: {
    title: 'Receive Stock', button: 'Add to Stock', qtyLabel: 'Quantity Received *',
    refLabel: 'Reference', refPlaceholder: 'e.g. Invoice no., PO ref, vendor',
  },
  adjust: {
    title: 'Physical Stock Count', button: 'Update Stock', qtyLabel: 'Counted Stock *',
  },
}

// Use / receive / physical count for one packing material
export function StockActionModal({ material, action, onClose, onDone }) {
  const [form, setForm] = useState({ quantity: '', date: formatDateInput(new Date()), reference: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (material) setForm({ quantity: '', date: formatDateInput(new Date()), reference: '', notes: '' })
  }, [material, action])

  if (!material || !action) return null
  const cfg = ACTIONS[action]
  const qty = parseFloat(form.quantity)
  const stock = material.availableStock
  const after = action === 'issue' ? stock - (qty || 0) : action === 'receive' ? stock + (qty || 0) : (qty >= 0 ? qty : stock)
  const notEnough = action === 'issue' && qty > stock

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (action === 'adjust' ? !(qty >= 0) : !(qty > 0)) { toast.error('Please enter a valid quantity'); return }
    if (notEnough) { toast.error(`Only ${stock} ${material.unit} available`); return }
    setSaving(true)
    try {
      const body = action === 'adjust'
        ? { countedStock: qty, notes: form.notes, date: form.date }
        : { quantity: qty, reference: form.reference, notes: form.notes, date: form.date }
      const res = await api.post(`/packing-materials/${material._id}/${action}`, body)
      toast.success(`Stock updated: ${res.data.data.availableStock} ${material.unit}`)
      onDone(res.data.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update stock')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={cfg.title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-lg bg-gray-50 text-sm">
          <p className="font-medium text-gray-800">{material.productName}</p>
          <p className="text-gray-500 text-xs mt-0.5">
            <span className="font-mono">{material.productCode}</span> · Available: <span className="font-semibold text-gray-700">{stock} {material.unit}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{cfg.qtyLabel}</label>
            <input type="number" value={form.quantity} onChange={set('quantity')} className="input" autoFocus
              min="0" step="any" max={action === 'issue' ? stock : undefined} required placeholder="0" />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" value={form.date} onChange={set('date')} className="input" />
          </div>
        </div>

        {cfg.refLabel && (
          <div>
            <label className="label">{cfg.refLabel}</label>
            <input type="text" value={form.reference} onChange={set('reference')} className="input" placeholder={cfg.refPlaceholder} />
          </div>
        )}
        <div>
          <label className="label">Notes</label>
          <textarea value={form.notes} onChange={set('notes')} className="input" rows={2} />
        </div>

        <p className={`text-sm ${notEnough ? 'text-red-600' : 'text-gray-600'}`}>
          {notEnough
            ? `Not enough stock. Only ${stock} ${material.unit} available.`
            : <>Stock after this: <span className="font-semibold">{+after.toFixed(3)} {material.unit}</span></>}
        </p>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving || notEnough} className="btn-primary disabled:opacity-50">
            {saving ? 'Saving...' : cfg.button}
          </button>
        </div>
      </form>
    </Modal>
  )
}

const EMPTY_MATERIAL = {
  productCode: '', productName: '', brand: '', department: '', materialClass: '',
  storeCode: '', storeName: '', unit: 'nos', mrp: '', reorderLevel: '', availableStock: '', notes: '',
}

// Add a new packing material, or edit an existing one's details
export function MaterialFormModal({ open, material, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_MATERIAL)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(material)

  useEffect(() => {
    if (!open) return
    setForm(material
      ? Object.fromEntries(Object.keys(EMPTY_MATERIAL).map(k => [k, material[k] ?? '']))
      : EMPTY_MATERIAL)
  }, [open, material])

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      for (const k of ['mrp', 'reorderLevel', 'availableStock']) if (payload[k] === '') delete payload[k]
      if (isEdit) delete payload.availableStock
      const res = isEdit
        ? await api.put(`/packing-materials/${material._id}`, payload)
        : await api.post('/packing-materials', payload)
      toast.success(isEdit ? 'Material updated' : 'Material added')
      onSaved(res.data.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title={isEdit ? 'Edit Packing Material' : 'Add Packing Material'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Product Code *</label>
            <input type="text" value={form.productCode} onChange={set('productCode')} className="input" required placeholder="e.g. 20001" />
          </div>
          <div>
            <label className="label">Brand / Supplier</label>
            <input type="text" value={form.brand} onChange={set('brand')} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Product Name *</label>
            <input type="text" value={form.productName} onChange={set('productName')} className="input" required />
          </div>
          <div>
            <label className="label">Department</label>
            <input type="text" value={form.department} onChange={set('department')} className="input" placeholder="e.g. BOTTLE, CAPS" />
          </div>
          <div>
            <label className="label">Class</label>
            <input type="text" value={form.materialClass} onChange={set('materialClass')} className="input" placeholder="e.g. GLASS, PET" />
          </div>
          {!isEdit && (
            <div>
              <label className="label">Opening Stock</label>
              <input type="number" value={form.availableStock} onChange={set('availableStock')} className="input" min="0" step="any" placeholder="0" />
            </div>
          )}
          <div>
            <label className="label">Unit</label>
            <select value={form.unit} onChange={set('unit')} className="input">
              {UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="label">MRP</label>
            <input type="number" value={form.mrp} onChange={set('mrp')} className="input" min="0" step="any" />
          </div>
          <div>
            <label className="label">Reorder Level</label>
            <input type="number" value={form.reorderLevel} onChange={set('reorderLevel')} className="input" min="0" step="any" placeholder="Alert when stock falls to this" />
          </div>
          <div>
            <label className="label">Store Code</label>
            <input type="text" value={form.storeCode} onChange={set('storeCode')} className="input" />
          </div>
          <div>
            <label className="label">Store Name</label>
            <input type="text" value={form.storeName} onChange={set('storeName')} className="input" />
          </div>
        </div>
        {isEdit && <p className="text-xs text-gray-500">To change stock, use the Use, Receive or Count actions so every change is recorded.</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Material'}</button>
        </div>
      </form>
    </Modal>
  )
}

// Upload the PMST sheet (Excel or CSV) to create or update materials in bulk
export function ImportModal({ open, onClose, onDone }) {
  const [sheets, setSheets] = useState(null) // [{ name, rows, missing }]
  const [sheetIndex, setSheetIndex] = useState(0)
  const [fileName, setFileName] = useState('')
  const [reading, setReading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const parsed = sheets?.[sheetIndex]

  useEffect(() => { if (open) { setSheets(null); setFileName(''); setResult(null) } }, [open])

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setFileName(file.name)
    setResult(null)
    setReading(true)
    try {
      const found = /\.csv$/i.test(file.name)
        ? [{ name: file.name, ...mapPmstRows(await file.text()) }]
        : await readWorkbook(await file.arrayBuffer())
      // Start on the first sheet that has the PMST columns
      const first = found.findIndex(s => s.missing.length === 0 && s.rows.length > 0)
      setSheets(found)
      setSheetIndex(first >= 0 ? first : 0)
    } catch {
      setSheets(null)
      toast.error('Could not read this file. Please choose an .xls, .xlsx or .csv file.')
    } finally {
      setReading(false)
    }
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      const res = await api.post('/packing-materials/import', { rows: parsed.rows })
      setResult(res.data.data)
      toast.success('Import complete')
      onDone()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const canImport = parsed && parsed.missing.length === 0 && parsed.rows.length > 0 && !result

  return (
    <Modal open={open} title="Import from PMST Sheet" onClose={onClose} size="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Choose the PMST stock file as Excel (.xls / .xlsx) or CSV. From Google Sheets use <span className="font-medium">File → Download → Microsoft Excel (.xlsx)</span>.
          Items are matched by <span className="font-medium">Product Code</span>: new codes are added, existing ones are updated,
          and any stock difference is recorded as an adjustment.
        </p>

        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-forest-400 transition-colors">
          <Upload size={22} className="text-gray-400" />
          <span className="text-sm text-gray-600">{reading ? 'Reading file...' : fileName || 'Choose an .xls, .xlsx or .csv file'}</span>
          <input type="file" onChange={handleFile} className="hidden"
            accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" />
        </label>

        {sheets?.length > 1 && !result && (
          <div>
            <label className="label">Sheet</label>
            <select value={sheetIndex} onChange={e => setSheetIndex(Number(e.target.value))} className="input">
              {sheets.map((s, i) => (
                <option key={s.name} value={i}>{s.name}{s.missing.length ? ' (no PMST columns)' : ` (${s.rows.length} rows)`}</option>
              ))}
            </select>
          </div>
        )}

        {parsed && parsed.missing.length > 0 && (
          <p className="text-sm text-red-600">Missing column(s): {parsed.missing.join(', ')}. Check that the first row has the sheet headers.</p>
        )}

        {parsed && parsed.missing.length === 0 && !result && (
          <div className="text-sm">
            <p className="text-gray-700 mb-2">{parsed.rows.length} rows found. Preview:</p>
            <div className="table-container border border-gray-100 rounded-lg">
              <table className="w-full">
                <thead><tr>
                  <th className="table-th">Code</th><th className="table-th">Product Name</th><th className="table-th">Stock</th><th className="table-th">Dept / Class</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {parsed.rows.slice(0, 5).map(r => (
                    <tr key={r.rowNumber}>
                      <td className="table-td font-mono text-xs">{r.productCode}</td>
                      <td className="table-td">{r.productName}</td>
                      <td className="table-td">{r.availableStock}</td>
                      <td className="table-td text-gray-500">{[r.department, r.materialClass].filter(Boolean).join(' / ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result && (
          <div className="p-3 rounded-lg bg-forest-50 border border-forest-200 text-sm text-forest-800 space-y-1">
            <p>{result.created} added · {result.updated} updated · {result.stockAdjusted} stock changes recorded</p>
            {result.errors.length > 0 && (
              <div className="text-red-700">
                <p className="font-medium">{result.errors.length} row(s) skipped:</p>
                <ul className="list-disc pl-5 max-h-40 overflow-y-auto">
                  {result.errors.map(e => <li key={e.row}>Row {e.row}{e.productCode ? ` (${e.productCode})` : ''}: {e.message}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">{result ? 'Close' : 'Cancel'}</button>
          {!result && (
            <button onClick={handleImport} disabled={!canImport || importing} className="btn-primary disabled:opacity-50">
              {importing ? 'Importing...' : `Import ${parsed?.rows.length || ''} rows`}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { Modal } from './UI'
import { PACKING_UNITS, formatDateInput, formatCount } from '../utils/helpers'
import toast from 'react-hot-toast'

const today = () => formatDateInput(new Date())

const isCount = (v) => v !== '' && Number.isInteger(Number(v)) && Number(v) >= 0

function BatchInfo({ batch, children }) {
  return (
    <div className="p-3 rounded-lg bg-gray-50 text-sm">
      <p className="font-medium text-gray-800">{batch.productName}</p>
      <p className="text-gray-500 text-xs mt-0.5"><span className="font-mono">{batch.batchNo}</span> · {children}</p>
    </div>
  )
}

// New batch from production (no `batch`), or more units into an existing batch
export function ReceiveModal({ open, batch, onClose, onDone }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm({ productCode: '', productName: '', unit: 'nos', productionBatchNo: '', batchNo: '', quantity: '', date: today(), reference: '', notes: '' })
  }, [open])

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!batch && !form.productName.trim()) { toast.error('Product name is required'); return }
    if (!isCount(form.quantity) || Number(form.quantity) === 0) { toast.error('Enter a whole number of units above 0'); return }
    setSaving(true)
    try {
      const res = batch
        ? await api.post(`/packing-batches/${batch._id}/receive`, { quantity: Number(form.quantity), date: form.date, reference: form.reference, notes: form.notes })
        : await api.post('/packing-batches', { ...form, quantity: Number(form.quantity) })
      toast.success(batch ? `Received ${form.quantity} more ${batch.unit}` : `Batch ${res.data.data.batchNo} received`)
      onDone(res.data.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record receipt')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} title={batch ? 'Receive More from Production' : 'Receive from Production'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {batch ? (
          <BatchInfo batch={batch}>Received so far: <span className="font-semibold text-gray-700">{formatCount(batch.receivedQty)} {batch.unit}</span></BatchInfo>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Product Code</label>
                <input type="text" value={form.productCode || ''} onChange={set('productCode')} className="input" />
              </div>
              <div className="col-span-2">
                <label className="label">Product Name *</label>
                <input type="text" value={form.productName || ''} onChange={set('productName')} className="input" placeholder="e.g. Face Wash 100ml" required autoFocus />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Production Batch / Lot No</label>
                <input type="text" value={form.productionBatchNo || ''} onChange={set('productionBatchNo')} className="input" />
              </div>
              <div>
                <label className="label">Packing Batch No</label>
                <input type="text" value={form.batchNo || ''} onChange={set('batchNo')} className="input" placeholder="Auto (PB-YYYYMMDD-001)" />
              </div>
            </div>
          </>
        )}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Units Received *</label>
            <input type="number" min="1" step="1" value={form.quantity || ''} onChange={set('quantity')} className="input" required autoFocus={Boolean(batch)} />
          </div>
          {!batch && (
            <div>
              <label className="label">Unit</label>
              <select value={form.unit || 'nos'} onChange={set('unit')} className="input">
                {PACKING_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}
          <div className={batch ? 'col-span-2' : ''}>
            <label className="label">Date</label>
            <input type="date" value={form.date || ''} onChange={set('date')} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Reference</label>
          <input type="text" value={form.reference || ''} onChange={set('reference')} className="input" placeholder="Production slip / handover note" />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea value={form.notes || ''} onChange={set('notes')} className="input" rows={2} />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Receive'}</button>
        </div>
      </form>
    </Modal>
  )
}

// An employee's packed / rejected count against a batch
export function PackModal({ batch, onClose, onDone }) {
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!batch) return
    setForm({ employee: '', packedQty: '', rejectedQty: '', date: today(), notes: '' })
    api.get('/employees/dropdown').then(r => setEmployees(r.data.data)).catch(() => toast.error('Failed to load employees'))
  }, [batch])

  if (!batch) return null
  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))
  const packed = Number(form.packedQty || 0)
  const rejected = Number(form.rejectedQty || 0)
  const remaining = batch.pendingPackingQty - packed - rejected

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.employee) { toast.error('Select the employee who packed'); return }
    if (![form.packedQty || '0', form.rejectedQty || '0'].every(isCount)) { toast.error('Counts must be whole numbers'); return }
    if (packed + rejected === 0) { toast.error('Enter the packed or rejected count'); return }
    if (remaining < 0) { toast.error(`Only ${batch.pendingPackingQty} ${batch.unit} left to pack`); return }
    setSaving(true)
    try {
      const res = await api.post(`/packing-batches/${batch._id}/pack`, { ...form, packedQty: packed, rejectedQty: rejected })
      toast.success(`Recorded ${packed} packed${rejected ? `, ${rejected} rejected` : ''}`)
      onDone(res.data.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record packing')
    } finally { setSaving(false) }
  }

  return (
    <Modal open title="Record Packing" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <BatchInfo batch={batch}>Left to pack: <span className="font-semibold text-gray-700">{formatCount(batch.pendingPackingQty)} {batch.unit}</span></BatchInfo>
        <div>
          <label className="label">Packed By *</label>
          <select value={form.employee || ''} onChange={set('employee')} className="input" required>
            <option value="">Select employee...</option>
            {employees.map(e => <option key={e._id} value={e._id}>{e.name}{e.employeeCode ? ` (${e.employeeCode})` : ''}</option>)}
          </select>
          {employees.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">No active employees. <Link to="/employees" className="text-forest-600 font-medium hover:underline">Add employees</Link></p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Packed (good)</label>
            <input type="number" min="0" step="1" value={form.packedQty || ''} onChange={set('packedQty')} className="input" placeholder="0" autoFocus />
          </div>
          <div>
            <label className="label">Rejected / Damaged</label>
            <input type="number" min="0" step="1" value={form.rejectedQty || ''} onChange={set('rejectedQty')} className="input" placeholder="0" />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" value={form.date || ''} onChange={set('date')} className="input" />
          </div>
        </div>
        <p className={`text-sm ${remaining < 0 ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
          {remaining < 0
            ? `That's ${-remaining} more than is left in this batch`
            : <>Left to pack after this: <span className="font-semibold">{formatCount(remaining)} {batch.unit}</span></>}
        </p>
        <div>
          <label className="label">Notes</label>
          <textarea value={form.notes || ''} onChange={set('notes')} className="input" rows={2} placeholder="Shift, reason for rejects..." />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving || remaining < 0} className="btn-primary">{saving ? 'Saving...' : 'Record'}</button>
        </div>
      </form>
    </Modal>
  )
}

// Packed units handed over to the warehouse
export function TransferModal({ batch, onClose, onDone }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (batch) setForm({ quantity: batch.inHandQty || '', warehouse: 'Main Warehouse', reference: '', receivedBy: '', date: today(), notes: '' })
  }, [batch])

  if (!batch) return null
  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))
  const qty = Number(form.quantity || 0)
  const tooMany = qty > batch.inHandQty

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isCount(form.quantity) || qty === 0) { toast.error('Enter a whole number of units above 0'); return }
    if (tooMany) { toast.error(`Only ${batch.inHandQty} packed ${batch.unit} available`); return }
    if (!form.warehouse.trim()) { toast.error('Warehouse is required'); return }
    setSaving(true)
    try {
      const res = await api.post(`/packing-batches/${batch._id}/transfer`, { ...form, quantity: qty })
      toast.success(`Transferred ${qty} ${batch.unit} to ${form.warehouse}`)
      onDone(res.data.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record transfer')
    } finally { setSaving(false) }
  }

  return (
    <Modal open title="Transfer to Warehouse" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <BatchInfo batch={batch}>Packed, not yet transferred: <span className="font-semibold text-gray-700">{formatCount(batch.inHandQty)} {batch.unit}</span></BatchInfo>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Units Transferred *</label>
            <input type="number" min="1" max={batch.inHandQty} step="1" value={form.quantity} onChange={set('quantity')} className="input" required autoFocus />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" value={form.date || ''} onChange={set('date')} className="input" />
          </div>
        </div>
        {tooMany && <p className="text-sm text-red-600 font-medium">Only {batch.inHandQty} packed {batch.unit} are available</p>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Warehouse *</label>
            <input type="text" value={form.warehouse || ''} onChange={set('warehouse')} className="input" required />
          </div>
          <div>
            <label className="label">Received By</label>
            <input type="text" value={form.receivedBy || ''} onChange={set('receivedBy')} className="input" placeholder="Warehouse staff" />
          </div>
        </div>
        <div>
          <label className="label">Transfer Note / Reference</label>
          <input type="text" value={form.reference || ''} onChange={set('reference')} className="input" />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea value={form.notes || ''} onChange={set('notes')} className="input" rows={2} />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving || tooMany} className="btn-primary">{saving ? 'Saving...' : 'Transfer'}</button>
        </div>
      </form>
    </Modal>
  )
}

const EMPTY_EMPLOYEE = { name: '', employeeCode: '', designation: 'Packer', phone: '', joinedDate: '', notes: '', isActive: true }

// Add / edit an employee
export function EmployeeModal({ open, employee, onClose, onDone }) {
  const [form, setForm] = useState(EMPTY_EMPLOYEE)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(employee ? {
      name: employee.name, employeeCode: employee.employeeCode || '', designation: employee.designation || '',
      phone: employee.phone || '', joinedDate: formatDateInput(employee.joinedDate), notes: employee.notes || '', isActive: employee.isActive,
    } : EMPTY_EMPLOYEE)
  }, [open, employee])

  const set = field => e => setForm(f => ({ ...f, [field]: field === 'isActive' ? e.target.checked : e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Employee name is required'); return }
    setSaving(true)
    try {
      const res = employee
        ? await api.put(`/employees/${employee._id}`, form)
        : await api.post('/employees', form)
      toast.success(employee ? 'Employee updated' : 'Employee added')
      onDone(res.data.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save employee')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} title={employee ? 'Edit Employee' : 'Add Employee'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="label">Name *</label>
            <input type="text" value={form.name} onChange={set('name')} className="input" required autoFocus />
          </div>
          <div>
            <label className="label">Employee Code</label>
            <input type="text" value={form.employeeCode} onChange={set('employeeCode')} className="input" placeholder="E001" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Designation</label>
            <input type="text" value={form.designation} onChange={set('designation')} className="input" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input type="tel" value={form.phone} onChange={set('phone')} className="input" />
          </div>
          <div>
            <label className="label">Joined On</label>
            <input type="date" value={form.joinedDate} onChange={set('joinedDate')} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea value={form.notes} onChange={set('notes')} className="input" rows={2} />
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="employeeActive" checked={form.isActive} onChange={set('isActive')} className="w-4 h-4 accent-forest-600" />
          <label htmlFor="employeeActive" className="text-sm font-medium text-gray-700">Active (can be selected for packing)</label>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : employee ? 'Update' : 'Add Employee'}</button>
        </div>
      </form>
    </Modal>
  )
}

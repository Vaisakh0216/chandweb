import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, X } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/UI'
import { EmployeeModal } from '../components/PackingFlowModals'
import { formatDate, formatDateInput, formatCount } from '../utils/helpers'
import toast from 'react-hot-toast'

const PRESETS = {
  today: () => { const d = formatDateInput(new Date()); return { from: d, to: d } },
  month: () => { const n = new Date(); return { from: formatDateInput(new Date(n.getFullYear(), n.getMonth(), 1, 12)), to: formatDateInput(n) } },
  all: () => ({ from: '', to: '' }),
}

export default function EmployeeList() {
  const { user } = useAuth()
  const canEdit = user?.role === 'admin' || user?.role === 'manager'
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isActive, setIsActive] = useState('true')
  const [period, setPeriod] = useState(PRESETS.month)
  const [modal, setModal] = useState(null) // { employee } — employee null to add

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const params = { isActive }
      if (search) params.search = search
      if (period.from) params.from = period.from
      if (period.to) params.to = period.to
      const res = await api.get('/employees', { params })
      setEmployees(res.data.data)
    } catch { toast.error('Failed to load employees') }
    finally { setLoading(false) }
  }, [search, isActive, period])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  const totals = employees.reduce((t, e) => ({ packed: t.packed + e.packing.packed, rejected: t.rejected + e.packing.rejected }), { packed: 0, rejected: 0 })
  const activePreset = Object.keys(PRESETS).find(k => { const p = PRESETS[k](); return p.from === period.from && p.to === period.to })

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Packing staff and how much each has packed"
        actions={canEdit && <button onClick={() => setModal({ employee: null })} className="btn-primary"><Plus size={15} /> Add Employee</button>}
      />

      <div className="card p-4 mb-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, code, phone..." className="input pl-9" />
          </div>
          <select value={isActive} onChange={e => setIsActive(e.target.value)} className="input w-auto">
            <option value="true">Active</option>
            <option value="false">Inactive</option>
            <option value="">All</option>
          </select>
          {search && <button onClick={() => setSearch('')} className="btn-ghost text-red-500"><X size={14} /> Clear</button>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600 mr-1">Packing counts for:</span>
          {[['today', 'Today'], ['month', 'This Month'], ['all', 'All Time']].map(([k, label]) => (
            <button key={k} onClick={() => setPeriod(PRESETS[k]())} className={activePreset === k ? 'btn-primary py-1.5' : 'btn-secondary py-1.5'}>{label}</button>
          ))}
          <input type="date" value={period.from} onChange={e => setPeriod(p => ({ ...p, from: e.target.value }))} className="input w-auto" aria-label="From date" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={period.to} onChange={e => setPeriod(p => ({ ...p, to: e.target.value }))} className="input w-auto" aria-label="To date" />
        </div>
      </div>

      <div className="card">
        {loading ? <LoadingSpinner /> : employees.length === 0 ? (
          <EmptyState title="No employees found" description="Add the staff who pack products"
            action={canEdit && <button onClick={() => setModal({ employee: null })} className="btn-primary">Add Employee</button>} />
        ) : (
          <div className="table-container">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Employee</th>
                  <th className="table-th">Designation</th>
                  <th className="table-th">Phone</th>
                  <th className="table-th">Packed</th>
                  <th className="table-th">Rejected</th>
                  <th className="table-th">Reject %</th>
                  <th className="table-th">Batches</th>
                  <th className="table-th">Last Packed</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map(e => {
                  const handled = e.packing.packed + e.packing.rejected
                  return (
                    <tr key={e._id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-td">
                        <Link to={`/employees/${e._id}`} className="font-semibold text-forest-700 hover:underline">{e.name}</Link>
                        {e.employeeCode && <span className="block font-mono text-xs text-gray-400">{e.employeeCode}</span>}
                        {!e.isActive && <span className="badge status-cancelled text-xs mt-0.5">Inactive</span>}
                      </td>
                      <td className="table-td text-gray-600">{e.designation || '—'}</td>
                      <td className="table-td text-gray-600">{e.phone || '—'}</td>
                      <td className="table-td font-semibold text-forest-700">{formatCount(e.packing.packed)}</td>
                      <td className="table-td text-red-600">{e.packing.rejected ? formatCount(e.packing.rejected) : '—'}</td>
                      <td className="table-td text-gray-600">{handled ? `${((e.packing.rejected / handled) * 100).toFixed(1)}%` : '—'}</td>
                      <td className="table-td text-gray-600">{e.packing.batches}</td>
                      <td className="table-td text-gray-500">{formatDate(e.packing.lastPackedOn)}</td>
                      <td className="table-td">
                        {canEdit && <button onClick={() => setModal({ employee: e })} className="text-forest-600 text-xs font-medium hover:underline">Edit</button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td className="table-td" colSpan={3}>Total ({employees.length} employees)</td>
                  <td className="table-td text-forest-700">{formatCount(totals.packed)}</td>
                  <td className="table-td text-red-600">{formatCount(totals.rejected)}</td>
                  <td className="table-td" colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <EmployeeModal
        open={Boolean(modal)}
        employee={modal?.employee}
        onClose={() => setModal(null)}
        onDone={() => { setModal(null); fetchEmployees() }}
      />
    </div>
  )
}

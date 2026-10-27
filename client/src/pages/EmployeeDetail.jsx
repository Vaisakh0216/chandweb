import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, PackageCheck, PackageX, Layers, X } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { LoadingSpinner, ConfirmDialog, Pagination, SummaryCard } from '../components/UI'
import { EmployeeModal } from '../components/PackingFlowModals'
import { formatDate, formatCount } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function EmployeeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canEdit = user?.role === 'admin' || user?.role === 'manager'
  const [employee, setEmployee] = useState(null)
  const [entries, setEntries] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [period, setPeriod] = useState({ from: '', to: '' })
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const params = useCallback(() => {
    const p = {}
    if (period.from) p.from = period.from
    if (period.to) p.to = period.to
    return p
  }, [period])

  const fetchEmployee = useCallback(() =>
    api.get(`/employees/${id}`, { params: params() }).then(r => setEmployee(r.data.data)).catch(() => toast.error('Failed to load employee'))
  , [id, params])

  useEffect(() => { fetchEmployee().finally(() => setLoading(false)) }, [fetchEmployee])

  useEffect(() => {
    api.get(`/employees/${id}/entries`, { params: { ...params(), page } })
      .then(r => { setEntries(r.data.data); setPagination(r.data.pagination) })
      .catch(() => toast.error('Failed to load entries'))
  }, [id, params, page])

  const handleDelete = async () => {
    try {
      await api.delete(`/employees/${id}`)
      toast.success('Employee deleted')
      navigate('/employees')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete employee')
      setConfirmDelete(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (!employee) return <div className="text-center py-16 text-gray-400">Employee not found</div>

  const t = employee.packing
  const handled = t.packed + t.rejected
  const best = employee.daily.reduce((m, d) => Math.max(m, d.packed), 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/employees" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <h1 className="page-title flex-1 truncate">{employee.name}</h1>
        <span className={`badge ${employee.isActive ? 'status-received' : 'status-cancelled'}`}>{employee.isActive ? 'Active' : 'Inactive'}</span>
        {canEdit && <button onClick={() => setEditing(true)} className="btn-secondary"><Edit size={14} /> Edit</button>}
        {user?.role === 'admin' && <button onClick={() => setConfirmDelete(true)} className="btn-danger"><Trash2 size={14} /></button>}
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div><p className="label">Employee Code</p><p className="text-sm text-gray-800 font-mono">{employee.employeeCode || '—'}</p></div>
          <div><p className="label">Designation</p><p className="text-sm text-gray-800">{employee.designation || '—'}</p></div>
          <div><p className="label">Phone</p><p className="text-sm text-gray-800">{employee.phone || '—'}</p></div>
          <div><p className="label">Joined</p><p className="text-sm text-gray-800">{formatDate(employee.joinedDate)}</p></div>
          {employee.notes && <div className="col-span-2 sm:col-span-4"><p className="label">Notes</p><p className="text-sm text-gray-700 whitespace-pre-line">{employee.notes}</p></div>}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-600 flex-1">Packing {period.from || period.to ? 'in period' : '(all time)'}</span>
        <input type="date" value={period.from} onChange={e => { setPeriod(p => ({ ...p, from: e.target.value })); setPage(1) }} className="input w-auto" aria-label="From date" />
        <span className="text-gray-400 text-sm">to</span>
        <input type="date" value={period.to} onChange={e => { setPeriod(p => ({ ...p, to: e.target.value })); setPage(1) }} className="input w-auto" aria-label="To date" />
        {(period.from || period.to) && <button onClick={() => { setPeriod({ from: '', to: '' }); setPage(1) }} className="btn-ghost text-red-500"><X size={14} /> All time</button>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard title="Packed" value={formatCount(t.packed)} subtitle={`${t.entries} entries · best day ${formatCount(best)}`} icon={PackageCheck} color="forest" />
        <SummaryCard title="Rejected" value={formatCount(t.rejected)} subtitle={handled ? `${((t.rejected / handled) * 100).toFixed(1)}% of handled` : 'No packing yet'} icon={PackageX} color="red" />
        <SummaryCard title="Batches" value={t.batches} subtitle={`Last packed ${formatDate(t.lastPackedOn)}`} icon={Layers} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Day-wise */}
        <div className="card lg:col-span-2">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Day-wise Count</h2>
          </div>
          {employee.daily.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No packing in this period</p>
          ) : (
            <div className="table-container max-h-[420px] overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Date</th>
                    <th className="table-th">Packed</th>
                    <th className="table-th">Rejected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {employee.daily.map(d => (
                    <tr key={d.date}>
                      <td className="table-td text-gray-600">{formatDate(d.date)}</td>
                      <td className="table-td font-semibold text-forest-700">{formatCount(d.packed)}</td>
                      <td className="table-td text-red-600">{d.rejected ? formatCount(d.rejected) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Entries */}
        <div className="card lg:col-span-3">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Packing Entries</h2>
          </div>
          {entries.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No entries</p>
          ) : (
            <>
              <div className="table-container">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-th">Date</th>
                      <th className="table-th">Batch</th>
                      <th className="table-th">Packed</th>
                      <th className="table-th">Rejected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {entries.map(e => (
                      <tr key={e._id} className="hover:bg-gray-50">
                        <td className="table-td text-gray-500">{formatDate(e.date)}</td>
                        <td className="table-td">
                          {e.batch ? (
                            <>
                              <Link to={`/packing-batches/${e.batch._id}`} className="font-mono text-xs font-semibold text-forest-700 hover:underline">{e.batch.batchNo}</Link>
                              <span className="block text-xs text-gray-500 truncate max-w-[180px]">{e.batch.productName}</span>
                            </>
                          ) : '—'}
                        </td>
                        <td className="table-td font-semibold">{formatCount(e.quantity)} <span className="text-xs text-gray-400 font-normal">{e.batch?.unit}</span></td>
                        <td className="table-td text-red-600">{e.rejectedQty ? formatCount(e.rejectedQty) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={pagination} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>

      <EmployeeModal
        open={editing}
        employee={employee}
        onClose={() => setEditing(false)}
        onDone={() => { setEditing(false); fetchEmployee() }}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete Employee"
        message={`Delete "${employee.name}"? Blocked if they have packing entries — deactivate instead.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

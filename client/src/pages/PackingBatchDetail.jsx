import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Trash2, Factory, PackageCheck, Warehouse, Plus, ChevronRight } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { LoadingSpinner, ConfirmDialog } from '../components/UI'
import StatusBadge from '../components/StatusBadge'
import { ReceiveModal, PackModal, TransferModal } from '../components/PackingFlowModals'
import { PackingProgress } from './PackingBatchList'
import { formatDate, formatCount } from '../utils/helpers'
import toast from 'react-hot-toast'

const MOVEMENT_STYLE = {
  Received: { label: 'From Production', className: 'status-ordered' },
  Packed: { label: 'Packed', className: 'status-received' },
  Transferred: { label: 'To Warehouse', className: 'status-partial' },
}

function Stage({ label, value, unit, sub, tone }) {
  return (
    <div className="flex-1 min-w-[120px] p-4 rounded-lg bg-gray-50">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${tone}`}>{formatCount(value)} <span className="text-sm font-normal text-gray-400">{unit}</span></p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

export default function PackingBatchDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canEdit = user?.role === 'admin' || user?.role === 'manager'
  const isAdmin = user?.role === 'admin'
  const [batch, setBatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // 'receive' | 'pack' | 'transfer'
  const [confirm, setConfirm] = useState(null) // { kind: 'batch' } | { kind: 'movement', movement }

  const fetchBatch = useCallback(() =>
    api.get(`/packing-batches/${id}`).then(r => setBatch(r.data.data)).catch(() => toast.error('Failed to load batch'))
  , [id])

  useEffect(() => { fetchBatch().finally(() => setLoading(false)) }, [fetchBatch])

  const done = () => { setModal(null); fetchBatch() }

  const handleConfirm = async () => {
    try {
      if (confirm.kind === 'batch') {
        await api.delete(`/packing-batches/${id}`)
        toast.success('Batch deleted')
        navigate('/packing-batches')
        return
      }
      await api.delete(`/packing-batches/movements/${confirm.movement._id}`)
      toast.success('Entry removed and counts reversed')
      fetchBatch()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    }
    setConfirm(null)
  }

  if (loading) return <LoadingSpinner />
  if (!batch) return <div className="text-center py-16 text-gray-400">Batch not found</div>

  const u = batch.unit

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/packing-batches" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="page-title truncate">{batch.productName}</h1>
          <p className="text-sm text-gray-500">
            <span className="font-mono">{batch.batchNo}</span>
            {batch.productCode && <> · <span className="font-mono">{batch.productCode}</span></>}
            {batch.productionBatchNo && <> · Production lot {batch.productionBatchNo}</>}
          </p>
        </div>
        <StatusBadge status={batch.status} size="md" />
        {isAdmin && <button onClick={() => setConfirm({ kind: 'batch' })} className="btn-danger"><Trash2 size={14} /></button>}
      </div>

      {/* Count pipeline */}
      <div className="card p-5 space-y-4">
        <div className="flex items-stretch gap-2 flex-wrap">
          <Stage label="From Production" value={batch.receivedQty} unit={u} sub={`First received ${formatDate(batch.receivedDate)}`} tone="text-blue-700" />
          <ChevronRight className="self-center text-gray-300 hidden sm:block" />
          <Stage label="Packed" value={batch.packedQty} unit={u} sub={batch.rejectedQty ? `+ ${formatCount(batch.rejectedQty)} rejected` : 'No rejects'} tone="text-forest-700" />
          <ChevronRight className="self-center text-gray-300 hidden sm:block" />
          <Stage label="In Warehouse" value={batch.transferredQty} unit={u} tone="text-purple-700" />
        </div>
        <PackingProgress batch={batch} />
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span>Left to pack: <span className={`font-semibold ${batch.pendingPackingQty ? 'text-amber-700' : 'text-gray-500'}`}>{formatCount(batch.pendingPackingQty)} {u}</span></span>
          <span>Packed, awaiting transfer: <span className={`font-semibold ${batch.inHandQty ? 'text-purple-700' : 'text-gray-500'}`}>{formatCount(batch.inHandQty)} {u}</span></span>
          <span className="text-gray-500">Check: {formatCount(batch.packedQty)} + {formatCount(batch.rejectedQty)} + {formatCount(batch.pendingPackingQty)} = {formatCount(batch.receivedQty)} received</span>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <button onClick={() => setModal('pack')} disabled={!batch.pendingPackingQty} className="btn-primary disabled:opacity-40"><PackageCheck size={14} /> Record Packing</button>
            <button onClick={() => setModal('transfer')} disabled={!batch.inHandQty} className="btn-secondary disabled:opacity-40"><Warehouse size={14} /> Transfer to Warehouse</button>
            <button onClick={() => setModal('receive')} className="btn-ghost"><Plus size={14} /> Receive More</button>
          </div>
        )}
      </div>

      {/* Per-employee */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Packed By</h2>
        </div>
        {batch.packers.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No packing recorded yet</p>
        ) : (
          <div className="table-container">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Employee</th>
                  <th className="table-th">Packed</th>
                  <th className="table-th">Rejected</th>
                  <th className="table-th">Entries</th>
                  <th className="table-th">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {batch.packers.map(p => (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="table-td"><Link to={`/employees/${p._id}`} className="font-medium text-forest-700 hover:underline">{p.name}</Link></td>
                    <td className="table-td font-semibold">{formatCount(p.packed)} <span className="text-xs text-gray-400 font-normal">{u}</span></td>
                    <td className="table-td text-red-600">{p.rejected ? formatCount(p.rejected) : '—'}</td>
                    <td className="table-td text-gray-600">{p.entries}</td>
                    <td className="table-td text-gray-600">{batch.packedQty ? `${((p.packed / batch.packedQty) * 100).toFixed(0)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Movement log */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">History</h2>
          <p className="text-xs text-gray-500">Every count change on this batch{isAdmin ? ' — removing an entry reverses its count' : ''}</p>
        </div>
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Step</th>
                <th className="table-th">Count</th>
                <th className="table-th">Details</th>
                <th className="table-th">Recorded By</th>
                {isAdmin && <th className="table-th"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {batch.movements.map(m => (
                <tr key={m._id} className="hover:bg-gray-50">
                  <td className="table-td text-gray-500">{formatDate(m.date)}</td>
                  <td className="table-td"><span className={`badge ${MOVEMENT_STYLE[m.type].className} text-xs`}>{MOVEMENT_STYLE[m.type].label}</span></td>
                  <td className="table-td font-semibold">
                    {formatCount(m.quantity)} {u}
                    {m.rejectedQty > 0 && <span className="block text-xs font-normal text-red-600">+ {formatCount(m.rejectedQty)} rejected</span>}
                  </td>
                  <td className="table-td text-gray-600 text-sm">
                    {m.type === 'Packed' && (m.employee
                      ? <Link to={`/employees/${m.employee._id}`} className="text-forest-700 hover:underline">{m.employee.name}</Link>
                      : m.employeeName)}
                    {m.type === 'Transferred' && <>{m.warehouse}{m.receivedBy && ` · received by ${m.receivedBy}`}</>}
                    {m.reference && <span className="block text-xs text-gray-400 font-mono">{m.reference}</span>}
                    {m.notes && <span className="block text-xs text-gray-400">{m.notes}</span>}
                  </td>
                  <td className="table-td text-gray-500 text-xs">{m.userName || '—'}</td>
                  {isAdmin && (
                    <td className="table-td">
                      <button onClick={() => setConfirm({ kind: 'movement', movement: m })} className="btn-ghost px-2 text-red-500" title="Remove entry"><Trash2 size={14} /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ReceiveModal open={modal === 'receive'} batch={batch} onClose={() => setModal(null)} onDone={done} />
      <PackModal batch={modal === 'pack' ? batch : null} onClose={() => setModal(null)} onDone={done} />
      <TransferModal batch={modal === 'transfer' ? batch : null} onClose={() => setModal(null)} onDone={done} />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.kind === 'batch' ? 'Delete Batch' : 'Remove Entry'}
        message={confirm?.kind === 'batch'
          ? `Delete batch ${batch.batchNo}? Only possible before any packing is recorded.`
          : confirm && `Remove this ${MOVEMENT_STYLE[confirm.movement.type].label.toLowerCase()} entry of ${confirm.movement.quantity} ${u}? The batch counts will be reversed. Blocked if later steps depend on it.`}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
        confirmText={confirm?.kind === 'batch' ? 'Delete' : 'Remove'}
      />
    </div>
  )
}

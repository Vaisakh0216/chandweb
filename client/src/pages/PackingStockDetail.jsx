import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, MinusCircle, PlusCircle, ClipboardCheck } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { LoadingSpinner, ConfirmDialog, EmptyState } from '../components/UI'
import { StockActionModal, MaterialFormModal } from '../components/PackingStockModals'
import { StockLevel } from './PackingStockList'
import { formatDate, formatCurrency } from '../utils/helpers'
import toast from 'react-hot-toast'

const MOVEMENT_STYLES = {
  Issue: 'bg-orange-50 text-orange-700',
  Receive: 'bg-green-50 text-green-700',
  Adjustment: 'bg-blue-50 text-blue-700',
  Opening: 'bg-gray-100 text-gray-700',
}

export default function PackingStockDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canEdit = user?.role === 'admin' || user?.role === 'manager'
  const [material, setMaterial] = useState(null)
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState(null)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = useCallback(() => api.get(`/packing-materials/${id}`)
    .then(r => { setMaterial(r.data.data); setMovements(r.data.movements) })
    .catch(() => toast.error('Failed to load material'))
    .finally(() => setLoading(false)), [id])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    try {
      await api.delete(`/packing-materials/${id}`)
      toast.success('Material deleted')
      navigate('/packing-stock')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    }
  }

  if (loading) return <LoadingSpinner />
  if (!material) return <div className="text-center py-16 text-gray-400">Material not found</div>

  const totalUsed = movements.filter(m => m.type === 'Issue').reduce((sum, m) => sum - m.change, 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/packing-stock" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <h1 className="page-title flex-1 truncate">{material.productName}</h1>
        {canEdit && <button onClick={() => setEditing(true)} className="btn-secondary"><Edit size={14} /> Edit</button>}
        {user?.role === 'admin' && <button onClick={() => setConfirmDelete(true)} className="btn-danger"><Trash2 size={14} /></button>}
      </div>

      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-gray-100">
          <div>
            <p className="label">Available Stock</p>
            <p className="text-3xl"><StockLevel material={material} /></p>
            {material.reorderLevel > 0 && (
              <p className="text-xs text-gray-500 mt-1">Reorder level: {material.reorderLevel} {material.unit}</p>
            )}
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setAction('issue')} disabled={material.availableStock <= 0} className="btn-primary disabled:opacity-50">
                <MinusCircle size={14} /> Use Stock
              </button>
              <button onClick={() => setAction('receive')} className="btn-secondary"><PlusCircle size={14} /> Receive</button>
              <button onClick={() => setAction('adjust')} className="btn-secondary"><ClipboardCheck size={14} /> Count</button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Field label="Product Code" value={<span className="font-mono">{material.productCode}</span>} />
          <Field label="Brand" value={material.brand} />
          <Field label="Department" value={material.department} />
          <Field label="Class" value={material.materialClass} />
          <Field label="MRP" value={material.mrp != null ? formatCurrency(material.mrp) : null} />
          <Field label="Last Received" value={formatDate(material.lastReceiveDate)} />
          <Field label="Last Used" value={formatDate(material.lastIssueDate)} />
          <Field label="Store" value={[material.storeCode, material.storeName].filter(Boolean).join(' · ')} />
        </div>
        {material.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="label">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{material.notes}</p>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Stock History</h2>
          {totalUsed > 0 && <p className="text-xs text-gray-500">Total used: {+totalUsed.toFixed(3)} {material.unit}</p>}
        </div>
        {movements.length === 0 ? (
          <EmptyState title="No stock movements yet" />
        ) : (
          <div className="table-container">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Date</th>
                  <th className="table-th">Type</th>
                  <th className="table-th text-right">Change</th>
                  <th className="table-th text-right">Balance</th>
                  <th className="table-th">Reference / Notes</th>
                  <th className="table-th">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {movements.map(mv => (
                  <tr key={mv._id}>
                    <td className="table-td text-gray-500">{formatDate(mv.date)}</td>
                    <td className="table-td"><span className={`badge ${MOVEMENT_STYLES[mv.type]}`}>{mv.type === 'Issue' ? 'Used' : mv.type}</span></td>
                    <td className={`table-td text-right font-semibold ${mv.change < 0 ? 'text-orange-700' : 'text-green-700'}`}>
                      {mv.change > 0 ? '+' : ''}{mv.change}
                    </td>
                    <td className="table-td text-right">{mv.balanceAfter}</td>
                    <td className="table-td text-gray-600 whitespace-normal">{[mv.reference, mv.notes].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="table-td text-gray-500">{mv.userName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StockActionModal material={action && material} action={action} onClose={() => setAction(null)}
        onDone={() => { setAction(null); load() }} />
      <MaterialFormModal open={editing} material={material} onClose={() => setEditing(false)}
        onSaved={(m) => { setEditing(false); setMaterial(m) }} />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete Packing Material"
        message={`Delete "${material.productName}" and its full stock history? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function Field({ label, value }) {
  return <div><p className="label">{label}</p><p className="text-sm text-gray-800">{value || '—'}</p></div>
}

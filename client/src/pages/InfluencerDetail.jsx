import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Edit, Trash2, ArrowLeft, Plus, Video, RotateCcw, ShoppingBag, TrendingUp, Percent, Wallet, ExternalLink } from 'lucide-react'
import api from '../api/axios'
import { LoadingSpinner, ConfirmDialog, Pagination, Modal, SummaryCard } from '../components/UI'
import StatusBadge from '../components/StatusBadge'
import { formatDate, formatDateInput, formatCurrency } from '../utils/helpers'
import toast from 'react-hot-toast'

const today = () => formatDateInput(new Date())

function PurchaseModal({ open, purchase, influencerId, onClose, onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm({
      purchaseDate: formatDateInput(purchase?.purchaseDate) || today(),
      orderNo: purchase?.orderNo || '',
      productCode: purchase?.productCode || '',
      productName: purchase?.productName || '',
      quantity: purchase?.quantity ?? 1,
      amount: purchase?.amount ?? '',
      notes: purchase?.notes || '',
    })
  }, [open, purchase])

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.productName.trim()) { toast.error('Product name is required'); return }
    if (form.amount === '') { toast.error('Purchase amount is required'); return }
    setSaving(true)
    try {
      if (purchase) await api.put(`/influencers/purchases/${purchase._id}`, form)
      else await api.post(`/influencers/${influencerId}/purchases`, form)
      toast.success(purchase ? 'Purchase updated' : 'Purchase recorded')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save purchase')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} title={purchase ? 'Edit Purchase' : 'Record Product Purchase'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Purchase Date *</label>
            <input type="date" value={form.purchaseDate || ''} onChange={set('purchaseDate')} className="input" required />
          </div>
          <div>
            <label className="label">Order / Invoice No</label>
            <input type="text" value={form.orderNo || ''} onChange={set('orderNo')} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Product Code</label>
            <input type="text" value={form.productCode || ''} onChange={set('productCode')} className="input" />
          </div>
          <div className="col-span-2">
            <label className="label">Product Name *</label>
            <input type="text" value={form.productName || ''} onChange={set('productName')} className="input" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Quantity</label>
            <input type="number" min="1" value={form.quantity ?? ''} onChange={set('quantity')} className="input" />
          </div>
          <div>
            <label className="label">Amount Paid (₹) *</label>
            <input type="number" min="0" step="0.01" value={form.amount ?? ''} onChange={set('amount')} className="input" required />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea value={form.notes || ''} onChange={set('notes')} className="input" rows={2} />
        </div>
        <p className="text-xs text-gray-500">The amount paid becomes refundable once the influencer posts a video on this product.</p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  )
}

function VideoModal({ purchase, onClose, onSaved }) {
  const [videoUrl, setVideoUrl] = useState('')
  const [videoPostedDate, setVideoPostedDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!purchase) return
    setVideoUrl(purchase.videoUrl || '')
    setVideoPostedDate(formatDateInput(purchase.videoPostedDate) || today())
  }, [purchase])

  const save = async (posted) => {
    setSaving(true)
    try {
      await api.put(`/influencers/purchases/${purchase._id}/video`, { posted, videoUrl, videoPostedDate })
      toast.success(posted ? 'Video marked posted — refund is now due' : 'Video marked not posted')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save video')
    } finally { setSaving(false) }
  }

  const posted = purchase && purchase.refundStatus !== 'Awaiting Video'

  return (
    <Modal open={Boolean(purchase)} title="Video Posted" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); save(true) }} className="space-y-4">
        <p className="text-sm text-gray-600">{purchase?.productName}</p>
        <div>
          <label className="label">Video Link</label>
          <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className="input" placeholder="https://instagram.com/reel/... (optional)" />
        </div>
        <div>
          <label className="label">Posted On</label>
          <input type="date" value={videoPostedDate} onChange={e => setVideoPostedDate(e.target.value)} className="input" />
        </div>
        <div className="flex justify-between gap-3">
          {posted && purchase.refundStatus !== 'Refunded'
            ? <button type="button" disabled={saving} onClick={() => save(false)} className="btn-ghost text-red-500">Mark not posted</button>
            : <span />}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : posted ? 'Save' : 'Mark Posted'}</button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

function RefundModal({ purchase, onClose, onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (purchase) setForm({ refundAmount: purchase.amount, refundDate: today(), refundReference: '' })
  }, [purchase])

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put(`/influencers/purchases/${purchase._id}/refund`, form)
      toast.success('Refund recorded')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record refund')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={Boolean(purchase)} title="Refund Purchase" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">{purchase?.productName} — paid {formatCurrency(purchase?.amount)}</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Refund Amount (₹)</label>
            <input type="number" min="0" step="0.01" value={form.refundAmount ?? ''} onChange={set('refundAmount')} className="input" />
          </div>
          <div>
            <label className="label">Refund Date</label>
            <input type="date" value={form.refundDate || ''} onChange={set('refundDate')} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Transaction Reference</label>
          <input type="text" value={form.refundReference || ''} onChange={set('refundReference')} className="input" placeholder="UPI / bank ref" />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Mark Refunded'}</button>
        </div>
      </form>
    </Modal>
  )
}

function OrderModal({ purchase, commissionRate, onClose, onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (purchase) setForm({ orderDate: today(), orderNo: '', customerName: '', quantity: 1, orderAmount: '', notes: '' })
  }, [purchase])

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))
  const commission = form.orderAmount ? (Number(form.orderAmount) * commissionRate) / 100 : 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.orderAmount === '') { toast.error('Order amount is required'); return }
    setSaving(true)
    try {
      await api.post(`/influencers/purchases/${purchase._id}/orders`, form)
      toast.success('Order recorded')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record order')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={Boolean(purchase)} title="Order via Video" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">{purchase?.productName}</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Order Date *</label>
            <input type="date" value={form.orderDate || ''} onChange={set('orderDate')} className="input" required />
          </div>
          <div>
            <label className="label">Order No</label>
            <input type="text" value={form.orderNo || ''} onChange={set('orderNo')} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Customer</label>
          <input type="text" value={form.customerName || ''} onChange={set('customerName')} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Quantity</label>
            <input type="number" min="1" value={form.quantity ?? ''} onChange={set('quantity')} className="input" />
          </div>
          <div>
            <label className="label">Order Amount (₹) *</label>
            <input type="number" min="0" step="0.01" value={form.orderAmount ?? ''} onChange={set('orderAmount')} className="input" required />
          </div>
        </div>
        <p className="text-sm text-gray-600">Commission ({commissionRate}%): <span className="font-semibold text-forest-700">{formatCurrency(commission)}</span></p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Order'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function InfluencerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [influencer, setInfluencer] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [orders, setOrders] = useState([])
  const [orderPagination, setOrderPagination] = useState(null)
  const [orderPage, setOrderPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)
  const [purchaseModal, setPurchaseModal] = useState({ open: false, purchase: null })
  const [videoFor, setVideoFor] = useState(null)
  const [refundFor, setRefundFor] = useState(null)
  const [orderFor, setOrderFor] = useState(null)

  const fetchInfluencer = useCallback(() =>
    api.get(`/influencers/${id}`).then(r => setInfluencer(r.data.data)).catch(() => toast.error('Failed to load'))
  , [id])

  const fetchPurchases = useCallback(() =>
    api.get(`/influencers/${id}/purchases`).then(r => setPurchases(r.data.data)).catch(() => toast.error('Failed to load purchases'))
  , [id])

  const fetchOrders = useCallback(() =>
    api.get(`/influencers/${id}/orders`, { params: { page: orderPage, limit: 20 } })
      .then(r => { setOrders(r.data.data); setOrderPagination(r.data.pagination) })
      .catch(() => toast.error('Failed to load orders'))
  , [id, orderPage])

  useEffect(() => { fetchInfluencer().finally(() => setLoading(false)) }, [fetchInfluencer])
  useEffect(() => { fetchPurchases() }, [fetchPurchases])
  useEffect(() => { fetchOrders() }, [fetchOrders])

  const refreshAll = () => { fetchInfluencer(); fetchPurchases(); fetchOrders() }
  const closeAndRefresh = (close) => () => { close(); refreshAll() }

  const toggleCommission = async (order) => {
    const commissionStatus = order.commissionStatus === 'Paid' ? 'Unpaid' : 'Paid'
    try {
      await api.put(`/influencers/orders/${order._id}/commission`, { commissionStatus })
      toast.success(`Commission marked ${commissionStatus.toLowerCase()}`)
      refreshAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update commission')
    }
  }

  const handleConfirm = async () => {
    const { kind, item } = confirm
    try {
      if (kind === 'influencer') {
        await api.delete(`/influencers/${id}`)
        toast.success('Influencer deleted')
        navigate('/influencers')
        return
      }
      await api.delete(kind === 'purchase' ? `/influencers/purchases/${item._id}` : `/influencers/orders/${item._id}`)
      toast.success(kind === 'purchase' ? 'Purchase deleted' : 'Order deleted')
      refreshAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    }
    setConfirm(null)
  }

  if (loading) return <LoadingSpinner />
  if (!influencer) return <div className="text-center py-16 text-gray-400">Influencer not found</div>

  const s = influencer.summary || {}

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/influencers" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <h1 className="page-title flex-1 truncate">{influencer.name}</h1>
        <span className={`badge ${influencer.isActive ? 'status-received' : 'status-cancelled'}`}>{influencer.isActive ? 'Active' : 'Inactive'}</span>
        <Link to={`/influencers/${id}/edit`} className="btn-secondary"><Edit size={14} /> Edit</Link>
        <button onClick={() => setConfirm({ kind: 'influencer' })} className="btn-danger"><Trash2 size={14} /></button>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          <div><p className="label">Platform</p><p className="text-sm text-gray-800">{influencer.platform}{influencer.handle ? ` · ${influencer.handle}` : ''}</p></div>
          <div><p className="label">Followers</p><p className="text-sm text-gray-800">{influencer.followers != null ? Number(influencer.followers).toLocaleString('en-IN') : '—'}</p></div>
          <div><p className="label">Commission Rate</p><p className="text-sm text-gray-800">{influencer.commissionRate}% of order value</p></div>
          <div><p className="label">Phone</p><p className="text-sm text-gray-800">{influencer.phone || '—'}</p></div>
          <div><p className="label">Email</p><p className="text-sm text-gray-800">{influencer.email || '—'}</p></div>
          {influencer.notes && <div className="sm:col-span-3"><p className="label">Notes</p><p className="text-sm text-gray-700 whitespace-pre-line">{influencer.notes}</p></div>}
        </div>
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Revenue Generated" value={formatCurrency(s.revenue || 0)} subtitle={`${s.orders || 0} orders from ${s.videosPosted || 0} videos`} icon={TrendingUp} color="forest" />
        <SummaryCard title="Commission" value={formatCurrency(s.commission || 0)} subtitle={`${formatCurrency(s.commissionPaid || 0)} paid · ${formatCurrency(s.commissionUnpaid || 0)} unpaid`} icon={Percent} color="purple" />
        <SummaryCard title="Product Refunds" value={formatCurrency(s.refunded || 0)} subtitle={`${formatCurrency(s.refundDue || 0)} due · ${s.awaitingVideo || 0} awaiting video`} icon={RotateCcw} color="amber" />
        <SummaryCard title="Net Revenue" value={formatCurrency(s.netRevenue || 0)} subtitle="After commission & refunds" icon={Wallet} color="blue" />
      </div>

      {/* Purchases */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="flex-1">
            <h2 className="font-semibold text-gray-800">Product Purchases</h2>
            <p className="text-xs text-gray-500">Refunded once a video is posted on the product</p>
          </div>
          {influencer.isActive && (
            <button onClick={() => setPurchaseModal({ open: true, purchase: null })} className="btn-primary"><Plus size={14} /> Add Purchase</button>
          )}
        </div>
        {purchases.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No purchases yet</p>
        ) : (
          <div className="table-container">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Date</th>
                  <th className="table-th">Product</th>
                  <th className="table-th">Paid</th>
                  <th className="table-th">Video</th>
                  <th className="table-th">Refund</th>
                  <th className="table-th">Orders</th>
                  <th className="table-th">Revenue</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {purchases.map(p => (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="table-td text-gray-500">{formatDate(p.purchaseDate)}</td>
                    <td className="table-td">
                      <span className="font-medium text-gray-800 block truncate max-w-[180px]">{p.productName}</span>
                      {p.productCode && <span className="font-mono text-xs text-gray-400">{p.productCode}</span>}
                    </td>
                    <td className="table-td font-semibold">{formatCurrency(p.amount)}</td>
                    <td className="table-td">
                      {p.refundStatus === 'Awaiting Video' ? (
                        <span className="text-gray-400 text-xs">Not posted</span>
                      ) : p.videoUrl ? (
                        <a href={p.videoUrl} target="_blank" rel="noreferrer" className="text-forest-700 hover:underline inline-flex items-center gap-1 text-xs">
                          {formatDate(p.videoPostedDate)} <ExternalLink size={12} />
                        </a>
                      ) : <span className="text-gray-700 text-xs">Posted {formatDate(p.videoPostedDate)}</span>}
                    </td>
                    <td className="table-td">
                      <StatusBadge status={p.refundStatus} />
                      {p.refundStatus === 'Refunded' && <span className="block text-xs text-gray-400 mt-0.5">{formatCurrency(p.refundAmount)} · {formatDate(p.refundDate)}</span>}
                    </td>
                    <td className="table-td text-gray-600">{p.orders}</td>
                    <td className="table-td font-semibold text-forest-700">{formatCurrency(p.revenue)}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setVideoFor(p)} className="btn-ghost px-2" title={p.refundStatus === 'Awaiting Video' ? 'Mark video posted' : 'Edit video'}><Video size={14} /></button>
                        {p.refundStatus === 'Refund Due' && (
                          <button onClick={() => setRefundFor(p)} className="btn-ghost px-2 text-amber-600" title="Mark refunded"><RotateCcw size={14} /></button>
                        )}
                        {p.refundStatus !== 'Awaiting Video' && (
                          <button onClick={() => setOrderFor(p)} className="btn-ghost px-2 text-forest-600" title="Add order via this video"><ShoppingBag size={14} /></button>
                        )}
                        <button onClick={() => setPurchaseModal({ open: true, purchase: p })} className="btn-ghost px-2" title="Edit"><Edit size={14} /></button>
                        <button onClick={() => setConfirm({ kind: 'purchase', item: p })} className="btn-ghost px-2 text-red-500" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Orders */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Orders via Videos</h2>
          <p className="text-xs text-gray-500">Each order earns {influencer.commissionRate}% commission. Add orders from the purchase row's bag icon.</p>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No orders yet</p>
        ) : (
          <>
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Date</th>
                    <th className="table-th">Order No</th>
                    <th className="table-th">Video</th>
                    <th className="table-th">Customer</th>
                    <th className="table-th">Amount</th>
                    <th className="table-th">Commission</th>
                    <th className="table-th">Payout</th>
                    <th className="table-th"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.map(o => (
                    <tr key={o._id} className="hover:bg-gray-50">
                      <td className="table-td text-gray-500">{formatDate(o.orderDate)}</td>
                      <td className="table-td font-mono text-xs text-gray-600">{o.orderNo || '—'}</td>
                      <td className="table-td text-gray-700 truncate max-w-[160px]">{o.purchase?.productName || o.productName}</td>
                      <td className="table-td text-gray-600">{o.customerName || '—'}</td>
                      <td className="table-td font-semibold">{formatCurrency(o.orderAmount)}</td>
                      <td className="table-td text-forest-700 font-semibold">{formatCurrency(o.commissionAmount)} <span className="text-xs text-gray-400 font-normal">({o.commissionRate}%)</span></td>
                      <td className="table-td">
                        <button onClick={() => toggleCommission(o)} title={o.commissionStatus === 'Paid' ? 'Mark unpaid' : 'Mark paid'}>
                          <StatusBadge status={o.commissionStatus} />
                        </button>
                      </td>
                      <td className="table-td">
                        <button onClick={() => setConfirm({ kind: 'order', item: o })} className="btn-ghost px-2 text-red-500" title="Delete"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={orderPagination} onPageChange={setOrderPage} />
          </>
        )}
      </div>

      <PurchaseModal
        open={purchaseModal.open}
        purchase={purchaseModal.purchase}
        influencerId={id}
        onClose={() => setPurchaseModal({ open: false, purchase: null })}
        onSaved={closeAndRefresh(() => setPurchaseModal({ open: false, purchase: null }))}
      />
      <VideoModal purchase={videoFor} onClose={() => setVideoFor(null)} onSaved={closeAndRefresh(() => setVideoFor(null))} />
      <RefundModal purchase={refundFor} onClose={() => setRefundFor(null)} onSaved={closeAndRefresh(() => setRefundFor(null))} />
      <OrderModal purchase={orderFor} commissionRate={influencer.commissionRate} onClose={() => setOrderFor(null)} onSaved={closeAndRefresh(() => setOrderFor(null))} />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.kind === 'influencer' ? 'Delete Influencer' : confirm?.kind === 'purchase' ? 'Delete Purchase' : 'Delete Order'}
        message={
          confirm?.kind === 'influencer' ? `Delete "${influencer.name}"? If they have purchases or orders, deletion will be blocked.`
            : confirm?.kind === 'purchase' ? `Delete the purchase of "${confirm.item.productName}"? Blocked if orders are linked to its video.`
            : 'Delete this order? Its commission will be removed from the summary.'
        }
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}

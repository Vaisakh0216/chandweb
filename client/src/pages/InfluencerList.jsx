import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, X, TrendingUp, Percent, RotateCcw, Wallet } from 'lucide-react'
import api from '../api/axios'
import { PageHeader, LoadingSpinner, EmptyState, Pagination, SummaryCard } from '../components/UI'
import { formatCurrency } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function InfluencerList() {
  const [influencers, setInfluencers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [totals, setTotals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isActive, setIsActive] = useState('')
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const fetchInfluencers = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 25 }
      if (search) params.search = search
      if (isActive !== '') params.isActive = isActive
      const res = await api.get('/influencers', { params })
      setInfluencers(res.data.data)
      setPagination(res.data.pagination)
    } catch { toast.error('Failed to load influencers') }
    finally { setLoading(false) }
  }, [page, search, isActive])

  useEffect(() => { fetchInfluencers() }, [fetchInfluencers])

  useEffect(() => {
    const params = {}
    if (from) params.from = from
    if (to) params.to = to
    api.get('/influencers/summary', { params })
      .then(r => setTotals(r.data.data.totals))
      .catch(() => toast.error('Failed to load revenue summary'))
  }, [from, to])

  return (
    <div>
      <PageHeader
        title="Influencers"
        subtitle="Product purchases, video refunds and commission on orders"
        actions={<Link to="/influencers/new" className="btn-primary"><Plus size={15} /> Add Influencer</Link>}
      />

      {/* Revenue summary */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <h2 className="font-semibold text-gray-800 flex-1">Revenue Summary</h2>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input w-auto" aria-label="From date" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input w-auto" aria-label="To date" />
          {(from || to) && <button onClick={() => { setFrom(''); setTo('') }} className="btn-ghost text-red-500"><X size={14} /> All time</button>}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Revenue Generated" value={formatCurrency(totals?.revenue || 0)} subtitle={`${totals?.orders || 0} orders via videos`} icon={TrendingUp} color="forest" />
          <SummaryCard title="Commission" value={formatCurrency(totals?.commission || 0)} subtitle={`${formatCurrency(totals?.commissionUnpaid || 0)} unpaid`} icon={Percent} color="purple" />
          <SummaryCard title="Product Refunds" value={formatCurrency(totals?.refunded || 0)} subtitle={`${formatCurrency(totals?.refundDue || 0)} due · ${totals?.awaitingVideo || 0} awaiting video`} icon={RotateCcw} color="amber" />
          <SummaryCard title="Net Revenue" value={formatCurrency(totals?.netRevenue || 0)} subtitle="After commission & refunds" icon={Wallet} color="blue" />
        </div>
      </div>

      <div className="card p-4 mb-4">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by name, handle, email..." className="input pl-9" />
          </div>
          <select value={isActive} onChange={e => { setIsActive(e.target.value); setPage(1) }} className="input w-auto">
            <option value="">All Influencers</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          {(search || isActive) && (
            <button onClick={() => { setSearch(''); setIsActive(''); setPage(1) }} className="btn-ghost text-red-500">
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {loading ? <LoadingSpinner /> : influencers.length === 0 ? (
          <EmptyState title="No influencers found" description="Add your first influencer" action={<Link to="/influencers/new" className="btn-primary">Add Influencer</Link>} />
        ) : (
          <>
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Influencer</th>
                    <th className="table-th">Platform</th>
                    <th className="table-th">Videos</th>
                    <th className="table-th">Orders</th>
                    <th className="table-th">Revenue</th>
                    <th className="table-th">Commission</th>
                    <th className="table-th">Refund Due</th>
                    <th className="table-th">Status</th>
                    <th className="table-th"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {influencers.map(i => {
                    const s = i.summary || {}
                    return (
                      <tr key={i._id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-td">
                          <Link to={`/influencers/${i._id}`} className="font-semibold text-forest-700 hover:underline">{i.name}</Link>
                          {i.handle && <span className="block text-xs text-gray-400">{i.handle}</span>}
                        </td>
                        <td className="table-td text-gray-600">{i.platform}</td>
                        <td className="table-td text-gray-600">{s.videosPosted || 0} / {s.purchases || 0}</td>
                        <td className="table-td text-gray-600">{s.orders || 0}</td>
                        <td className="table-td font-semibold text-forest-700">{formatCurrency(s.revenue || 0)}</td>
                        <td className="table-td text-gray-700">{formatCurrency(s.commission || 0)} <span className="text-xs text-gray-400">({i.commissionRate}%)</span></td>
                        <td className="table-td text-amber-700">{s.refundDue ? formatCurrency(s.refundDue) : '—'}</td>
                        <td className="table-td">
                          <span className={`badge ${i.isActive ? 'status-received' : 'status-cancelled'}`}>
                            {i.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="table-td">
                          <Link to={`/influencers/${i._id}/edit`} className="text-forest-600 text-xs font-medium hover:underline">Edit</Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}

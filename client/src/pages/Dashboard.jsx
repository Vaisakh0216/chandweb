import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList, ShoppingCart, PackageCheck, Users,
  TrendingUp, TrendingDown, Plus, ArrowRight, Boxes
} from 'lucide-react'
import api from '../api/axios'
import { SummaryCard, LoadingSpinner } from '../components/UI'
import StatusBadge from '../components/StatusBadge'
import { formatDate, formatCurrency } from '../utils/helpers'
import { StockLevel } from './PackingStockList'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard')
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  const { summary, recentActivity, priceAlerts, packingStock } = data || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-gray-500">Production materials procurement overview</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/indents/new" className="btn-secondary">
            <Plus size={15} /> New Indent
          </Link>
          <Link to="/goods-receipts/new" className="btn-primary">
            <Plus size={15} /> Record Receipt
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <SummaryCard
          title="Pending Indents"
          value={summary?.pendingIndents ?? '—'}
          subtitle="Awaiting order"
          icon={ClipboardList}
          color="amber"
        />
        <SummaryCard
          title="Active Orders"
          value={summary?.pendingOrders ?? '—'}
          subtitle="Ordered / in transit"
          icon={ShoppingCart}
          color="blue"
        />
        <SummaryCard
          title="Receipts (Month)"
          value={summary?.thisMonthReceipts ?? '—'}
          subtitle={`vs ${summary?.lastMonthReceipts ?? 0} last month`}
          icon={PackageCheck}
          color="forest"
          trend={
            summary?.lastMonthReceipts > 0
              ? { direction: summary.thisMonthReceipts >= summary.lastMonthReceipts ? 'up' : 'down', value: `${summary.lastMonthReceipts}` }
              : null
          }
        />
        <SummaryCard
          title="Total Orders"
          value={summary?.totalOrders ?? '—'}
          subtitle="All time"
          icon={ShoppingCart}
          color="purple"
        />
        <SummaryCard
          title="Total Receipts"
          value={summary?.totalReceipts ?? '—'}
          subtitle="All time"
          icon={PackageCheck}
          color="forest"
        />
        <SummaryCard
          title="Active Vendors"
          value={summary?.activeVendors ?? '—'}
          subtitle="Registered suppliers"
          icon={Users}
          color="blue"
        />
      </div>

      {packingStock && <PackingStockPanel stock={packingStock} />}

      {/* Price Alerts */}
      {priceAlerts && priceAlerts.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Price Movement Alerts</h2>
            <Link to="/reports" className="text-xs text-forest-600 hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
          </div>
          <div className="divide-y divide-gray-50">
            {priceAlerts.map((alert, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${alert.direction === 'increase' ? 'bg-red-100' : 'bg-green-100'}`}>
                  {alert.direction === 'increase'
                    ? <TrendingUp size={15} className="text-red-600" />
                    : <TrendingDown size={15} className="text-green-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{alert.productName}</p>
                  <p className="text-xs text-gray-500">{alert.productCode}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-800">{formatCurrency(alert.currentPricePerKg, alert.currency)}/kg</p>
                  <p className={`text-xs font-semibold ${alert.direction === 'increase' ? 'price-increase' : 'price-decrease'}`}>
                    {alert.direction === 'increase' ? '▲' : '▼'} {Math.abs(alert.percentageChange).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity — 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Receipts */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Recent Goods Received</h2>
            <Link to="/goods-receipts" className="text-xs text-forest-600 hover:underline flex items-center gap-1">All <ArrowRight size={12} /></Link>
          </div>
          <div className="table-container">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th rounded-tl">Product</th>
                  <th className="table-th">Vendor</th>
                  <th className="table-th">Date</th>
                  <th className="table-th rounded-tr">Rate/kg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentActivity?.receipts?.map(r => (
                  <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td">
                      <p className="font-medium text-gray-800 truncate max-w-[160px]">{r.productName}</p>
                      {r.productCode && <p className="text-xs text-gray-400">{r.productCode}</p>}
                    </td>
                    <td className="table-td text-gray-600">{r.vendorSnapshot?.name || '—'}</td>
                    <td className="table-td text-gray-500">{formatDate(r.receivedDate)}</td>
                    <td className="table-td font-semibold text-forest-700">
                      {r.pricePerKg ? formatCurrency(r.pricePerKg) + '/kg' : r.ratePerUnit ? formatCurrency(r.ratePerUnit) : '—'}
                    </td>
                  </tr>
                ))}
                {!recentActivity?.receipts?.length && (
                  <tr><td colSpan={4} className="table-td text-center text-gray-400">No receipts yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Indents */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Pending Indents</h2>
            <Link to="/indents" className="text-xs text-forest-600 hover:underline flex items-center gap-1">All <ArrowRight size={12} /></Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentActivity?.pendingIndents?.map(i => (
              <Link key={i._id} to={`/indents/${i._id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-gray-50 transition-colors">
                <p className="text-sm font-medium text-gray-800 line-clamp-1">{i.productName}</p>
                <div className="flex items-center justify-between">
                  <StatusBadge status={i.status} />
                  <span className="text-xs text-gray-400">{formatDate(i.indentDate)}</span>
                </div>
              </Link>
            ))}
            {!recentActivity?.pendingIndents?.length && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">No pending indents 🎉</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      {recentActivity?.orders?.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Recent Purchase Orders</h2>
            <Link to="/procurement" className="text-xs text-forest-600 hover:underline flex items-center gap-1">All <ArrowRight size={12} /></Link>
          </div>
          <div className="table-container">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Product</th>
                  <th className="table-th">Vendor</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Qty</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentActivity.orders.map(o => (
                  <tr key={o._id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td">
                      <p className="font-medium text-gray-800 max-w-[180px] truncate">{o.productName}</p>
                      {o.productCode && <p className="text-xs text-gray-400">{o.productCode}</p>}
                    </td>
                    <td className="table-td text-gray-600">{o.vendorSnapshot?.name || '—'}</td>
                    <td className="table-td text-gray-500">{formatDate(o.orderDate)}</td>
                    <td className="table-td">{o.quantity ? `${o.quantity} ${o.unit}` : '—'}</td>
                    <td className="table-td"><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function PackingStockPanel({ stock }) {
  const stats = [
    { label: 'Items in Stock', value: stock.totalItems, tone: 'text-forest-700', to: '/packing-stock' },
    { label: 'Low Stock', value: stock.lowStock, tone: 'text-amber-600', to: '/packing-stock?stockStatus=low' },
    { label: 'Out of Stock', value: stock.outOfStock, tone: 'text-red-600', to: '/packing-stock?stockStatus=out' },
    { label: 'Items Used (Month)', value: stock.itemsUsedThisMonth, tone: 'text-blue-700', to: '/packing-stock' },
  ]

  return (
    <div className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Boxes size={17} className="text-forest-600" /> Packing Stock</h2>
        <Link to="/packing-stock" className="text-xs text-forest-600 hover:underline flex items-center gap-1">Open <ArrowRight size={12} /></Link>
      </div>

      {stock.totalItems === 0 ? (
        <p className="px-5 py-6 text-sm text-gray-500 text-center">
          No packing materials yet. <Link to="/packing-stock" className="text-forest-600 hover:underline">Import your PMST sheet</Link> to start tracking stock.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
            {stats.map(s => (
              <Link key={s.label} to={s.to} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.tone}`}>{s.value}</p>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x divide-gray-100">
            <div>
              <p className="px-5 pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Needs Attention</p>
              <div className="divide-y divide-gray-50">
                {stock.attention.map(m => (
                  <Link key={m._id} to={`/packing-stock/${m._id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{m.productName}</p>
                      <p className="text-xs text-gray-400">
                        {m.productCode}{m.reorderLevel > 0 && ` · reorder at ${m.reorderLevel}`}
                      </p>
                    </div>
                    <span className="text-sm flex-shrink-0"><StockLevel material={m} /></span>
                  </Link>
                ))}
                {!stock.attention.length && <p className="px-5 py-4 text-sm text-gray-400">All items are above their reorder level</p>}
              </div>
            </div>

            <div className="border-t lg:border-t-0 border-gray-100">
              <p className="px-5 pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Usage</p>
              <div className="divide-y divide-gray-50">
                {stock.recentUsage.map(u => (
                  <Link key={u._id} to={`/packing-stock/${u.material?._id || ''}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{u.productName}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {formatDate(u.date)}{u.reference && ` · ${u.reference}`}{u.userName && ` · ${u.userName}`}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-orange-700 flex-shrink-0">
                      {u.change} <span className="text-xs font-normal text-gray-500">{u.material?.unit}</span>
                    </span>
                  </Link>
                ))}
                {!stock.recentUsage.length && <p className="px-5 py-4 text-sm text-gray-400">No stock used yet</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList, ShoppingCart, PackageCheck, Users,
  TrendingUp, TrendingDown, Plus, ArrowRight
} from 'lucide-react'
import api from '../api/axios'
import { SummaryCard, LoadingSpinner } from '../components/UI'
import StatusBadge from '../components/StatusBadge'
import { formatDate, formatCurrency } from '../utils/helpers'

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

  const { summary, recentActivity, priceAlerts } = data || {}

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

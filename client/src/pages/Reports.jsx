import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TrendingUp, TrendingDown, Minus, Download, BarChart2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from '../api/axios'
import { PageHeader, LoadingSpinner } from '../components/UI'
import { formatDate, formatCurrency } from '../utils/helpers'
import toast from 'react-hot-toast'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function Reports() {
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState('price-history')
  const [productCode, setProductCode] = useState(searchParams.get('productCode') || '')
  const [priceHistory, setPriceHistory] = useState(null)
  const [monthlySummary, setMonthlySummary] = useState([])
  const [vendorSummary, setVendorSummary] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)

  const loadPriceHistory = async () => {
    if (!productCode.trim()) { toast.error('Enter a product code'); return }
    setLoading(true)
    try {
      const res = await api.get(`/reports/price-history/${productCode.trim().toUpperCase()}`)
      setPriceHistory(res.data)
    } catch { toast.error('Failed to load price history') }
    finally { setLoading(false) }
  }

  const loadMonthly = async () => {
    setLoading(true)
    try {
      const res = await api.get('/reports/monthly', { params: { year } })
      const filled = MONTHS.map((m, i) => {
        const found = res.data.data.find(d => d.month === i + 1)
        return { month: m, totalReceipts: found?.totalReceipts || 0, totalValue: found?.totalValue || 0 }
      })
      setMonthlySummary(filled)
    } catch { toast.error('Failed to load summary') }
    finally { setLoading(false) }
  }

  const loadVendorSummary = async () => {
    setLoading(true)
    try {
      const res = await api.get('/reports/vendor-summary')
      setVendorSummary(res.data.data)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (tab === 'monthly') loadMonthly()
    else if (tab === 'vendor-summary') loadVendorSummary()
    // eslint-disable-next-line
  }, [tab, year])

  useEffect(() => {
    if (productCode && tab === 'price-history') loadPriceHistory()
    // eslint-disable-next-line
  }, [])

  const exportGR = () => window.open('/api/reports/export/goods-receipts', '_blank')
  const exportIndents = () => window.open('/api/reports/export/indents', '_blank')

  const TABS = [
    { key: 'price-history', label: 'Price History' },
    { key: 'monthly', label: 'Monthly Summary' },
    { key: 'vendor-summary', label: 'Vendor Summary' },
    { key: 'export', label: 'Export Data' },
  ]

  return (
    <div>
      <PageHeader title="Reports & Analytics" subtitle="Price history, purchase summaries, and data exports" />

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.key ? 'bg-forest-500 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Price History Tab */}
      {tab === 'price-history' && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex gap-3">
              <input type="text" value={productCode} onChange={e => setProductCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadPriceHistory()}
                placeholder="Enter product code (e.g. 14370, 13410)" className="input flex-1" />
              <button onClick={loadPriceHistory} disabled={loading} className="btn-primary">
                {loading ? 'Loading...' : 'View History'}
              </button>
            </div>
          </div>

          {loading && <LoadingSpinner />}

          {priceHistory && !loading && (
            <div className="space-y-4">
              {/* Summary */}
              {priceHistory.data.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="card p-4">
                    <p className="text-xs text-gray-500">Total Records</p>
                    <p className="text-2xl font-bold text-forest-700">{priceHistory.totalRecords}</p>
                  </div>
                  {priceHistory.lowestRate && (
                    <div className="card p-4 border-l-4 border-green-400">
                      <p className="text-xs text-gray-500">Lowest Rate Recorded</p>
                      <p className="text-xl font-bold text-green-700">{formatCurrency(priceHistory.lowestRate.pricePerKg)}/kg</p>
                      <p className="text-xs text-gray-400">{priceHistory.lowestRate.vendorName} • {formatDate(priceHistory.lowestRate.receivedDate)}</p>
                    </div>
                  )}
                  {priceHistory.data[0] && (
                    <div className="card p-4 border-l-4 border-blue-400">
                      <p className="text-xs text-gray-500">Latest Rate</p>
                      <p className="text-xl font-bold text-blue-700">
                        {priceHistory.data[0].pricePerKg ? formatCurrency(priceHistory.data[0].pricePerKg) + '/kg' : formatCurrency(priceHistory.data[0].ratePerUnit)}
                      </p>
                      <p className="text-xs text-gray-400">{priceHistory.data[0].vendorSnapshot?.name}</p>
                    </div>
                  )}
                </div>
              )}

              {/* History table */}
              <div className="card">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">Purchase History — {productCode.toUpperCase()}</h3>
                </div>
                {priceHistory.data.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No records found for this product code</p>
                ) : (
                  <div className="table-container">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="table-th">Date</th>
                          <th className="table-th">Vendor</th>
                          <th className="table-th">Qty</th>
                          <th className="table-th">Total</th>
                          <th className="table-th">Rate/kg</th>
                          <th className="table-th">Invoice</th>
                          <th className="table-th">Change</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {priceHistory.data.map((r, i) => (
                          <tr key={r._id} className="hover:bg-gray-50">
                            <td className="table-td text-gray-600">{formatDate(r.receivedDate)}</td>
                            <td className="table-td text-gray-700">{r.vendorSnapshot?.name || '—'}</td>
                            <td className="table-td">{r.receivedQuantity} {r.unit}</td>
                            <td className="table-td">{r.totalPrice ? formatCurrency(r.totalPrice, r.currency) : '—'}</td>
                            <td className="table-td font-bold text-forest-700">
                              {r.pricePerKg ? formatCurrency(r.pricePerKg, r.currency) + '/kg' : r.ratePerUnit ? formatCurrency(r.ratePerUnit) : '—'}
                            </td>
                            <td className="table-td font-mono text-xs text-gray-500">{r.invoiceNo || '—'}</td>
                            <td className="table-td">
                              {i === priceHistory.data.length - 1 ? (
                                <span className="badge status-received text-xs">First</span>
                              ) : r.comparison?.comparable ? (
                                <div className={`flex items-center gap-1 text-xs font-semibold ${r.comparison.direction === 'increase' ? 'text-red-600' : r.comparison.direction === 'decrease' ? 'text-green-600' : 'text-gray-500'}`}>
                                  {r.comparison.direction === 'increase' ? <TrendingUp size={12} /> : r.comparison.direction === 'decrease' ? <TrendingDown size={12} /> : <Minus size={12} />}
                                  {r.comparison.direction === 'increase' ? '+' : ''}{r.comparison.percentageChange?.toFixed(1)}%
                                </div>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly Summary Tab */}
      {tab === 'monthly' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <label className="label m-0">Year:</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="input w-auto">
              {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          {loading ? <LoadingSpinner /> : (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Goods Receipts by Month — {year}</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlySummary} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v, name) => [name === 'totalValue' ? `₹${v.toLocaleString('en-IN')}` : v, name === 'totalValue' ? 'Total Value' : 'Receipts']} />
                  <Bar dataKey="totalReceipts" fill="#2e7d5e" radius={[4, 4, 0, 0]} name="Receipts" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr><th className="table-th">Month</th><th className="table-th">Receipts</th><th className="table-th">Total Value (INR)</th></tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {monthlySummary.map(m => (
                      <tr key={m.month} className="hover:bg-gray-50">
                        <td className="table-td font-medium">{m.month}</td>
                        <td className="table-td">{m.totalReceipts}</td>
                        <td className="table-td font-semibold text-forest-700">{m.totalValue ? formatCurrency(m.totalValue) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vendor Summary Tab */}
      {tab === 'vendor-summary' && (
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Vendor-wise Purchase Summary</h3>
          </div>
          {loading ? <LoadingSpinner /> : (
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Vendor</th>
                    <th className="table-th">Receipts</th>
                    <th className="table-th">Products</th>
                    <th className="table-th">Total Value</th>
                    <th className="table-th">Last Purchase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {vendorSummary.map((v, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="table-td font-semibold text-gray-800">{v.vendorName || '—'}</td>
                      <td className="table-td">{v.totalReceipts}</td>
                      <td className="table-td">{v.productCount}</td>
                      <td className="table-td font-bold text-forest-700">{v.totalValue ? formatCurrency(v.totalValue) : '—'}</td>
                      <td className="table-td text-gray-500">{formatDate(v.lastPurchase)}</td>
                    </tr>
                  ))}
                  {vendorSummary.length === 0 && <tr><td colSpan={5} className="table-td text-center text-gray-400">No data</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Export Tab */}
      {tab === 'export' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="card p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-forest-100 rounded-xl flex items-center justify-center mx-auto">
              <BarChart2 size={24} className="text-forest-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Goods Receipts</h3>
              <p className="text-sm text-gray-500 mt-1">Export all goods received data as CSV — matches your Goods Receiving Data sheet format</p>
            </div>
            <button onClick={exportGR} className="btn-primary w-full justify-center">
              <Download size={15} /> Download CSV
            </button>
          </div>

          <div className="card p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto">
              <BarChart2 size={24} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Procurement Indents</h3>
              <p className="text-sm text-gray-500 mt-1">Export all indent records as CSV — matches your Procurement Indent Status File format</p>
            </div>
            <button onClick={exportIndents} className="btn-primary w-full justify-center">
              <Download size={15} /> Download CSV
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

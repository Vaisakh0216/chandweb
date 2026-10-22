import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatCurrency } from '../utils/helpers'

export default function PriceComparison({ comparison, currency = 'INR' }) {
  if (!comparison) return null

  if (comparison.isFirstPurchase) {
    return (
      <div className="card p-4 border-l-4 border-forest-400">
        <p className="text-sm font-semibold text-forest-700">🌱 First Recorded Purchase</p>
        <p className="text-xs text-gray-500 mt-1">No previous purchase history found for this product.</p>
      </div>
    )
  }

  if (!comparison.comparable) {
    return (
      <div className="card p-4 border-l-4 border-gray-300">
        <p className="text-sm text-gray-600">Price comparison not available: {comparison.reason}</p>
      </div>
    )
  }

  const { direction, percentageChange, difference, currentRate, previousRate, metric, previousRecord } = comparison
  const isIncrease = direction === 'increase'
  const isDecrease = direction === 'decrease'

  const borderColor = isIncrease ? 'border-red-400' : isDecrease ? 'border-green-400' : 'border-gray-300'
  const pctColor = isIncrease ? 'text-red-600' : isDecrease ? 'text-green-600' : 'text-gray-500'
  const bgColor = isIncrease ? 'bg-red-50' : isDecrease ? 'bg-green-50' : 'bg-gray-50'
  const Icon = isIncrease ? TrendingUp : isDecrease ? TrendingDown : Minus

  const label = metric === 'per_kg' ? '/kg' : '/unit'

  return (
    <div className={`card p-4 border-l-4 ${borderColor}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-800">Price Comparison</p>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${bgColor}`}>
          <Icon size={14} className={pctColor} />
          <span className={`text-sm font-bold ${pctColor}`}>
            {isIncrease ? '+' : ''}{percentageChange?.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Current Rate</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(currentRate, currency)}<span className="text-xs font-normal text-gray-500">{label}</span></p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Previous Rate</p>
          <p className="text-lg font-bold text-gray-700">{formatCurrency(previousRate, currency)}<span className="text-xs font-normal text-gray-500">{label}</span></p>
        </div>
      </div>

      <div className={`mt-3 pt-3 border-t ${isIncrease ? 'border-red-100' : 'border-green-100'}`}>
        <p className="text-xs text-gray-500">
          Difference: <span className={`font-semibold ${pctColor}`}>{isIncrease ? '+' : ''}{formatCurrency(difference, currency)}{label}</span>
          {previousRecord && (
            <span className="ml-2 text-gray-400">
              vs purchase on {previousRecord.receivedDate ? new Date(previousRecord.receivedDate).toLocaleDateString('en-IN') : '—'}
              {previousRecord.vendorName && ` from ${previousRecord.vendorName}`}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

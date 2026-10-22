import { calculatePrices, formatCurrency } from '../utils/helpers'

export default function PriceCalculatorPreview({ quantity, unit, totalPrice, currency = 'INR' }) {
  if (!quantity || !totalPrice || quantity <= 0 || totalPrice <= 0) return null

  const { pricePerKg, unitPrice, priceCalculationType } = calculatePrices(
    parseFloat(quantity), unit, parseFloat(totalPrice)
  )

  return (
    <div className="mt-2 p-3 bg-forest-50 border border-forest-200 rounded-lg flex flex-wrap gap-4">
      {priceCalculationType === 'per_kg' && pricePerKg !== null && (
        <div>
          <p className="text-xs text-forest-600 font-medium">Price per kg</p>
          <p className="text-sm font-bold text-forest-800">{formatCurrency(pricePerKg, currency)}/kg</p>
        </div>
      )}
      {unitPrice !== null && (
        <div>
          <p className="text-xs text-forest-600 font-medium">Price per {unit}</p>
          <p className="text-sm font-bold text-forest-800">{formatCurrency(unitPrice, currency)}/{unit}</p>
        </div>
      )}
    </div>
  )
}

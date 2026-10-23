import { calculatePrices, formatCurrency } from '../utils/helpers'

export default function PriceCalculatorPreview({ quantity, unit, totalPrice, currency = 'INR' }) {
  if (!quantity || !totalPrice || quantity <= 0 || totalPrice <= 0) return null

  const { pricePerKg, unitPrice, priceCalculationType } = calculatePrices(
    parseFloat(quantity), unit, parseFloat(totalPrice)
  )

  const showPerKg = priceCalculationType === 'per_kg' && pricePerKg !== null
  // Avoid showing the same figure twice when the unit itself is kg
  const isKgUnit = ['kg', 'kgs', 'kilogram', 'kilograms'].includes(String(unit).toLowerCase())
  const showUnitPrice = unitPrice !== null && !(showPerKg && isKgUnit)

  return (
    <div className="mt-2 p-3 bg-forest-50 border border-forest-200 rounded-lg flex flex-wrap gap-4">
      {showPerKg && (
        <div>
          <p className="text-xs text-forest-600 font-medium">Price per kg</p>
          <p className="text-sm font-bold text-forest-800">{formatCurrency(pricePerKg, currency)}/kg</p>
        </div>
      )}
      {showUnitPrice && (
        <div>
          <p className="text-xs text-forest-600 font-medium">Price per {unit}</p>
          <p className="text-sm font-bold text-forest-800">{formatCurrency(unitPrice, currency)}/{unit}</p>
        </div>
      )}
    </div>
  )
}

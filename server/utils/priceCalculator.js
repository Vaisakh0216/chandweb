/**
 * Price calculation utilities
 * Converts quantities to kg and calculates price per kg
 */

const UNIT_TO_KG = {
  kg: 1,
  grams: 1 / 1000,
  gm: 1 / 1000,
  tonnes: 1000,
};

const WEIGHT_UNITS = ['kg', 'grams', 'gm', 'tonnes'];
const VOLUME_UNITS = ['litres', 'ml'];
const COUNT_UNITS = ['pieces', 'boxes', 'nos', 'sample'];

/**
 * Calculate price-related fields given quantity, unit, and total price
 * @returns { pricePerKg, unitPrice, priceCalculationType }
 */
const calculatePrices = (quantity, unit, totalPrice) => {
  if (!quantity || !unit || !totalPrice || quantity <= 0 || totalPrice <= 0) {
    return { pricePerKg: null, unitPrice: null, priceCalculationType: 'not_applicable' };
  }

  const unitPrice = totalPrice / quantity;

  if (WEIGHT_UNITS.includes(unit)) {
    const quantityInKg = quantity * UNIT_TO_KG[unit];
    const pricePerKg = totalPrice / quantityInKg;
    return {
      pricePerKg: parseFloat(pricePerKg.toFixed(4)),
      unitPrice: parseFloat(unitPrice.toFixed(4)),
      priceCalculationType: 'per_kg',
    };
  }

  // Litres, ml, pieces, boxes, nos, sample
  return {
    pricePerKg: null,
    unitPrice: parseFloat(unitPrice.toFixed(4)),
    priceCalculationType: 'per_unit',
  };
};

/**
 * Convert any quantity to kg equivalent (returns null for non-weight units)
 */
const toKg = (quantity, unit) => {
  if (!WEIGHT_UNITS.includes(unit)) return null;
  return quantity * UNIT_TO_KG[unit];
};

/**
 * Format price with currency symbol
 */
const formatPrice = (price, currency = 'INR') => {
  if (price === null || price === undefined) return '—';
  const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
  const symbol = symbols[currency] || currency + ' ';
  return `${symbol}${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

/**
 * Compare two price records and return difference data
 */
const comparePrices = (current, previous) => {
  // Only compare same currency
  if (current.currency !== previous.currency) {
    return { comparable: false, reason: 'Different currencies' };
  }

  const usePricePerKg =
    current.priceCalculationType === 'per_kg' && previous.priceCalculationType === 'per_kg';

  const currentRate = usePricePerKg ? current.pricePerKg : current.unitPrice;
  const previousRate = usePricePerKg ? previous.pricePerKg : previous.unitPrice;

  if (!currentRate || !previousRate) {
    return { comparable: false, reason: 'Insufficient price data' };
  }

  const difference = currentRate - previousRate;
  const percentageChange = ((difference / previousRate) * 100);
  const direction = difference > 0 ? 'increase' : difference < 0 ? 'decrease' : 'unchanged';

  return {
    comparable: true,
    metric: usePricePerKg ? 'per_kg' : 'per_unit',
    currentRate,
    previousRate,
    difference: parseFloat(difference.toFixed(4)),
    percentageChange: parseFloat(percentageChange.toFixed(2)),
    direction,
  };
};

module.exports = { calculatePrices, toKg, formatPrice, comparePrices, WEIGHT_UNITS, VOLUME_UNITS, COUNT_UNITS };

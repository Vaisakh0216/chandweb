// Unit to kg conversion factors
const UNIT_TO_KG = { kg: 1, grams: 1 / 1000, gm: 1 / 1000, tonnes: 1000 }
const WEIGHT_UNITS = ['kg', 'grams', 'gm', 'tonnes']

export const calculatePrices = (quantity, unit, totalPrice) => {
  if (!quantity || !unit || !totalPrice || quantity <= 0 || totalPrice <= 0) {
    return { pricePerKg: null, unitPrice: null, priceCalculationType: 'not_applicable' }
  }
  const unitPrice = totalPrice / quantity
  if (WEIGHT_UNITS.includes(unit)) {
    const qtyInKg = quantity * UNIT_TO_KG[unit]
    return {
      pricePerKg: totalPrice / qtyInKg,
      unitPrice,
      priceCalculationType: 'per_kg',
    }
  }
  return { pricePerKg: null, unitPrice, priceCalculationType: 'per_unit' }
}

export const formatCurrency = (value, currency = 'INR') => {
  if (value === null || value === undefined || isNaN(value)) return '—'
  const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }
  const symbol = symbols[currency] || `${currency} `
  return `${symbol}${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

export const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const formatDateInput = (date) => {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0]
}

export const getStatusColor = (status) => {
  const map = {
    'Pending':            'status-pending',
    'Ordered':            'status-ordered',
    'Received':           'status-received',
    'Partially Received': 'status-partial',
    'Cancelled':          'status-cancelled',
    'On Hold':            'status-on-hold',
    'Sample':             'status-sample',
    'Awaiting':           'status-pending',
    'In Transit':         'status-ordered',
    'Returned':           'status-cancelled',
    'Approved':           'status-received',
    'Rejected':           'status-cancelled',
    'Pending Inspection': 'status-pending',
    'Conditional Approval': 'status-partial',
    'Awaiting Video':     'status-on-hold',
    'Refund Due':         'status-pending',
    'Refunded':           'status-received',
    'Unpaid':             'status-pending',
    'Paid':               'status-received',
    'Awaiting Packing':   'status-pending',
    'Packing':            'status-ordered',
    'Packed':             'status-partial',
    'Completed':          'status-received',
  }
  return map[status] || 'status-on-hold'
}

export const UNITS = ['kg', 'grams', 'gm', 'tonnes', 'litres', 'ml', 'pieces', 'boxes', 'nos', 'sample']
export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP']

export const INDENT_STATUSES = ['Pending', 'Ordered', 'Partially Received', 'Received', 'Cancelled', 'On Hold']
export const PROCUREMENT_STATUSES = ['Ordered', 'Pending', 'Partially Received', 'Received', 'Cancelled', 'Sample']
export const DELIVERY_STATUSES = ['Awaiting', 'In Transit', 'Received', 'Partially Received', 'Returned']
export const QUALITY_STATUSES = ['Pending Inspection', 'Approved', 'Rejected', 'Conditional Approval']
export const INFLUENCER_PLATFORMS = ['Instagram', 'YouTube', 'Facebook', 'X', 'Other']
export const REFUND_STATUSES = ['Awaiting Video', 'Refund Due', 'Refunded']
export const PACKING_UNITS = ['nos', 'pieces', 'boxes', 'cartons', 'packs']
export const PACKING_BATCH_STATUSES = ['Awaiting Packing', 'Packing', 'Packed', 'Completed']

export const formatCount = (n) => Number(n || 0).toLocaleString('en-IN')

const mongoose = require('mongoose');

// Purchase Order / Procurement Record
// Mirrors the "My Orders" sheet
const procurementSchema = new mongoose.Schema({
  // Link to the indent that generated this order
  indentRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Indent',
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  intendedDate: {
    type: Date, // Date material is required for production
  },
  expectedDeliveryDate: {
    type: Date,
  },
  productCode: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [50, 'Product code cannot exceed 50 characters'],
  },
  productName: {
    type: String,
    required: [true, 'Product/RM name is required'],
    trim: true,
    maxlength: [300, 'Product name cannot exceed 300 characters'],
  },
  productDescription: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },
  // Vendor reference + snapshot
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
  },
  vendorSnapshot: {
    name: String,
    contactPerson: String,
    phone: String,
    email: String,
  },
  quantity: {
    type: Number,
    min: [0, 'Quantity cannot be negative'],
  },
  unit: {
    type: String,
    enum: ['kg', 'grams', 'tonnes', 'litres', 'pieces', 'boxes', 'ml', 'nos', 'gm', 'sample'],
    default: 'kg',
  },
  totalPrice: {
    type: Number,
    min: [0, 'Price cannot be negative'],
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
    maxlength: 3,
  },
  // Auto-calculated fields (set by backend)
  pricePerKg: {
    type: Number,
    min: 0,
  },
  unitPrice: {
    type: Number, // Price per unit (for non-weight items)
    min: 0,
  },
  priceCalculationType: {
    type: String,
    enum: ['per_kg', 'per_unit', 'not_applicable'],
    default: 'per_kg',
  },
  status: {
    type: String,
    enum: ['Ordered', 'Pending', 'Partially Received', 'Received', 'Cancelled', 'Sample'],
    default: 'Ordered',
  },
  // Quantity received so far (used for "Partially Received")
  receivedQuantity: {
    type: Number,
    min: [0, 'Received quantity cannot be negative'],
    default: 0,
  },
  deliveryStatus: {
    type: String,
    enum: ['Awaiting', 'In Transit', 'Received', 'Partially Received', 'Returned'],
    default: 'Awaiting',
  },
  poReference: {
    type: String,
    trim: true,
    maxlength: [100, 'PO reference cannot exceed 100 characters'],
  },
  // Response / remarks from vendor (from "RESPONSE" column)
  vendorResponse: {
    type: String,
    trim: true,
    maxlength: [2000, 'Response cannot exceed 2000 characters'],
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot exceed 2000 characters'],
  },
  // Who placed this order (MATHANGI, ABDUL, etc.)
  orderedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  orderedByName: { type: String, trim: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Link to goods receipt when received
  goodsReceiptRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GoodsReceipt',
  },
}, { timestamps: true });

// Indexes
procurementSchema.index({ productCode: 1, orderDate: -1 });
procurementSchema.index({ vendor: 1 });
procurementSchema.index({ status: 1 });
procurementSchema.index({ orderDate: -1 });
procurementSchema.index({ productName: 'text', productCode: 'text' });

module.exports = mongoose.model('Procurement', procurementSchema);

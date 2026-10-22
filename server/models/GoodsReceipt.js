const mongoose = require('mongoose');

// Goods Receipt — mirrors "Goods Receiving Data" sheet
const goodsReceiptSchema = new mongoose.Schema({
  // Link to procurement order
  procurement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Procurement',
  },
  receivedDate: {
    type: Date,
    required: [true, 'Received date is required'],
    default: Date.now,
  },
  productCode: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [50, 'Product code cannot exceed 50 characters'],
  },
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [300, 'Product name cannot exceed 300 characters'],
  },
  // Vendor snapshot
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
  invoiceNo: {
    type: String,
    trim: true,
    maxlength: [100, 'Invoice number cannot exceed 100 characters'],
  },
  invoiceDate: {
    type: Date,
  },
  receivedQuantity: {
    type: Number,
    required: [true, 'Received quantity is required'],
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
  // Calculated fields
  ratePerUnit: {
    type: Number,
    min: 0,
  },
  pricePerKg: {
    type: Number,
    min: 0,
  },
  priceCalculationType: {
    type: String,
    enum: ['per_kg', 'per_unit', 'not_applicable'],
    default: 'per_kg',
  },
  // Quality check / inspection
  qualityStatus: {
    type: String,
    enum: ['Pending Inspection', 'Approved', 'Rejected', 'Conditional Approval'],
    default: 'Pending Inspection',
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot exceed 2000 characters'],
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  receivedByName: { type: String, trim: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

// Indexes for price history queries
goodsReceiptSchema.index({ productCode: 1, receivedDate: -1 });
goodsReceiptSchema.index({ vendor: 1, receivedDate: -1 });
goodsReceiptSchema.index({ receivedDate: -1 });
goodsReceiptSchema.index({ productName: 'text', productCode: 'text', invoiceNo: 'text' });

module.exports = mongoose.model('GoodsReceipt', goodsReceiptSchema);

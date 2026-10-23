const mongoose = require('mongoose');

// Procurement Indent (planning what needs to be ordered)
// Mirrors the "Procurement Indent Status File" sheet
const indentSchema = new mongoose.Schema({
  indentDate: {
    type: Date,
    required: [true, 'Indent date is required'],
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
    required: [true, 'Product/RM name is required'],
    trim: true,
    maxlength: [300, 'Product name cannot exceed 300 characters'],
  },
  productDescription: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },
  qtyToBeOrdered: {
    type: Number,
    min: [0, 'Quantity cannot be negative'],
  },
  unit: {
    type: String,
    enum: ['kg', 'grams', 'tonnes', 'litres', 'pieces', 'boxes', 'ml', 'nos', 'gm', 'sample'],
    default: 'kg',
  },
  // Primary vendor
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
  },
  vendorName: { type: String, trim: true }, // Snapshot for history
  // Alternative vendor text (free text from sheet)
  vendorAlternate: { type: String, trim: true },
  status: {
    type: String,
    enum: ['Pending', 'Ordered', 'Partially Received', 'Received', 'Cancelled', 'On Hold'],
    default: 'Pending',
  },
  // Synced from the linked purchase order
  receivedQuantity: {
    type: Number,
    min: [0, 'Received quantity cannot be negative'],
    default: 0,
  },
  // CNS Remarks from the sheet
  cnsRemarks: {
    type: String,
    trim: true,
    maxlength: [2000, 'Remarks cannot exceed 2000 characters'],
  },
  contactNo: {
    type: String,
    trim: true,
  },
  // Reference to the actual purchase order created
  purchaseOrderRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Procurement',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  assignedToName: { type: String, trim: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot exceed 2000 characters'],
  },
}, { timestamps: true });

// Indexes
indentSchema.index({ productCode: 1 });
indentSchema.index({ indentDate: -1 });
indentSchema.index({ status: 1 });
indentSchema.index({ productName: 'text', productCode: 'text' });

module.exports = mongoose.model('Indent', indentSchema);

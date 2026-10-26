const mongoose = require('mongoose');

// Packing material stock — mirrors the PMST stock sheet
const packingMaterialSchema = new mongoose.Schema({
  storeCode: { type: String, trim: true, maxlength: [20, 'Store code cannot exceed 20 characters'] },
  storeName: { type: String, trim: true, maxlength: [100, 'Store name cannot exceed 100 characters'] },
  brand: { type: String, trim: true, maxlength: [200, 'Brand cannot exceed 200 characters'] },
  department: { type: String, trim: true, uppercase: true, maxlength: [100, 'Department cannot exceed 100 characters'] },
  // "Class" column in the sheet (GLASS, PET, SCREW CAP...)
  materialClass: { type: String, trim: true, uppercase: true, maxlength: [100, 'Class cannot exceed 100 characters'] },
  productCode: {
    type: String,
    required: [true, 'Product code is required'],
    trim: true,
    uppercase: true,
    unique: true,
    maxlength: [50, 'Product code cannot exceed 50 characters'],
  },
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [300, 'Product name cannot exceed 300 characters'],
  },
  availableStock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative'],
  },
  unit: {
    type: String,
    enum: ['kg', 'grams', 'tonnes', 'litres', 'pieces', 'boxes', 'ml', 'nos', 'gm', 'sample'],
    default: 'nos',
  },
  mrp: { type: Number, min: [0, 'MRP cannot be negative'] },
  // Flag the item as low stock at or below this level (0 = no alert)
  reorderLevel: { type: Number, default: 0, min: [0, 'Reorder level cannot be negative'] },
  lastReceiveDate: Date,
  lastIssueDate: Date,
  isActive: { type: Boolean, default: true },
  notes: { type: String, trim: true, maxlength: [1000, 'Notes cannot exceed 1000 characters'] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Items at or below their reorder level (only those that have one set)
packingMaterialSchema.statics.LOW_STOCK = {
  $expr: { $and: [{ $gt: ['$reorderLevel', 0] }, { $lte: ['$availableStock', '$reorderLevel'] }] },
};

packingMaterialSchema.index({ department: 1, materialClass: 1 });
packingMaterialSchema.index({ productName: 'text', productCode: 'text', brand: 'text' });

module.exports = mongoose.model('PackingMaterial', packingMaterialSchema);

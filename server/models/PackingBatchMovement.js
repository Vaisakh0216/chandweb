const mongoose = require('mongoose');

// Every count change on a packing batch:
//   Received    — units handed over from production   (+receivedQty)
//   Packed      — units packed by an employee         (+packedQty, +rejectedQty)
//   Transferred — packed units sent to the warehouse  (+transferredQty)
const packingBatchMovementSchema = new mongoose.Schema({
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PackingBatch',
    required: true,
  },
  type: {
    type: String,
    enum: ['Received', 'Packed', 'Transferred'],
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  // Units received / packed (good) / transferred
  quantity: {
    type: Number,
    required: true,
    min: [0, 'Quantity cannot be negative'],
  },
  // Packed entries only: units damaged or rejected while packing
  rejectedQty: {
    type: Number,
    default: 0,
    min: [0, 'Rejected quantity cannot be negative'],
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  employeeName: { type: String, trim: true },
  // Transferred entries only
  warehouse: {
    type: String,
    trim: true,
    maxlength: [100, 'Warehouse cannot exceed 100 characters'],
  },
  receivedBy: {
    type: String,
    trim: true,
    maxlength: [100, 'Received by cannot exceed 100 characters'],
  },
  // Transfer note / production slip number etc.
  reference: {
    type: String,
    trim: true,
    maxlength: [200, 'Reference cannot exceed 200 characters'],
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String, trim: true },
}, { timestamps: true });

packingBatchMovementSchema.index({ batch: 1, date: -1 });
packingBatchMovementSchema.index({ type: 1, date: -1 });
packingBatchMovementSchema.index({ employee: 1, date: -1 });

module.exports = mongoose.model('PackingBatchMovement', packingBatchMovementSchema);

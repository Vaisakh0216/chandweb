const mongoose = require('mongoose');

const PACKING_UNITS = ['nos', 'pieces', 'boxes', 'cartons', 'packs'];

// A lot of finished product handed over from production to packing,
// then packed and transferred to the warehouse.
// Counts are only changed through PackingBatchMovement entries, so that:
//   packedQty + rejectedQty <= receivedQty   and   transferredQty <= packedQty
const packingBatchSchema = new mongoose.Schema({
  batchNo: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    unique: true,
    maxlength: [50, 'Batch number cannot exceed 50 characters'],
  },
  // Production's own batch / lot reference
  productionBatchNo: {
    type: String,
    trim: true,
    maxlength: [100, 'Production batch number cannot exceed 100 characters'],
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
  unit: {
    type: String,
    enum: PACKING_UNITS,
    default: 'nos',
  },
  receivedQty: { type: Number, default: 0, min: 0 },
  packedQty: { type: Number, default: 0, min: 0 },
  rejectedQty: { type: Number, default: 0, min: 0 },
  transferredQty: { type: Number, default: 0, min: 0 },
  receivedDate: Date,
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Status is derived from the counts so it can never disagree with them
const STATUS_EXPR = {
  $switch: {
    branches: [
      { case: { $eq: [{ $add: ['$packedQty', '$rejectedQty'] }, 0] }, then: 'Awaiting Packing' },
      { case: { $lt: [{ $add: ['$packedQty', '$rejectedQty'] }, '$receivedQty'] }, then: 'Packing' },
      { case: { $lt: ['$transferredQty', '$packedQty'] }, then: 'Packed' },
    ],
    default: 'Completed',
  },
};

const statusOf = ({ receivedQty, packedQty, rejectedQty, transferredQty }) => {
  const done = packedQty + rejectedQty;
  if (done === 0) return 'Awaiting Packing';
  if (done < receivedQty) return 'Packing';
  if (transferredQty < packedQty) return 'Packed';
  return 'Completed';
};

packingBatchSchema.virtual('pendingPackingQty').get(function () {
  return this.receivedQty - this.packedQty - this.rejectedQty;
});
packingBatchSchema.virtual('inHandQty').get(function () {
  return this.packedQty - this.transferredQty;
});
packingBatchSchema.virtual('status').get(function () {
  return statusOf(this);
});

packingBatchSchema.statics.STATUS_EXPR = STATUS_EXPR;
packingBatchSchema.statics.statusOf = statusOf;
packingBatchSchema.statics.UNITS = PACKING_UNITS;

packingBatchSchema.index({ receivedDate: -1 });
packingBatchSchema.index({ productCode: 1 });

module.exports = mongoose.model('PackingBatch', packingBatchSchema);

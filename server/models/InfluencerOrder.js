const mongoose = require('mongoose');

// A customer order attributed to an influencer's video.
// The influencer earns commissionRate % of the order amount.
const influencerOrderSchema = new mongoose.Schema({
  influencer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Influencer',
    required: [true, 'Influencer is required'],
  },
  // The purchase whose video drove this order
  purchase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InfluencerPurchase',
    required: [true, 'Video / purchase is required'],
  },
  orderDate: {
    type: Date,
    required: [true, 'Order date is required'],
    default: Date.now,
  },
  orderNo: {
    type: String,
    trim: true,
    maxlength: [100, 'Order number cannot exceed 100 characters'],
  },
  customerName: {
    type: String,
    trim: true,
    maxlength: [200, 'Customer name cannot exceed 200 characters'],
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
  quantity: {
    type: Number,
    min: [1, 'Quantity must be at least 1'],
    default: 1,
  },
  orderAmount: {
    type: Number,
    required: [true, 'Order amount is required'],
    min: [0, 'Amount cannot be negative'],
  },
  // Snapshot of the influencer's rate when the order was recorded
  commissionRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  commissionAmount: {
    type: Number,
    min: 0,
  },
  commissionStatus: {
    type: String,
    enum: ['Unpaid', 'Paid'],
    default: 'Unpaid',
  },
  commissionPaidDate: Date,
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

influencerOrderSchema.pre('save', function () {
  this.commissionAmount = parseFloat(((this.orderAmount * this.commissionRate) / 100).toFixed(2));
});

influencerOrderSchema.index({ influencer: 1, orderDate: -1 });
influencerOrderSchema.index({ purchase: 1 });

module.exports = mongoose.model('InfluencerOrder', influencerOrderSchema);

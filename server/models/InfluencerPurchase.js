const mongoose = require('mongoose');

// A product an influencer buys to feature in a video.
// The purchase amount is refunded once the video is posted.
const influencerPurchaseSchema = new mongoose.Schema({
  influencer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Influencer',
    required: [true, 'Influencer is required'],
  },
  purchaseDate: {
    type: Date,
    required: [true, 'Purchase date is required'],
    default: Date.now,
  },
  orderNo: {
    type: String,
    trim: true,
    maxlength: [100, 'Order number cannot exceed 100 characters'],
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
  amount: {
    type: Number,
    required: [true, 'Purchase amount is required'],
    min: [0, 'Amount cannot be negative'],
  },
  videoUrl: {
    type: String,
    trim: true,
    maxlength: [500, 'Video URL cannot exceed 500 characters'],
  },
  videoPostedDate: Date,
  refundStatus: {
    type: String,
    enum: ['Awaiting Video', 'Refund Due', 'Refunded'],
    default: 'Awaiting Video',
  },
  refundAmount: {
    type: Number,
    min: [0, 'Refund cannot be negative'],
  },
  refundDate: Date,
  refundReference: {
    type: String,
    trim: true,
    maxlength: [100, 'Refund reference cannot exceed 100 characters'],
  },
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

influencerPurchaseSchema.index({ influencer: 1, purchaseDate: -1 });
influencerPurchaseSchema.index({ refundStatus: 1 });

module.exports = mongoose.model('InfluencerPurchase', influencerPurchaseSchema);

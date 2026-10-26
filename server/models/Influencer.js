const mongoose = require('mongoose');

const influencerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Influencer name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters'],
  },
  handle: {
    type: String,
    trim: true,
    maxlength: [100, 'Handle cannot exceed 100 characters'],
  },
  platform: {
    type: String,
    enum: ['Instagram', 'YouTube', 'Facebook', 'X', 'Other'],
    default: 'Instagram',
  },
  followers: {
    type: Number,
    min: [0, 'Followers cannot be negative'],
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters'],
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },
  // Percentage of order value paid to the influencer for orders from their videos
  commissionRate: {
    type: Number,
    min: [0, 'Commission cannot be negative'],
    max: [100, 'Commission cannot exceed 100%'],
    default: 5,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

influencerSchema.index({ isActive: 1 });

module.exports = mongoose.model('Influencer', influencerSchema);

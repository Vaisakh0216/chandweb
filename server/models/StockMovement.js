const mongoose = require('mongoose');

// Every change to a packing material's stock, so the balance can be audited
const stockMovementSchema = new mongoose.Schema({
  material: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PackingMaterial',
    required: true,
  },
  productCode: { type: String, trim: true, uppercase: true },
  productName: { type: String, trim: true },
  type: {
    type: String,
    enum: ['Issue', 'Receive', 'Adjustment', 'Opening'],
    required: true,
  },
  // Signed change to stock: negative for Issue, positive for Receive
  change: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  // Where the stock went or came from (batch, production order, invoice no.)
  reference: { type: String, trim: true, maxlength: [200, 'Reference cannot exceed 200 characters'] },
  notes: { type: String, trim: true, maxlength: [1000, 'Notes cannot exceed 1000 characters'] },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String, trim: true },
}, { timestamps: true });

stockMovementSchema.index({ material: 1, date: -1 });
stockMovementSchema.index({ date: -1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);

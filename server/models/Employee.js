const mongoose = require('mongoose');

// Floor staff (packers etc.) — separate from app users, who need a login
const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Employee name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters'],
  },
  employeeCode: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [30, 'Employee code cannot exceed 30 characters'],
  },
  designation: {
    type: String,
    trim: true,
    default: 'Packer',
    maxlength: [100, 'Designation cannot exceed 100 characters'],
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters'],
  },
  joinedDate: Date,
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

employeeSchema.index(
  { employeeCode: 1 },
  { unique: true, partialFilterExpression: { employeeCode: { $type: 'string', $gt: '' } } }
);
employeeSchema.index({ isActive: 1, name: 1 });

module.exports = mongoose.model('Employee', employeeSchema);

const mongoose = require('mongoose');

// Dashboard to-do item, visible to its creator and its assignee
const todoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task is required'],
    trim: true,
    maxlength: [300, 'Task cannot exceed 300 characters'],
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
  },
  dueDate: Date,
  priority: {
    type: String,
    enum: ['Low', 'Normal', 'High'],
    default: 'Normal',
  },
  done: { type: Boolean, default: false },
  doneAt: Date,
  doneByName: { type: String, trim: true },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

todoSchema.index({ createdBy: 1, done: 1 });
todoSchema.index({ assignedTo: 1, done: 1 });

module.exports = mongoose.model('Todo', todoSchema);

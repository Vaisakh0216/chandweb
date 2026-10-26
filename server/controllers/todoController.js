const Todo = require('../models/Todo');
const User = require('../models/User');

// Tasks the current user created or was assigned
const visibleTo = (userId) => ({ $or: [{ createdBy: userId }, { assignedTo: userId }] });

const PRIORITY_RANK = { High: 0, Normal: 1, Low: 2 };

// Adds what the current user may do with each task, so the client needn't compare ids
const withPermissions = (todo, userId) => {
  const obj = todo.toObject ? todo.toObject() : todo;
  const createdById = String(obj.createdBy?._id || obj.createdBy);
  return { ...obj, canDelete: createdById === String(userId) };
};

const populateUsers = (query) => query.populate('assignedTo', 'name').populate('createdBy', 'name');

// Checks the assignee exists and is active; returns an error message or null
const checkAssignee = async (assignedTo) => {
  if (!assignedTo) return null;
  const user = await User.findById(assignedTo).catch(() => null);
  return user && user.isActive ? null : 'Assigned user not found';
};

// @desc    Get my to-dos (open first by due date and priority, then recently completed)
// @route   GET /api/todos
// @access  Private
const getTodos = async (req, res, next) => {
  try {
    const mine = visibleTo(req.user.id);
    const [open, done, doneCount] = await Promise.all([
      populateUsers(Todo.find({ ...mine, done: false })),
      populateUsers(Todo.find({ ...mine, done: true }).sort({ doneAt: -1 }).limit(20)),
      Todo.countDocuments({ ...mine, done: true }),
    ]);

    // Dated tasks first (earliest due), then by priority, then newest
    open.sort((a, b) => {
      if (a.dueDate && b.dueDate && +a.dueDate !== +b.dueDate) return a.dueDate - b.dueDate;
      if (!!a.dueDate !== !!b.dueDate) return a.dueDate ? -1 : 1;
      if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      return b.createdAt - a.createdAt;
    });

    res.json({
      success: true,
      data: {
        open: open.map((t) => withPermissions(t, req.user.id)),
        done: done.map((t) => withPermissions(t, req.user.id)),
        doneCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    People a task can be assigned to
// @route   GET /api/todos/assignees
// @access  Private
const getAssignees = async (req, res, next) => {
  try {
    const users = await User.find({ isActive: true }).select('name').sort({ name: 1 });
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc    Create to-do
// @route   POST /api/todos
// @access  Private
const createTodo = async (req, res, next) => {
  try {
    const { title, notes, dueDate, priority, assignedTo } = req.body;
    const assigneeError = await checkAssignee(assignedTo);
    if (assigneeError) return res.status(400).json({ success: false, message: assigneeError });

    const todo = await Todo.create({
      title, notes, priority,
      dueDate: dueDate || undefined,
      assignedTo: assignedTo || undefined,
      createdBy: req.user.id,
    });
    const populated = await populateUsers(Todo.findById(todo._id));
    res.status(201).json({ success: true, data: withPermissions(populated, req.user.id) });
  } catch (error) {
    next(error);
  }
};

// @desc    Update to-do (edit details or tick it off)
// @route   PUT /api/todos/:id
// @access  Private (creator or assignee)
const updateTodo = async (req, res, next) => {
  try {
    const todo = await Todo.findOne({ _id: req.params.id, ...visibleTo(req.user.id) });
    if (!todo) return res.status(404).json({ success: false, message: 'Task not found' });

    const { title, notes, dueDate, priority, assignedTo, done } = req.body;
    if (assignedTo !== undefined) {
      const assigneeError = await checkAssignee(assignedTo);
      if (assigneeError) return res.status(400).json({ success: false, message: assigneeError });
      todo.assignedTo = assignedTo || undefined;
    }
    if (title !== undefined) todo.title = title;
    if (notes !== undefined) todo.notes = notes;
    if (priority !== undefined) todo.priority = priority;
    if (dueDate !== undefined) todo.dueDate = dueDate || undefined;
    if (done !== undefined && Boolean(done) !== todo.done) {
      todo.done = Boolean(done);
      todo.doneAt = todo.done ? new Date() : undefined;
      todo.doneByName = todo.done ? req.user.name : undefined;
    }

    await todo.save();
    const populated = await populateUsers(Todo.findById(todo._id));
    res.json({ success: true, data: withPermissions(populated, req.user.id) });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete to-do
// @route   DELETE /api/todos/:id
// @access  Private (creator)
const deleteTodo = async (req, res, next) => {
  try {
    const todo = await Todo.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!todo) {
      const exists = await Todo.exists({ _id: req.params.id, ...visibleTo(req.user.id) });
      return exists
        ? res.status(403).json({ success: false, message: 'Only the person who created this task can delete it' })
        : res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete my completed tasks
// @route   DELETE /api/todos/completed
// @access  Private
const clearCompleted = async (req, res, next) => {
  try {
    const { deletedCount } = await Todo.deleteMany({ createdBy: req.user.id, done: true });
    res.json({ success: true, data: { deleted: deletedCount } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTodos, getAssignees, createTodo, updateTodo, deleteTodo, clearCompleted };

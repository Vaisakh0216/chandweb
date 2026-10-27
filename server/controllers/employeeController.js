const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const PackingBatchMovement = require('../models/PackingBatchMovement');
const { dateRange } = require('../utils/dateRange');

const EMPLOYEE_FIELDS = ['name', 'employeeCode', 'designation', 'phone', 'joinedDate', 'notes', 'isActive'];

const pick = (body) => EMPLOYEE_FIELDS.reduce((acc, f) => {
  if (body[f] !== undefined) acc[f] = body[f] === '' ? undefined : body[f];
  return acc;
}, {});

// Packed / rejected counts per employee for a period, keyed by employee id
const packingTotals = async ({ employeeId, from, to } = {}) => {
  const match = { type: 'Packed' };
  if (employeeId) match.employee = new mongoose.Types.ObjectId(employeeId);
  const range = dateRange(from, to);
  if (range) match.date = range;

  const rows = await PackingBatchMovement.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$employee',
        packed: { $sum: '$quantity' },
        rejected: { $sum: '$rejectedQty' },
        entries: { $sum: 1 },
        batches: { $addToSet: '$batch' },
        lastPackedOn: { $max: '$date' },
      },
    },
    { $addFields: { batches: { $size: '$batches' } } },
  ]);
  return Object.fromEntries(rows.map(({ _id, ...t }) => [_id, t]));
};

const EMPTY_TOTALS = { packed: 0, rejected: 0, entries: 0, batches: 0, lastPackedOn: null };

// @desc    Employees with their packing counts for a period
// @route   GET /api/employees
// @access  Private
const getEmployees = async (req, res, next) => {
  try {
    const { search, isActive, from, to } = req.query;
    const query = {};
    if (search) {
      query.$or = ['name', 'employeeCode', 'phone', 'designation']
        .map(f => ({ [f]: { $regex: search, $options: 'i' } }));
    }
    if (isActive !== undefined && isActive !== '') query.isActive = isActive === 'true';

    const [employees, totals] = await Promise.all([
      Employee.find(query).sort({ isActive: -1, name: 1 }).lean(),
      packingTotals({ from, to }),
    ]);

    res.json({
      success: true,
      data: employees.map(e => ({ ...e, packing: totals[e._id] || EMPTY_TOTALS })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Active employees for dropdowns
// @route   GET /api/employees/dropdown
// @access  Private
const getEmployeesDropdown = async (req, res, next) => {
  try {
    const employees = await Employee.find({ isActive: true }, 'name employeeCode designation').sort({ name: 1 });
    res.json({ success: true, data: employees });
  } catch (error) {
    next(error);
  }
};

// @desc    One employee with packing totals and a day-by-day breakdown
// @route   GET /api/employees/:id
// @access  Private
const getEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id).lean();
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const { from, to } = req.query;
    const match = { type: 'Packed', employee: employee._id };
    const range = dateRange(from, to);
    if (range) match.date = range;

    const [totals, daily] = await Promise.all([
      packingTotals({ employeeId: req.params.id, from, to }),
      PackingBatchMovement.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'Asia/Kolkata' } },
            packed: { $sum: '$quantity' },
            rejected: { $sum: '$rejectedQty' },
            entries: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 60 },
      ]),
    ]);

    res.json({
      success: true,
      data: { ...employee, packing: totals[req.params.id] || EMPTY_TOTALS, daily: daily.map(({ _id, ...d }) => ({ date: _id, ...d })) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    An employee's packing entries
// @route   GET /api/employees/:id/entries
// @access  Private
const getEmployeeEntries = async (req, res, next) => {
  try {
    const { from, to, page = 1, limit = 25 } = req.query;
    const query = { type: 'Packed', employee: req.params.id };
    const range = dateRange(from, to);
    if (range) query.date = range;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [entries, total] = await Promise.all([
      PackingBatchMovement.find(query)
        .populate('batch', 'batchNo productName productCode unit')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      PackingBatchMovement.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: entries,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create employee
// @route   POST /api/employees
// @access  Private (admin, manager)
const createEmployee = async (req, res, next) => {
  try {
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ success: false, message: 'Employee name is required' });
    }
    const employee = await Employee.create({ ...pick(req.body), createdBy: req.user.id });
    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private (admin, manager)
const updateEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    employee.set(pick(req.body));
    await employee.save();
    res.json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete employee (blocked once they have packing entries)
// @route   DELETE /api/employees/:id
// @access  Private/Admin
const deleteEmployee = async (req, res, next) => {
  try {
    const entries = await PackingBatchMovement.countDocuments({ employee: req.params.id });
    if (entries > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete — this employee has ${entries} packing entries. Deactivate instead.`,
      });
    }
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, message: 'Employee deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmployees, getEmployeesDropdown, getEmployee, getEmployeeEntries,
  createEmployee, updateEmployee, deleteEmployee,
};

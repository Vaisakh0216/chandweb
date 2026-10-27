const PackingBatch = require('../models/PackingBatch');
const PackingBatchMovement = require('../models/PackingBatchMovement');
const Employee = require('../models/Employee');
const { dateRange } = require('../utils/dateRange');

const { STATUS_EXPR } = PackingBatch;

// Whole-unit count from the request body: a non-negative integer, or null
const parseCount = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
};

const badRequest = (res, message) => res.status(400).json({ success: false, message });

// PB-YYYYMMDD-001, numbered per receive date
const nextBatchNo = async (date) => {
  const d = new Date(date);
  const prefix = `PB-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-`;
  const last = await PackingBatch.findOne({ batchNo: { $regex: `^${prefix}\\d+$` } }).sort({ batchNo: -1 }).select('batchNo');
  const seq = last ? parseInt(last.batchNo.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(3, '0')}`;
};

// Apply a count change only if `condition` still holds — a single atomic update
const changeCounts = (batchId, inc, condition = {}) =>
  PackingBatch.findOneAndUpdate({ _id: batchId, ...condition }, { $inc: inc }, { new: true });

// Record the movement for a count change; undo the change if the movement can't be saved
const recordMovement = async (batch, inc, data, req) => {
  try {
    return await PackingBatchMovement.create({ ...data, batch: batch._id, user: req.user.id, userName: req.user.name });
  } catch (error) {
    const undo = Object.fromEntries(Object.entries(inc).map(([k, v]) => [k, -v]));
    await PackingBatch.updateOne({ _id: batch._id }, { $inc: undo });
    throw error;
  }
};

const notFound = (res) => res.status(404).json({ success: false, message: 'Packing batch not found' });

// @desc    List packing batches
// @route   GET /api/packing-batches
// @access  Private
const getBatches = async (req, res, next) => {
  try {
    const { search, status, from, to, page = 1, limit = 25 } = req.query;
    const query = {};
    if (search) {
      query.$or = ['batchNo', 'productionBatchNo', 'productCode', 'productName']
        .map(f => ({ [f]: { $regex: search, $options: 'i' } }));
    }
    if (status) query.$expr = { $eq: [STATUS_EXPR, status] };
    const range = dateRange(from, to);
    if (range) query.receivedDate = range;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [batches, total] = await Promise.all([
      PackingBatch.find(query).sort({ receivedDate: -1, batchNo: -1 }).skip(skip).limit(parseInt(limit)),
      PackingBatch.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: batches,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Flow totals for a period and current balances
// @route   GET /api/packing-batches/summary
// @access  Private
const getSummary = async (req, res, next) => {
  try {
    const range = dateRange(req.query.from, req.query.to);
    const [flow, balances] = await Promise.all([
      PackingBatchMovement.aggregate([
        { $match: range ? { date: range } : {} },
        { $group: { _id: '$type', quantity: { $sum: '$quantity' }, rejected: { $sum: '$rejectedQty' }, entries: { $sum: 1 } } },
      ]),
      PackingBatch.aggregate([
        {
          $group: {
            _id: STATUS_EXPR,
            batches: { $sum: 1 },
            pendingPacking: { $sum: { $subtract: ['$receivedQty', { $add: ['$packedQty', '$rejectedQty'] }] } },
            inHand: { $sum: { $subtract: ['$packedQty', '$transferredQty'] } },
          },
        },
      ]),
    ]);

    const byType = Object.fromEntries(flow.map(f => [f._id, f]));
    const byStatus = Object.fromEntries(balances.map(b => [b._id, b.batches]));
    res.json({
      success: true,
      data: {
        period: {
          received: byType.Received?.quantity || 0,
          packed: byType.Packed?.quantity || 0,
          rejected: byType.Packed?.rejected || 0,
          transferred: byType.Transferred?.quantity || 0,
          packingEntries: byType.Packed?.entries || 0,
        },
        current: {
          pendingPacking: balances.reduce((s, b) => s + b.pendingPacking, 0),
          inHand: balances.reduce((s, b) => s + b.inHand, 0),
          batchesByStatus: byStatus,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    One batch with its movements and per-employee packing
// @route   GET /api/packing-batches/:id
// @access  Private
const getBatch = async (req, res, next) => {
  try {
    const batch = await PackingBatch.findById(req.params.id);
    if (!batch) return notFound(res);

    const [movements, packers] = await Promise.all([
      PackingBatchMovement.find({ batch: batch._id }).populate('employee', 'name employeeCode').sort({ date: -1, createdAt: -1 }),
      PackingBatchMovement.aggregate([
        { $match: { batch: batch._id, type: 'Packed' } },
        { $group: { _id: '$employee', name: { $last: '$employeeName' }, packed: { $sum: '$quantity' }, rejected: { $sum: '$rejectedQty' }, entries: { $sum: 1 } } },
        { $sort: { packed: -1 } },
      ]),
    ]);

    res.json({ success: true, data: { ...batch.toJSON(), movements, packers } });
  } catch (error) {
    next(error);
  }
};

// @desc    Receive a new batch from production
// @route   POST /api/packing-batches
// @access  Private (admin, manager)
const createBatch = async (req, res, next) => {
  try {
    const { productCode, productName, unit, productionBatchNo, notes, reference } = req.body;
    const qty = parseCount(req.body.quantity);
    if (!productName || !productName.trim()) return badRequest(res, 'Product name is required');
    if (!qty) return badRequest(res, 'Enter the number of units received from production (a whole number above 0)');

    const date = req.body.date || new Date();
    const fields = { productCode, productName, unit, productionBatchNo, notes, receivedQty: qty, receivedDate: date, createdBy: req.user.id };

    // Auto-numbered unless the user gave a batch number; retry if two batches race for the same number
    let batch;
    for (let attempt = 0; !batch; attempt++) {
      try {
        batch = await PackingBatch.create({ ...fields, batchNo: req.body.batchNo?.trim() || await nextBatchNo(date) });
      } catch (error) {
        if (error.code !== 11000 || req.body.batchNo?.trim() || attempt >= 4) throw error;
      }
    }

    try {
      await PackingBatchMovement.create({
        batch: batch._id, type: 'Received', date, quantity: qty, reference, notes,
        user: req.user.id, userName: req.user.name,
      });
    } catch (error) {
      await PackingBatch.deleteOne({ _id: batch._id });
      throw error;
    }

    res.status(201).json({ success: true, data: batch });
  } catch (error) {
    next(error);
  }
};

// @desc    Update batch details (counts change only through movements)
// @route   PUT /api/packing-batches/:id
// @access  Private (admin, manager)
const updateBatch = async (req, res, next) => {
  try {
    const { productCode, productName, unit, productionBatchNo, notes } = req.body;
    const batch = await PackingBatch.findById(req.params.id);
    if (!batch) return notFound(res);

    batch.set({ productCode, productName, unit, productionBatchNo, notes });
    await batch.save();
    res.json({ success: true, data: batch });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a batch that has not been packed yet
// @route   DELETE /api/packing-batches/:id
// @access  Private/Admin
const deleteBatch = async (req, res, next) => {
  try {
    const batch = await PackingBatch.findOneAndDelete({ _id: req.params.id, packedQty: 0, rejectedQty: 0, transferredQty: 0 });
    if (!batch) {
      if (!await PackingBatch.exists({ _id: req.params.id })) return notFound(res);
      return badRequest(res, 'Cannot delete — this batch already has packing or warehouse entries. Remove those first.');
    }
    await PackingBatchMovement.deleteMany({ batch: batch._id });
    res.json({ success: true, message: 'Packing batch deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Receive more units from production into an existing batch
// @route   POST /api/packing-batches/:id/receive
// @access  Private (admin, manager)
const receiveMore = async (req, res, next) => {
  try {
    const qty = parseCount(req.body.quantity);
    if (!qty) return badRequest(res, 'Enter the number of units received (a whole number above 0)');

    const inc = { receivedQty: qty };
    const batch = await changeCounts(req.params.id, inc);
    if (!batch) return notFound(res);

    const { date, reference, notes } = req.body;
    await recordMovement(batch, inc, { type: 'Received', date: date || new Date(), quantity: qty, reference, notes }, req);
    res.json({ success: true, data: batch });
  } catch (error) {
    next(error);
  }
};

// @desc    Record units packed (and rejected) by an employee
// @route   POST /api/packing-batches/:id/pack
// @access  Private (admin, manager)
const recordPacking = async (req, res, next) => {
  try {
    const packed = parseCount(req.body.packedQty ?? 0);
    const rejected = parseCount(req.body.rejectedQty ?? 0);
    if (packed === null || rejected === null) return badRequest(res, 'Counts must be whole numbers, 0 or more');
    if (packed + rejected === 0) return badRequest(res, 'Enter the packed or rejected count');
    if (!req.body.employee) return badRequest(res, 'Select the employee who packed');

    const employee = await Employee.findById(req.body.employee);
    if (!employee) return badRequest(res, 'Employee not found');
    if (!employee.isActive) return badRequest(res, `${employee.name} is inactive`);

    const inc = { packedQty: packed, rejectedQty: rejected };
    const batch = await changeCounts(req.params.id, inc, {
      $expr: { $lte: [{ $add: ['$packedQty', '$rejectedQty', packed + rejected] }, '$receivedQty'] },
    });
    if (!batch) {
      const existing = await PackingBatch.findById(req.params.id);
      if (!existing) return notFound(res);
      return badRequest(res, `Only ${existing.pendingPackingQty} ${existing.unit} left to pack in this batch — you entered ${packed + rejected} (packed + rejected)`);
    }

    const { date, notes } = req.body;
    await recordMovement(batch, inc, {
      type: 'Packed', date: date || new Date(), quantity: packed, rejectedQty: rejected,
      employee: employee._id, employeeName: employee.name, notes,
    }, req);
    res.json({ success: true, data: batch });
  } catch (error) {
    next(error);
  }
};

// @desc    Transfer packed units to the warehouse
// @route   POST /api/packing-batches/:id/transfer
// @access  Private (admin, manager)
const transferToWarehouse = async (req, res, next) => {
  try {
    const qty = parseCount(req.body.quantity);
    if (!qty) return badRequest(res, 'Enter the number of units transferred (a whole number above 0)');
    const warehouse = (req.body.warehouse || '').trim();
    if (!warehouse) return badRequest(res, 'Warehouse is required');

    const inc = { transferredQty: qty };
    const batch = await changeCounts(req.params.id, inc, {
      $expr: { $lte: [{ $add: ['$transferredQty', qty] }, '$packedQty'] },
    });
    if (!batch) {
      const existing = await PackingBatch.findById(req.params.id);
      if (!existing) return notFound(res);
      return badRequest(res, `Only ${existing.inHandQty} packed ${existing.unit} are available to transfer — you entered ${qty}`);
    }

    const { date, reference, receivedBy, notes } = req.body;
    await recordMovement(batch, inc, {
      type: 'Transferred', date: date || new Date(), quantity: qty, warehouse, reference, receivedBy, notes,
    }, req);
    res.json({ success: true, data: batch });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a movement and reverse its counts (blocked if later steps depend on it)
// @route   DELETE /api/packing-batches/movements/:movementId
// @access  Private/Admin
const deleteMovement = async (req, res, next) => {
  try {
    // Claim the movement first so two deletes can't both reverse it
    const movement = await PackingBatchMovement.findByIdAndDelete(req.params.movementId);
    if (!movement) return res.status(404).json({ success: false, message: 'Entry not found' });

    let inc;
    let condition = {};
    let blocked;
    if (movement.type === 'Received') {
      inc = { receivedQty: -movement.quantity };
      condition = { $expr: { $gte: [{ $subtract: ['$receivedQty', movement.quantity] }, { $add: ['$packedQty', '$rejectedQty'] }] } };
      blocked = 'those units have already been packed';
    } else if (movement.type === 'Packed') {
      inc = { packedQty: -movement.quantity, rejectedQty: -movement.rejectedQty };
      condition = { $expr: { $gte: [{ $subtract: ['$packedQty', movement.quantity] }, '$transferredQty'] } };
      blocked = 'those packed units have already been transferred to the warehouse';
    } else {
      inc = { transferredQty: -movement.quantity };
    }

    const batch = await changeCounts(movement.batch, inc, condition);
    if (!batch) {
      await PackingBatchMovement.create(movement.toObject());
      return badRequest(res, `Cannot remove this entry — ${blocked}. Remove the later entries first.`);
    }

    res.json({ success: true, data: batch });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBatches, getSummary, getBatch, createBatch, updateBatch, deleteBatch,
  receiveMore, recordPacking, transferToWarehouse, deleteMovement,
};

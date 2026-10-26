const PackingMaterial = require('../models/PackingMaterial');
const StockMovement = require('../models/StockMovement');

const { LOW_STOCK } = PackingMaterial;

const round = (n) => Math.round(n * 1000) / 1000;

const logMovement = (material, type, change, req, extra = {}) => StockMovement.create({
  material: material._id,
  productCode: material.productCode,
  productName: material.productName,
  type,
  change: round(change),
  balanceAfter: material.availableStock,
  date: extra.date || Date.now(),
  reference: extra.reference,
  notes: extra.notes,
  user: req.user.id,
  userName: req.user.name,
});

// Accepts a positive quantity from the request body, or returns null
const parseQty = (value) => {
  const qty = parseFloat(value);
  return qty > 0 ? round(qty) : null;
};

// @desc    Get packing materials
// @route   GET /api/packing-materials
// @access  Private
const getPackingMaterials = async (req, res, next) => {
  try {
    const { search, department, materialClass, stockStatus, page = 1, limit = 50, sort = 'productCode' } = req.query;
    const query = { isActive: true };

    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { productCode: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }
    if (department) query.department = department;
    if (materialClass) query.materialClass = materialClass;
    if (stockStatus === 'out') query.availableStock = { $lte: 0 };
    if (stockStatus === 'low') Object.assign(query, { availableStock: { $gt: 0 } }, LOW_STOCK);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [materials, total] = await Promise.all([
      PackingMaterial.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
      PackingMaterial.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: materials,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Stock summary and filter options
// @route   GET /api/packing-materials/summary
// @access  Private
const getSummary = async (req, res, next) => {
  try {
    const active = { isActive: true };
    const [totalItems, lowStock, outOfStock, departments, classes] = await Promise.all([
      PackingMaterial.countDocuments(active),
      PackingMaterial.countDocuments({ ...active, availableStock: { $gt: 0 }, ...LOW_STOCK }),
      PackingMaterial.countDocuments({ ...active, availableStock: { $lte: 0 } }),
      PackingMaterial.distinct('department', active),
      PackingMaterial.distinct('materialClass', active),
    ]);
    res.json({
      success: true,
      data: {
        totalItems, lowStock, outOfStock,
        departments: departments.filter(Boolean).sort(),
        classes: classes.filter(Boolean).sort(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get one packing material with its stock history
// @route   GET /api/packing-materials/:id
// @access  Private
const getPackingMaterial = async (req, res, next) => {
  try {
    const material = await PackingMaterial.findById(req.params.id);
    if (!material) return res.status(404).json({ success: false, message: 'Packing material not found' });
    const movements = await StockMovement.find({ material: material._id }).sort({ date: -1, createdAt: -1 }).limit(200);
    res.json({ success: true, data: material, movements });
  } catch (error) {
    next(error);
  }
};

// @desc    Recent stock movements across all materials
// @route   GET /api/packing-materials/movements
// @access  Private
const getMovements = async (req, res, next) => {
  try {
    const { type, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
    const query = {};
    if (type) query.type = type;
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(`${dateTo}T23:59:59.999`);
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [movements, total] = await Promise.all([
      StockMovement.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      StockMovement.countDocuments(query),
    ]);
    res.json({
      success: true,
      data: movements,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create packing material
// @route   POST /api/packing-materials
// @access  Private (admin, manager)
const createPackingMaterial = async (req, res, next) => {
  try {
    const opening = parseFloat(req.body.availableStock) || 0;
    const material = await PackingMaterial.create({ ...req.body, availableStock: opening, createdBy: req.user.id });
    if (opening > 0) await logMovement(material, 'Opening', opening, req, { notes: 'Opening stock' });
    res.status(201).json({ success: true, data: material });
  } catch (error) {
    next(error);
  }
};

// @desc    Update packing material details (stock changes go through issue/receive/adjust)
// @route   PUT /api/packing-materials/:id
// @access  Private (admin, manager)
const updatePackingMaterial = async (req, res, next) => {
  try {
    const { availableStock: _stock, lastIssueDate: _li, ...rest } = req.body;
    const material = await PackingMaterial.findByIdAndUpdate(req.params.id, rest, { new: true, runValidators: true });
    if (!material) return res.status(404).json({ success: false, message: 'Packing material not found' });
    res.json({ success: true, data: material });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete packing material and its history
// @route   DELETE /api/packing-materials/:id
// @access  Private (admin)
const deletePackingMaterial = async (req, res, next) => {
  try {
    const material = await PackingMaterial.findByIdAndDelete(req.params.id);
    if (!material) return res.status(404).json({ success: false, message: 'Packing material not found' });
    await StockMovement.deleteMany({ material: material._id });
    res.json({ success: true, message: 'Packing material deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Use (issue) stock
// @route   POST /api/packing-materials/:id/issue
// @access  Private (admin, manager)
const issueStock = async (req, res, next) => {
  try {
    const qty = parseQty(req.body.quantity);
    if (!qty) return res.status(400).json({ success: false, message: 'Please enter a quantity greater than 0' });

    // Deduct only if enough stock is available, in a single atomic update
    const material = await PackingMaterial.findOneAndUpdate(
      { _id: req.params.id, availableStock: { $gte: qty } },
      { $inc: { availableStock: -qty }, lastIssueDate: req.body.date || Date.now() },
      { new: true }
    );

    if (!material) {
      const existing = await PackingMaterial.findById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, message: 'Packing material not found' });
      return res.status(400).json({
        success: false,
        message: `Not enough stock. Available: ${existing.availableStock} ${existing.unit}, requested: ${qty} ${existing.unit}`,
      });
    }

    await logMovement(material, 'Issue', -qty, req, req.body);
    res.json({ success: true, data: material });
  } catch (error) {
    next(error);
  }
};

// @desc    Receive stock
// @route   POST /api/packing-materials/:id/receive
// @access  Private (admin, manager)
const receiveStock = async (req, res, next) => {
  try {
    const qty = parseQty(req.body.quantity);
    if (!qty) return res.status(400).json({ success: false, message: 'Please enter a quantity greater than 0' });

    const material = await PackingMaterial.findByIdAndUpdate(
      req.params.id,
      { $inc: { availableStock: qty }, lastReceiveDate: req.body.date || Date.now() },
      { new: true }
    );
    if (!material) return res.status(404).json({ success: false, message: 'Packing material not found' });

    await logMovement(material, 'Receive', qty, req, req.body);
    res.json({ success: true, data: material });
  } catch (error) {
    next(error);
  }
};

// @desc    Set stock to a physical count
// @route   POST /api/packing-materials/:id/adjust
// @access  Private (admin, manager)
const adjustStock = async (req, res, next) => {
  try {
    const counted = parseFloat(req.body.countedStock);
    if (!(counted >= 0)) return res.status(400).json({ success: false, message: 'Please enter the counted stock (0 or more)' });

    const before = await PackingMaterial.findById(req.params.id);
    if (!before) return res.status(404).json({ success: false, message: 'Packing material not found' });

    // Only apply if stock hasn't changed since we read it, so a concurrent issue isn't lost
    const material = await PackingMaterial.findOneAndUpdate(
      { _id: before._id, availableStock: before.availableStock },
      { availableStock: round(counted) },
      { new: true }
    );
    if (!material) return res.status(409).json({ success: false, message: 'Stock changed while saving. Please refresh and try again.' });

    const change = material.availableStock - before.availableStock;
    if (change !== 0) await logMovement(material, 'Adjustment', change, req, { notes: req.body.notes || 'Physical stock count', date: req.body.date });
    res.json({ success: true, data: material });
  } catch (error) {
    next(error);
  }
};

// @desc    Import / update materials from the PMST sheet
// @route   POST /api/packing-materials/import
// @access  Private (admin, manager)
const importPackingMaterials = async (req, res, next) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No rows to import' });
    }

    const result = { created: 0, updated: 0, stockAdjusted: 0, errors: [] };
    const FIELDS = ['storeCode', 'storeName', 'brand', 'department', 'materialClass', 'productName', 'mrp', 'lastReceiveDate', 'unit'];

    for (const [i, row] of rows.entries()) {
      const rowNo = row.rowNumber || i + 2;
      try {
        const productCode = String(row.productCode || '').trim().toUpperCase();
        if (!productCode) throw new Error('Product code is missing');
        const stock = row.availableStock === '' || row.availableStock == null ? null : parseFloat(row.availableStock);
        if (stock !== null && !(stock >= 0)) throw new Error(`Invalid available stock "${row.availableStock}"`);

        const details = {};
        for (const f of FIELDS) if (row[f] !== undefined && row[f] !== '' && row[f] !== null) details[f] = row[f];

        const existing = await PackingMaterial.findOne({ productCode });
        if (!existing) {
          const material = await PackingMaterial.create({ ...details, productCode, availableStock: stock || 0, createdBy: req.user.id });
          if (material.availableStock > 0) await logMovement(material, 'Opening', material.availableStock, req, { notes: 'Imported from sheet' });
          result.created++;
          continue;
        }

        Object.assign(existing, details);
        const oldStock = existing.availableStock;
        if (stock !== null) existing.availableStock = round(stock);
        await existing.save();
        result.updated++;
        if (stock !== null && existing.availableStock !== oldStock) {
          await logMovement(existing, 'Adjustment', existing.availableStock - oldStock, req, { notes: 'Stock updated from sheet import' });
          result.stockAdjusted++;
        }
      } catch (err) {
        const message = err.name === 'ValidationError'
          ? Object.values(err.errors).map((e) => e.message).join(', ')
          : err.message;
        result.errors.push({ row: rowNo, productCode: row.productCode, message });
      }
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPackingMaterials, getSummary, getPackingMaterial, getMovements,
  createPackingMaterial, updatePackingMaterial, deletePackingMaterial,
  issueStock, receiveStock, adjustStock, importPackingMaterials,
};

const Indent = require('../models/Indent');
const Vendor = require('../models/Vendor');
const { applyPOStatus } = require('../utils/indentSync');

// @desc    Get all indents
// @route   GET /api/indents
// @access  Private
const getIndents = async (req, res, next) => {
  try {
    const { search, status, vendor, dateFrom, dateTo, page = 1, limit = 20, sort = '-indentDate' } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { productCode: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) query.status = status;
    if (vendor) query.vendor = vendor;
    if (dateFrom || dateTo) {
      query.indentDate = {};
      if (dateFrom) query.indentDate.$gte = new Date(dateFrom);
      if (dateTo) query.indentDate.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [indents, total] = await Promise.all([
      Indent.find(query)
        .populate('vendor', 'name contactPerson phone')
        .populate('assignedTo', 'name')
        .populate('purchaseOrderRef', 'status receivedQuantity quantity unit poReference')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Indent.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: indents.map(applyPOStatus),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single indent
// @route   GET /api/indents/:id
// @access  Private
const getIndent = async (req, res, next) => {
  try {
    const indent = await Indent.findById(req.params.id)
      .populate('vendor', 'name contactPerson phone email')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .populate('purchaseOrderRef');

    if (!indent) return res.status(404).json({ success: false, message: 'Indent not found' });
    res.json({ success: true, data: applyPOStatus(indent) });
  } catch (error) {
    next(error);
  }
};

// @desc    Create indent
// @route   POST /api/indents
// @access  Private
const createIndent = async (req, res, next) => {
  try {
    const { vendor: vendorId, ...rest } = req.body;
    let vendorName = rest.vendorName;

    if (vendorId) {
      const vendor = await Vendor.findById(vendorId);
      if (vendor) vendorName = vendor.name;
    }

    const indent = await Indent.create({
      ...rest,
      vendor: vendorId || undefined,
      vendorName,
      createdBy: req.user.id,
    });

    const populated = await Indent.findById(indent._id)
      .populate('vendor', 'name contactPerson phone')
      .populate('assignedTo', 'name');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update indent
// @route   PUT /api/indents/:id
// @access  Private
const updateIndent = async (req, res, next) => {
  try {
    // The PO link and received quantity are managed by the purchase order
    const { vendor: vendorId, purchaseOrderRef: _po, receivedQuantity: _rq, ...rest } = req.body;
    let vendorName = rest.vendorName;

    if (vendorId) {
      const vendor = await Vendor.findById(vendorId);
      if (vendor) vendorName = vendor.name;
    }

    // While a PO is linked, its status drives the indent's status
    const existing = await Indent.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Indent not found' });
    if (existing.purchaseOrderRef) delete rest.status;

    const indent = await Indent.findByIdAndUpdate(
      req.params.id,
      { ...rest, vendor: vendorId || undefined, vendorName },
      { new: true, runValidators: true }
    ).populate('vendor', 'name contactPerson phone').populate('assignedTo', 'name');

    if (!indent) return res.status(404).json({ success: false, message: 'Indent not found' });
    res.json({ success: true, data: indent });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete indent
// @route   DELETE /api/indents/:id
// @access  Private
const deleteIndent = async (req, res, next) => {
  try {
    const indent = await Indent.findByIdAndDelete(req.params.id);
    if (!indent) return res.status(404).json({ success: false, message: 'Indent not found' });
    res.json({ success: true, message: 'Indent deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getIndents, getIndent, createIndent, updateIndent, deleteIndent };

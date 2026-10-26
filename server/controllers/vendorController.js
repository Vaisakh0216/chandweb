const Vendor = require('../models/Vendor');
const Procurement = require('../models/Procurement');
const GoodsReceipt = require('../models/GoodsReceipt');
const mongoose = require('mongoose');

// @desc    Get all vendors
// @route   GET /api/vendors
// @access  Private
const getVendors = async (req, res, next) => {
  try {
    const { search, isActive, page = 1, limit = 50 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [vendors, total] = await Promise.all([
      Vendor.find(query).sort({ name: 1 }).skip(skip).limit(parseInt(limit)),
      Vendor.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: vendors,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single vendor
// @route   GET /api/vendors/:id
// @access  Private
const getVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
};

// @desc    Create vendor
// @route   POST /api/vendors
// @access  Private
const createVendor = async (req, res, next) => {
  try {
    const { name, contactPerson, phone, email, address, notes } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Vendor name is required' });

    const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await Vendor.findOne({ name: { $regex: `^${escaped}$`, $options: 'i' } }, 'name');
    if (existing) {
      return res.status(400).json({ success: false, message: `Vendor "${existing.name}" already exists`, data: existing });
    }

    const vendor = await Vendor.create({
      name, contactPerson, phone, email, address, notes,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
};

// @desc    Update vendor
// @route   PUT /api/vendors/:id
// @access  Private
const updateVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete vendor (guarded)
// @route   DELETE /api/vendors/:id
// @access  Private/Admin
const deleteVendor = async (req, res, next) => {
  try {
    const [procCount, grCount] = await Promise.all([
      Procurement.countDocuments({ vendor: req.params.id }),
      GoodsReceipt.countDocuments({ vendor: req.params.id }),
    ]);

    if (procCount > 0 || grCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete vendor — linked to ${procCount} procurement orders and ${grCount} goods receipts. Deactivate instead.`,
      });
    }

    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    res.json({ success: true, message: 'Vendor deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get vendor purchase history (goods receipts)
// @route   GET /api/vendors/:id/history
// @access  Private
const getVendorHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [receipts, total] = await Promise.all([
      GoodsReceipt.find({ vendor: req.params.id })
        .sort({ receivedDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      GoodsReceipt.countDocuments({ vendor: req.params.id }),
    ]);

    res.json({
      success: true,
      data: receipts,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all vendors for dropdown (minimal data)
// @route   GET /api/vendors/dropdown
// @access  Private
const getVendorsDropdown = async (req, res, next) => {
  try {
    const vendors = await Vendor.find({ isActive: true }, 'name contactPerson phone email').sort({ name: 1 });
    res.json({ success: true, data: vendors });
  } catch (error) {
    next(error);
  }
};

module.exports = { getVendors, getVendor, createVendor, updateVendor, deleteVendor, getVendorHistory, getVendorsDropdown };

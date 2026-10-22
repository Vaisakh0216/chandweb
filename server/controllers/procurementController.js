const Procurement = require('../models/Procurement');
const Vendor = require('../models/Vendor');
const GoodsReceipt = require('../models/GoodsReceipt');
const { calculatePrices } = require('../utils/priceCalculator');

// @desc    Get all procurement orders
// @route   GET /api/procurement
// @access  Private
const getProcurements = async (req, res, next) => {
  try {
    const {
      search, status, vendor, deliveryStatus,
      dateFrom, dateTo, page = 1, limit = 20, sort = '-orderDate',
    } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { productCode: { $regex: search, $options: 'i' } },
        { 'vendorSnapshot.name': { $regex: search, $options: 'i' } },
        { poReference: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) query.status = status;
    if (deliveryStatus) query.deliveryStatus = deliveryStatus;
    if (vendor) query.vendor = vendor;
    if (dateFrom || dateTo) {
      query.orderDate = {};
      if (dateFrom) query.orderDate.$gte = new Date(dateFrom);
      if (dateTo) query.orderDate.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      Procurement.find(query)
        .populate('vendor', 'name contactPerson phone')
        .populate('orderedBy', 'name')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Procurement.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: records,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single procurement
// @route   GET /api/procurement/:id
// @access  Private
const getProcurement = async (req, res, next) => {
  try {
    const record = await Procurement.findById(req.params.id)
      .populate('vendor', 'name contactPerson phone email address')
      .populate('orderedBy', 'name email')
      .populate('createdBy', 'name')
      .populate('indentRef')
      .populate('goodsReceiptRef');

    if (!record) return res.status(404).json({ success: false, message: 'Procurement record not found' });

    // Get price comparison with previous purchase of same product code
    let priceComparison = null;
    if (record.productCode) {
      const previous = await GoodsReceipt.findOne({
        productCode: record.productCode,
        currency: record.currency,
        _id: { $ne: record.goodsReceiptRef },
      }).sort({ receivedDate: -1 });

      if (previous) {
        const { comparePrices } = require('../utils/priceCalculator');
        priceComparison = {
          ...comparePrices(
            { pricePerKg: record.pricePerKg, unitPrice: record.unitPrice, priceCalculationType: record.priceCalculationType, currency: record.currency },
            { pricePerKg: previous.pricePerKg, unitPrice: previous.ratePerUnit, priceCalculationType: previous.priceCalculationType, currency: previous.currency }
          ),
          previousRecord: {
            receivedDate: previous.receivedDate,
            vendorName: previous.vendorSnapshot?.name,
            quantity: previous.receivedQuantity,
            unit: previous.unit,
            totalPrice: previous.totalPrice,
            pricePerKg: previous.pricePerKg,
            unitPrice: previous.ratePerUnit,
          },
        };
      } else {
        priceComparison = { isFirstPurchase: true };
      }
    }

    res.json({ success: true, data: record, priceComparison });
  } catch (error) {
    next(error);
  }
};

// @desc    Create procurement order
// @route   POST /api/procurement
// @access  Private
const createProcurement = async (req, res, next) => {
  try {
    const { vendor: vendorId, quantity, unit, totalPrice, ...rest } = req.body;

    let vendorSnapshot = {};
    if (vendorId) {
      const vendor = await Vendor.findById(vendorId);
      if (vendor) {
        vendorSnapshot = {
          name: vendor.name,
          contactPerson: vendor.contactPerson,
          phone: vendor.phone,
          email: vendor.email,
        };
      }
    }

    const priceFields = calculatePrices(
      parseFloat(quantity),
      unit,
      parseFloat(totalPrice)
    );

    const record = await Procurement.create({
      ...rest,
      vendor: vendorId || undefined,
      vendorSnapshot,
      quantity: parseFloat(quantity) || undefined,
      unit,
      totalPrice: parseFloat(totalPrice) || undefined,
      ...priceFields,
      orderedBy: req.user.id,
      orderedByName: req.user.name,
      createdBy: req.user.id,
    });

    const populated = await Procurement.findById(record._id)
      .populate('vendor', 'name contactPerson phone')
      .populate('orderedBy', 'name');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update procurement
// @route   PUT /api/procurement/:id
// @access  Private
const updateProcurement = async (req, res, next) => {
  try {
    const { vendor: vendorId, quantity, unit, totalPrice, ...rest } = req.body;

    const existing = await Procurement.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Record not found' });

    let vendorSnapshot = existing.vendorSnapshot;
    if (vendorId && vendorId !== String(existing.vendor)) {
      const vendor = await Vendor.findById(vendorId);
      if (vendor) {
        vendorSnapshot = { name: vendor.name, contactPerson: vendor.contactPerson, phone: vendor.phone, email: vendor.email };
      }
    }

    const qty = quantity !== undefined ? parseFloat(quantity) : existing.quantity;
    const u = unit || existing.unit;
    const tp = totalPrice !== undefined ? parseFloat(totalPrice) : existing.totalPrice;
    const priceFields = calculatePrices(qty, u, tp);

    const updated = await Procurement.findByIdAndUpdate(
      req.params.id,
      {
        ...rest,
        vendor: vendorId || existing.vendor,
        vendorSnapshot,
        quantity: qty,
        unit: u,
        totalPrice: tp,
        ...priceFields,
      },
      { new: true, runValidators: true }
    ).populate('vendor', 'name contactPerson phone').populate('orderedBy', 'name');

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete procurement
// @route   DELETE /api/procurement/:id
// @access  Private
const deleteProcurement = async (req, res, next) => {
  try {
    const record = await Procurement.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Procurement record not found' });
    res.json({ success: true, message: 'Procurement record deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProcurements, getProcurement, createProcurement, updateProcurement, deleteProcurement };

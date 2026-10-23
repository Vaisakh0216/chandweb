const GoodsReceipt = require('../models/GoodsReceipt');
const Procurement = require('../models/Procurement');
const Vendor = require('../models/Vendor');
const { calculatePrices, comparePrices } = require('../utils/priceCalculator');
const { syncIndentFromPO } = require('./procurementController');

// @desc    Get all goods receipts
// @route   GET /api/goods-receipts
// @access  Private
const getGoodsReceipts = async (req, res, next) => {
  try {
    const {
      search, vendor, qualityStatus,
      dateFrom, dateTo, page = 1, limit = 20, sort = '-receivedDate',
    } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { productCode: { $regex: search, $options: 'i' } },
        { invoiceNo: { $regex: search, $options: 'i' } },
        { 'vendorSnapshot.name': { $regex: search, $options: 'i' } },
      ];
    }
    if (vendor) query.vendor = vendor;
    if (qualityStatus) query.qualityStatus = qualityStatus;
    if (dateFrom || dateTo) {
      query.receivedDate = {};
      if (dateFrom) query.receivedDate.$gte = new Date(dateFrom);
      if (dateTo) query.receivedDate.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [receipts, total] = await Promise.all([
      GoodsReceipt.find(query)
        .populate('vendor', 'name contactPerson phone')
        .populate('receivedBy', 'name')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      GoodsReceipt.countDocuments(query),
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

// @desc    Get single goods receipt with price comparison
// @route   GET /api/goods-receipts/:id
// @access  Private
const getGoodsReceipt = async (req, res, next) => {
  try {
    const receipt = await GoodsReceipt.findById(req.params.id)
      .populate('vendor', 'name contactPerson phone email address')
      .populate('procurement')
      .populate('receivedBy', 'name')
      .populate('createdBy', 'name');

    if (!receipt) return res.status(404).json({ success: false, message: 'Goods receipt not found' });

    // Price comparison
    let priceComparison = null;
    if (receipt.productCode) {
      const previous = await GoodsReceipt.findOne({
        productCode: receipt.productCode,
        currency: receipt.currency,
        _id: { $ne: receipt._id },
        receivedDate: { $lt: receipt.receivedDate },
      }).sort({ receivedDate: -1 });

      if (previous) {
        priceComparison = {
          ...comparePrices(
            { pricePerKg: receipt.pricePerKg, unitPrice: receipt.ratePerUnit, priceCalculationType: receipt.priceCalculationType, currency: receipt.currency },
            { pricePerKg: previous.pricePerKg, unitPrice: previous.ratePerUnit, priceCalculationType: previous.priceCalculationType, currency: previous.currency }
          ),
          previousRecord: {
            id: previous._id,
            receivedDate: previous.receivedDate,
            vendorName: previous.vendorSnapshot?.name,
            quantity: previous.receivedQuantity,
            unit: previous.unit,
            totalPrice: previous.totalPrice,
            pricePerKg: previous.pricePerKg,
            ratePerUnit: previous.ratePerUnit,
            invoiceNo: previous.invoiceNo,
          },
        };
      } else {
        priceComparison = { isFirstPurchase: true, message: 'First recorded purchase for this product' };
      }
    }

    res.json({ success: true, data: receipt, priceComparison });
  } catch (error) {
    next(error);
  }
};

// @desc    Create goods receipt
// @route   POST /api/goods-receipts
// @access  Private
const createGoodsReceipt = async (req, res, next) => {
  try {
    const { vendor: vendorId, receivedQuantity, unit, totalPrice, procurement: procId, ...rest } = req.body;

    let vendorSnapshot = {};
    if (vendorId) {
      const vendor = await Vendor.findById(vendorId);
      if (vendor) {
        vendorSnapshot = { name: vendor.name, contactPerson: vendor.contactPerson, phone: vendor.phone, email: vendor.email };
      }
    }

    const priceFields = calculatePrices(parseFloat(receivedQuantity), unit, parseFloat(totalPrice));

    const receipt = await GoodsReceipt.create({
      ...rest,
      vendor: vendorId || undefined,
      vendorSnapshot,
      procurement: procId || undefined,
      receivedQuantity: parseFloat(receivedQuantity),
      unit,
      totalPrice: parseFloat(totalPrice) || undefined,
      ratePerUnit: priceFields.unitPrice,
      pricePerKg: priceFields.pricePerKg,
      priceCalculationType: priceFields.priceCalculationType,
      receivedBy: req.user.id,
      receivedByName: req.user.name,
      createdBy: req.user.id,
    });

    // Update linked procurement: add this delivery to the running total,
    // mark it fully or partially received, and carry that through to the indent
    if (procId) {
      const po = await Procurement.findById(procId);
      if (po) {
        const totalReceived = (po.receivedQuantity || 0) + (parseFloat(receivedQuantity) || 0);
        const status = po.quantity && totalReceived < po.quantity ? 'Partially Received' : 'Received';
        po.receivedQuantity = po.quantity ? Math.min(totalReceived, po.quantity) : totalReceived;
        po.status = status;
        po.deliveryStatus = status;
        po.goodsReceiptRef = receipt._id;
        await po.save();
        await syncIndentFromPO(po);
      }
    }

    const populated = await GoodsReceipt.findById(receipt._id)
      .populate('vendor', 'name contactPerson phone')
      .populate('receivedBy', 'name');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update goods receipt
// @route   PUT /api/goods-receipts/:id
// @access  Private
const updateGoodsReceipt = async (req, res, next) => {
  try {
    const { vendor: vendorId, receivedQuantity, unit, totalPrice, ...rest } = req.body;
    const existing = await GoodsReceipt.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Goods receipt not found' });

    let vendorSnapshot = existing.vendorSnapshot;
    if (vendorId && vendorId !== String(existing.vendor)) {
      const vendor = await Vendor.findById(vendorId);
      if (vendor) vendorSnapshot = { name: vendor.name, contactPerson: vendor.contactPerson, phone: vendor.phone, email: vendor.email };
    }

    const qty = receivedQuantity !== undefined ? parseFloat(receivedQuantity) : existing.receivedQuantity;
    const u = unit || existing.unit;
    const tp = totalPrice !== undefined ? parseFloat(totalPrice) : existing.totalPrice;
    const priceFields = calculatePrices(qty, u, tp);

    const updated = await GoodsReceipt.findByIdAndUpdate(
      req.params.id,
      {
        ...rest,
        vendor: vendorId || existing.vendor,
        vendorSnapshot,
        receivedQuantity: qty,
        unit: u,
        totalPrice: tp,
        ratePerUnit: priceFields.unitPrice,
        pricePerKg: priceFields.pricePerKg,
        priceCalculationType: priceFields.priceCalculationType,
      },
      { new: true, runValidators: true }
    ).populate('vendor', 'name contactPerson phone').populate('receivedBy', 'name');

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete goods receipt
// @route   DELETE /api/goods-receipts/:id
// @access  Private/Admin
const deleteGoodsReceipt = async (req, res, next) => {
  try {
    const receipt = await GoodsReceipt.findByIdAndDelete(req.params.id);
    if (!receipt) return res.status(404).json({ success: false, message: 'Goods receipt not found' });
    res.json({ success: true, message: 'Goods receipt deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getGoodsReceipts, getGoodsReceipt, createGoodsReceipt, updateGoodsReceipt, deleteGoodsReceipt };

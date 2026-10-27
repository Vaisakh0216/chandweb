const GoodsReceipt = require('../models/GoodsReceipt');
const Procurement = require('../models/Procurement');
const Indent = require('../models/Indent');
const { comparePrices } = require('../utils/priceCalculator');

// @desc    Product price history (for price comparison feature)
// @route   GET /api/reports/price-history/:productCode
// @access  Private
const getProductPriceHistory = async (req, res, next) => {
  try {
    const { productCode } = req.params;
    const { currency = 'INR', limit = 20 } = req.query;

    const records = await GoodsReceipt.find({
      productCode: productCode.toUpperCase(),
      currency,
    })
      .sort({ receivedDate: -1 })
      .limit(parseInt(limit))
      .select('productCode productName receivedDate vendorSnapshot receivedQuantity unit totalPrice pricePerKg ratePerUnit priceCalculationType currency invoiceNo');

    // Build comparison chain
    const withComparisons = records.map((record, index) => {
      const previous = records[index + 1];
      let comparison = null;
      if (previous) {
        comparison = comparePrices(
          { pricePerKg: record.pricePerKg, unitPrice: record.ratePerUnit, priceCalculationType: record.priceCalculationType, currency: record.currency },
          { pricePerKg: previous.pricePerKg, unitPrice: previous.ratePerUnit, priceCalculationType: previous.priceCalculationType, currency: previous.currency }
        );
      }
      return { ...record.toObject(), comparison };
    });

    // Find lowest rate
    const weightRecords = records.filter(r => r.priceCalculationType === 'per_kg' && r.pricePerKg);
    const lowestRate = weightRecords.length > 0
      ? weightRecords.reduce((min, r) => r.pricePerKg < min.pricePerKg ? r : min, weightRecords[0])
      : null;

    res.json({
      success: true,
      data: withComparisons,
      lowestRate: lowestRate ? {
        pricePerKg: lowestRate.pricePerKg,
        vendorName: lowestRate.vendorSnapshot?.name,
        receivedDate: lowestRate.receivedDate,
      } : null,
      totalRecords: records.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Monthly procurement summary
// @route   GET /api/reports/monthly
// @access  Private
const getMonthlySummary = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const summary = await GoodsReceipt.aggregate([
      {
        $match: {
          receivedDate: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$receivedDate' } },
          totalReceipts: { $sum: 1 },
          totalValue: { $sum: '$totalPrice' },
          uniqueProducts: { $addToSet: '$productCode' },
          uniqueVendors: { $addToSet: '$vendor' },
        },
      },
      {
        $project: {
          month: '$_id.month',
          totalReceipts: 1,
          totalValue: 1,
          uniqueProductCount: { $size: '$uniqueProducts' },
          uniqueVendorCount: { $size: '$uniqueVendors' },
        },
      },
      { $sort: { month: 1 } },
    ]);

    res.json({ success: true, data: summary, year: parseInt(year) });
  } catch (error) {
    next(error);
  }
};

// @desc    Vendor-wise purchase summary
// @route   GET /api/reports/vendor-summary
// @access  Private
const getVendorSummary = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const match = {};
    if (dateFrom || dateTo) {
      match.receivedDate = {};
      if (dateFrom) match.receivedDate.$gte = new Date(dateFrom);
      if (dateTo) match.receivedDate.$lte = new Date(dateTo);
    }

    const summary = await GoodsReceipt.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$vendor',
          vendorName: { $first: '$vendorSnapshot.name' },
          totalReceipts: { $sum: 1 },
          totalValue: { $sum: '$totalPrice' },
          products: { $addToSet: '$productCode' },
          lastPurchase: { $max: '$receivedDate' },
        },
      },
      {
        $project: {
          vendorName: 1,
          totalReceipts: 1,
          totalValue: 1,
          productCount: { $size: '$products' },
          lastPurchase: 1,
        },
      },
      { $sort: { totalValue: -1 } },
    ]);

    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

// @desc    Export goods receipts as CSV
// @route   GET /api/reports/export/goods-receipts
// @access  Private
const exportGoodsReceiptsCSV = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, vendor } = req.query;
    const query = {};
    if (dateFrom || dateTo) {
      query.receivedDate = {};
      if (dateFrom) query.receivedDate.$gte = new Date(dateFrom);
      if (dateTo) query.receivedDate.$lte = new Date(dateTo);
    }
    if (vendor) query.vendor = vendor;

    const records = await GoodsReceipt.find(query)
      .sort({ receivedDate: -1 })
      .limit(5000);

    const csvRows = [
      'SL#,Received Date,Product Code,Product Name,Vendor,Invoice No,Invoice Date,Received Qty,Unit,Total Price,Currency,Rate Per Unit,Price Per KG,Quality Status,Notes',
    ];

    records.forEach((r, i) => {
      csvRows.push([
        i + 1,
        r.receivedDate ? new Date(r.receivedDate).toLocaleDateString('en-IN') : '',
        r.productCode || '',
        `"${(r.productName || '').replace(/"/g, '""')}"`,
        `"${(r.vendorSnapshot?.name || '').replace(/"/g, '""')}"`,
        r.invoiceNo || '',
        r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString('en-IN') : '',
        r.receivedQuantity || '',
        r.unit || '',
        r.totalPrice || '',
        r.currency || 'INR',
        r.ratePerUnit || '',
        r.pricePerKg || '',
        r.qualityStatus || '',
        `"${(r.notes || '').replace(/"/g, '""')}"`,
      ].join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="goods-receipts-${Date.now()}.csv"`);
    res.send(csvRows.join('\n'));
  } catch (error) {
    next(error);
  }
};

// @desc    Export indents as CSV
// @route   GET /api/reports/export/indents
// @access  Private
const exportIndentsCSV = async (req, res, next) => {
  try {
    const { type } = req.query;
    const query = type === 'Sample' ? { indentType: 'Sample' } : type ? { indentType: { $ne: 'Sample' } } : {};
    const records = await Indent.find(query).sort({ indentDate: -1 }).limit(5000);

    const csvRows = [
      'SL#,Type,Indent Date,Product Code,Product/RM Name,Qty to Be Ordered,Unit,Vendor,Status,CNS Remarks,Notes',
    ];

    records.forEach((r, i) => {
      csvRows.push([
        i + 1,
        r.indentType || 'Original',
        r.indentDate ? new Date(r.indentDate).toLocaleDateString('en-IN') : '',
        r.productCode || '',
        `"${(r.productName || '').replace(/"/g, '""')}"`,
        r.qtyToBeOrdered || '',
        r.unit || '',
        `"${(r.vendorName || r.vendorAlternate || '').replace(/"/g, '""')}"`,
        r.status || '',
        `"${(r.cnsRemarks || '').replace(/"/g, '""')}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`,
      ].join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type === 'Sample' ? 'sample-' : ''}indents-${Date.now()}.csv"`);
    res.send(csvRows.join('\n'));
  } catch (error) {
    next(error);
  }
};

module.exports = { getProductPriceHistory, getMonthlySummary, getVendorSummary, exportGoodsReceiptsCSV, exportIndentsCSV };

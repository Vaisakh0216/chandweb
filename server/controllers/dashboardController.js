const Indent = require('../models/Indent');
const Procurement = require('../models/Procurement');
const GoodsReceipt = require('../models/GoodsReceipt');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');

// @desc    Get dashboard summary
// @route   GET /api/dashboard
// @access  Private
const getDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalIndents,
      pendingIndents,
      totalOrders,
      pendingOrders,
      totalReceipts,
      activeVendors,
      thisMonthReceipts,
      lastMonthReceipts,
      recentReceipts,
      recentOrders,
      recentIndents,
    ] = await Promise.all([
      Indent.countDocuments(),
      Indent.countDocuments({ status: { $in: ['Pending', 'On Hold'] } }),
      Procurement.countDocuments(),
      Procurement.countDocuments({ status: { $in: ['Ordered', 'Pending', 'Partially Received'] } }),
      GoodsReceipt.countDocuments(),
      Vendor.countDocuments({ isActive: true }),
      GoodsReceipt.countDocuments({ receivedDate: { $gte: thisMonthStart } }),
      GoodsReceipt.countDocuments({ receivedDate: { $gte: lastMonthStart, $lte: lastMonthEnd } }),
      GoodsReceipt.find()
        .populate('vendor', 'name')
        .sort({ receivedDate: -1 })
        .limit(8)
        .select('productCode productName receivedDate vendorSnapshot receivedQuantity unit totalPrice pricePerKg ratePerUnit'),
      Procurement.find()
        .populate('vendor', 'name')
        .sort({ orderDate: -1 })
        .limit(5)
        .select('productCode productName orderDate vendorSnapshot status quantity unit'),
      Indent.find({ status: { $in: ['Pending', 'On Hold'] } })
        .sort({ indentDate: -1 })
        .limit(5)
        .select('productCode productName indentDate status qtyToBeOrdered unit vendorName'),
    ]);

    // Price trend: find products with price changes in last 60 days
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const recentProductCodes = await GoodsReceipt.distinct('productCode', {
      receivedDate: { $gte: sixtyDaysAgo },
      productCode: { $ne: null, $ne: '' },
    });

    const priceAlerts = [];
    for (const code of recentProductCodes.slice(0, 10)) {
      const records = await GoodsReceipt.find({ productCode: code, priceCalculationType: 'per_kg' })
        .sort({ receivedDate: -1 })
        .limit(2)
        .select('productCode productName pricePerKg receivedDate vendorSnapshot currency');

      if (records.length === 2) {
        const diff = records[0].pricePerKg - records[1].pricePerKg;
        const pct = records[1].pricePerKg > 0 ? (diff / records[1].pricePerKg) * 100 : 0;
        if (Math.abs(pct) >= 2) {
          priceAlerts.push({
            productCode: code,
            productName: records[0].productName,
            currentPricePerKg: records[0].pricePerKg,
            previousPricePerKg: records[1].pricePerKg,
            difference: parseFloat(diff.toFixed(2)),
            percentageChange: parseFloat(pct.toFixed(2)),
            direction: diff > 0 ? 'increase' : 'decrease',
            currency: records[0].currency,
          });
        }
      }
    }

    priceAlerts.sort((a, b) => Math.abs(b.percentageChange) - Math.abs(a.percentageChange));

    res.json({
      success: true,
      data: {
        summary: {
          totalIndents,
          pendingIndents,
          totalOrders,
          pendingOrders,
          totalReceipts,
          activeVendors,
          thisMonthReceipts,
          lastMonthReceipts,
        },
        recentActivity: {
          receipts: recentReceipts,
          orders: recentOrders,
          pendingIndents: recentIndents,
        },
        priceAlerts: priceAlerts.slice(0, 5),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard };

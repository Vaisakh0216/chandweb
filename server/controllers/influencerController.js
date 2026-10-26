const mongoose = require('mongoose');
const Influencer = require('../models/Influencer');
const InfluencerPurchase = require('../models/InfluencerPurchase');
const InfluencerOrder = require('../models/InfluencerOrder');

const PURCHASE_FIELDS = ['purchaseDate', 'orderNo', 'productCode', 'productName', 'quantity', 'amount', 'notes'];
const ORDER_FIELDS = ['orderDate', 'orderNo', 'customerName', 'productCode', 'productName', 'quantity', 'orderAmount', 'notes'];

const pick = (body, fields) => fields.reduce((acc, f) => {
  if (body[f] !== undefined) acc[f] = body[f] === '' ? undefined : body[f];
  return acc;
}, {});

const dateRange = (from, to) => {
  if (!from && !to) return null;
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) { const end = new Date(to); end.setHours(23, 59, 59, 999); range.$lte = end; }
  return range;
};

// Per-influencer revenue / refund / commission figures, keyed by influencer id
const buildSummaries = async ({ influencerId, from, to } = {}) => {
  const purchaseMatch = {};
  const orderMatch = {};
  if (influencerId) {
    purchaseMatch.influencer = new mongoose.Types.ObjectId(influencerId);
    orderMatch.influencer = new mongoose.Types.ObjectId(influencerId);
  }
  const range = dateRange(from, to);
  if (range) {
    purchaseMatch.purchaseDate = range;
    orderMatch.orderDate = range;
  }

  const [purchaseStats, orderStats] = await Promise.all([
    InfluencerPurchase.aggregate([
      { $match: purchaseMatch },
      {
        $group: {
          _id: '$influencer',
          purchases: { $sum: 1 },
          purchaseValue: { $sum: '$amount' },
          videosPosted: { $sum: { $cond: [{ $ne: ['$refundStatus', 'Awaiting Video'] }, 1, 0] } },
          awaitingVideo: { $sum: { $cond: [{ $eq: ['$refundStatus', 'Awaiting Video'] }, 1, 0] } },
          refundDue: { $sum: { $cond: [{ $eq: ['$refundStatus', 'Refund Due'] }, '$amount', 0] } },
          refunded: { $sum: { $cond: [{ $eq: ['$refundStatus', 'Refunded'] }, { $ifNull: ['$refundAmount', '$amount'] }, 0] } },
        },
      },
    ]),
    InfluencerOrder.aggregate([
      { $match: orderMatch },
      {
        $group: {
          _id: '$influencer',
          orders: { $sum: 1 },
          revenue: { $sum: '$orderAmount' },
          commission: { $sum: '$commissionAmount' },
          commissionPaid: { $sum: { $cond: [{ $eq: ['$commissionStatus', 'Paid'] }, '$commissionAmount', 0] } },
        },
      },
    ]),
  ]);

  const summaries = {};
  const blank = () => ({
    purchases: 0, purchaseValue: 0, videosPosted: 0, awaitingVideo: 0, refundDue: 0, refunded: 0,
    orders: 0, revenue: 0, commission: 0, commissionPaid: 0,
  });
  purchaseStats.forEach(({ _id, ...s }) => { summaries[_id] = { ...blank(), ...s }; });
  orderStats.forEach(({ _id, ...s }) => { summaries[_id] = { ...(summaries[_id] || blank()), ...s }; });

  Object.values(summaries).forEach(s => {
    s.commissionUnpaid = s.commission - s.commissionPaid;
    // What the business keeps after paying commission and product refunds
    s.netRevenue = s.revenue - s.commission - s.refunded - s.refundDue;
  });
  return summaries;
};

const totalOf = (summaries) => {
  const total = {};
  Object.values(summaries).forEach(s => {
    Object.entries(s).forEach(([k, v]) => { total[k] = (total[k] || 0) + v; });
  });
  return total;
};

// ── Influencers ─────────────────────────────────────────────────────────────

// @desc    Get all influencers (with revenue summary per influencer)
// @route   GET /api/influencers
// @access  Private
const getInfluencers = async (req, res, next) => {
  try {
    const { search, isActive, page = 1, limit = 50 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { handle: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [influencers, total, summaries] = await Promise.all([
      Influencer.find(query).sort({ name: 1 }).skip(skip).limit(parseInt(limit)).lean(),
      Influencer.countDocuments(query),
      buildSummaries(),
    ]);

    res.json({
      success: true,
      data: influencers.map(i => ({ ...i, summary: summaries[i._id] || null })),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Revenue summary across all influencers (optionally by date range)
// @route   GET /api/influencers/summary
// @access  Private
const getInfluencersSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const summaries = await buildSummaries({ from, to });
    const influencers = await Influencer.find({ _id: { $in: Object.keys(summaries) } }, 'name handle platform commissionRate').lean();

    const rows = influencers
      .map(i => ({ influencer: i, ...summaries[i._id] }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json({ success: true, data: { totals: totalOf(summaries), influencers: rows } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single influencer with summary
// @route   GET /api/influencers/:id
// @access  Private
const getInfluencer = async (req, res, next) => {
  try {
    const influencer = await Influencer.findById(req.params.id).lean();
    if (!influencer) return res.status(404).json({ success: false, message: 'Influencer not found' });

    const { from, to } = req.query;
    const summaries = await buildSummaries({ influencerId: req.params.id, from, to });
    res.json({ success: true, data: { ...influencer, summary: summaries[req.params.id] || null } });
  } catch (error) {
    next(error);
  }
};

// @desc    Create influencer
// @route   POST /api/influencers
// @access  Private
const createInfluencer = async (req, res, next) => {
  try {
    const { name, handle, platform, followers, phone, email, commissionRate, notes, isActive } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Influencer name is required' });

    const influencer = await Influencer.create({
      name, handle, platform, followers, phone, email, commissionRate, notes, isActive,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, data: influencer });
  } catch (error) {
    next(error);
  }
};

// @desc    Update influencer
// @route   PUT /api/influencers/:id
// @access  Private
const updateInfluencer = async (req, res, next) => {
  try {
    const { createdBy, ...updates } = req.body;
    const influencer = await Influencer.findByIdAndUpdate(req.params.id, updates, {
      new: true, runValidators: true,
    });
    if (!influencer) return res.status(404).json({ success: false, message: 'Influencer not found' });
    res.json({ success: true, data: influencer });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete influencer (guarded)
// @route   DELETE /api/influencers/:id
// @access  Private/Admin
const deleteInfluencer = async (req, res, next) => {
  try {
    const [purchaseCount, orderCount] = await Promise.all([
      InfluencerPurchase.countDocuments({ influencer: req.params.id }),
      InfluencerOrder.countDocuments({ influencer: req.params.id }),
    ]);

    if (purchaseCount > 0 || orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete influencer — linked to ${purchaseCount} purchases and ${orderCount} orders. Deactivate instead.`,
      });
    }

    const influencer = await Influencer.findByIdAndDelete(req.params.id);
    if (!influencer) return res.status(404).json({ success: false, message: 'Influencer not found' });

    res.json({ success: true, message: 'Influencer deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ── Purchases ───────────────────────────────────────────────────────────────

// @desc    Get an influencer's purchases (with order count / revenue per video)
// @route   GET /api/influencers/:id/purchases
// @access  Private
const getPurchases = async (req, res, next) => {
  try {
    const { refundStatus } = req.query;
    const query = { influencer: req.params.id };
    if (refundStatus) query.refundStatus = refundStatus;

    const [purchases, orderStats] = await Promise.all([
      InfluencerPurchase.find(query).sort({ purchaseDate: -1 }).lean(),
      InfluencerOrder.aggregate([
        { $match: { influencer: new mongoose.Types.ObjectId(req.params.id) } },
        { $group: { _id: '$purchase', orders: { $sum: 1 }, revenue: { $sum: '$orderAmount' }, commission: { $sum: '$commissionAmount' } } },
      ]),
    ]);

    const statsByPurchase = Object.fromEntries(orderStats.map(({ _id, ...s }) => [_id, s]));
    res.json({
      success: true,
      data: purchases.map(p => ({ ...p, orders: 0, revenue: 0, commission: 0, ...statsByPurchase[p._id] })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record a product purchase by an influencer
// @route   POST /api/influencers/:id/purchases
// @access  Private
const createPurchase = async (req, res, next) => {
  try {
    const influencer = await Influencer.findById(req.params.id);
    if (!influencer) return res.status(404).json({ success: false, message: 'Influencer not found' });
    if (!influencer.isActive) return res.status(400).json({ success: false, message: 'Influencer is inactive' });

    const purchase = await InfluencerPurchase.create({
      ...pick(req.body, PURCHASE_FIELDS),
      influencer: influencer._id,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
};

// @desc    Update purchase details
// @route   PUT /api/influencers/purchases/:purchaseId
// @access  Private
const updatePurchase = async (req, res, next) => {
  try {
    const purchase = await InfluencerPurchase.findById(req.params.purchaseId);
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });

    purchase.set(pick(req.body, PURCHASE_FIELDS));
    await purchase.save();
    res.json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
};

const isVideoPosted = (purchase) => purchase.refundStatus !== 'Awaiting Video';

// @desc    Mark the video for a purchase as posted (link optional) or not posted — posting makes the refund due
// @route   PUT /api/influencers/purchases/:purchaseId/video
// @access  Private
const recordVideo = async (req, res, next) => {
  try {
    const purchase = await InfluencerPurchase.findById(req.params.purchaseId);
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });

    const videoUrl = (req.body.videoUrl || '').trim() || undefined;
    if (req.body.posted === false) {
      if (purchase.refundStatus === 'Refunded') {
        return res.status(400).json({ success: false, message: 'Cannot remove the video — the purchase has already been refunded' });
      }
      const orderCount = await InfluencerOrder.countDocuments({ purchase: purchase._id });
      if (orderCount > 0) {
        return res.status(400).json({ success: false, message: `Cannot remove the video — ${orderCount} orders are linked to it` });
      }
      purchase.set({ videoUrl: undefined, videoPostedDate: undefined, refundStatus: 'Awaiting Video' });
    } else {
      purchase.set({
        videoUrl,
        videoPostedDate: req.body.videoPostedDate || purchase.videoPostedDate || new Date(),
      });
      if (purchase.refundStatus === 'Awaiting Video') purchase.refundStatus = 'Refund Due';
    }

    await purchase.save();
    res.json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a purchase as refunded (only once the video is posted)
// @route   PUT /api/influencers/purchases/:purchaseId/refund
// @access  Private
const refundPurchase = async (req, res, next) => {
  try {
    const purchase = await InfluencerPurchase.findById(req.params.purchaseId);
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });
    if (!isVideoPosted(purchase)) {
      return res.status(400).json({ success: false, message: 'Refund can only be issued after the influencer posts the video' });
    }
    if (purchase.refundStatus === 'Refunded') {
      return res.status(400).json({ success: false, message: 'Purchase is already refunded' });
    }

    const { refundAmount, refundDate, refundReference } = req.body;
    purchase.set({
      refundStatus: 'Refunded',
      refundAmount: refundAmount !== undefined && refundAmount !== '' ? refundAmount : purchase.amount,
      refundDate: refundDate || new Date(),
      refundReference,
    });
    await purchase.save();
    res.json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a purchase (blocked if orders are linked to its video)
// @route   DELETE /api/influencers/purchases/:purchaseId
// @access  Private/Admin
const deletePurchase = async (req, res, next) => {
  try {
    const orderCount = await InfluencerOrder.countDocuments({ purchase: req.params.purchaseId });
    if (orderCount > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete — ${orderCount} orders are linked to this video` });
    }
    const purchase = await InfluencerPurchase.findByIdAndDelete(req.params.purchaseId);
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });
    res.json({ success: true, message: 'Purchase deleted' });
  } catch (error) {
    next(error);
  }
};

// ── Orders through videos ───────────────────────────────────────────────────

// @desc    Get orders attributed to an influencer
// @route   GET /api/influencers/:id/orders
// @access  Private
const getOrders = async (req, res, next) => {
  try {
    const { purchase, commissionStatus, page = 1, limit = 50 } = req.query;
    const query = { influencer: req.params.id };
    if (purchase) query.purchase = purchase;
    if (commissionStatus) query.commissionStatus = commissionStatus;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      InfluencerOrder.find(query)
        .populate('purchase', 'productName productCode videoUrl')
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      InfluencerOrder.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record an order that came through a purchase's video
// @route   POST /api/influencers/purchases/:purchaseId/orders
// @access  Private
const createOrder = async (req, res, next) => {
  try {
    const purchase = await InfluencerPurchase.findById(req.params.purchaseId).populate('influencer', 'commissionRate');
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });
    if (!isVideoPosted(purchase)) {
      return res.status(400).json({ success: false, message: 'Mark the video as posted before adding orders' });
    }

    const data = pick(req.body, ORDER_FIELDS);
    const order = await InfluencerOrder.create({
      productCode: purchase.productCode,
      productName: purchase.productName,
      ...data,
      influencer: purchase.influencer._id,
      purchase: purchase._id,
      commissionRate: purchase.influencer.commissionRate,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an order (commission is recalculated)
// @route   PUT /api/influencers/orders/:orderId
// @access  Private
const updateOrder = async (req, res, next) => {
  try {
    const order = await InfluencerOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.commissionStatus === 'Paid' && req.body.orderAmount !== undefined && Number(req.body.orderAmount) !== order.orderAmount) {
      return res.status(400).json({ success: false, message: 'Commission already paid — mark it unpaid before changing the amount' });
    }

    order.set(pick(req.body, ORDER_FIELDS));
    await order.save();
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark an order's commission as paid / unpaid
// @route   PUT /api/influencers/orders/:orderId/commission
// @access  Private
const setCommissionStatus = async (req, res, next) => {
  try {
    const { commissionStatus, commissionPaidDate } = req.body;
    if (!['Paid', 'Unpaid'].includes(commissionStatus)) {
      return res.status(400).json({ success: false, message: 'commissionStatus must be Paid or Unpaid' });
    }
    const order = await InfluencerOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.commissionStatus = commissionStatus;
    order.commissionPaidDate = commissionStatus === 'Paid' ? (commissionPaidDate || new Date()) : undefined;
    await order.save();
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an order
// @route   DELETE /api/influencers/orders/:orderId
// @access  Private/Admin
const deleteOrder = async (req, res, next) => {
  try {
    const order = await InfluencerOrder.findByIdAndDelete(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, message: 'Order deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInfluencers, getInfluencersSummary, getInfluencer, createInfluencer, updateInfluencer, deleteInfluencer,
  getPurchases, createPurchase, updatePurchase, recordVideo, refundPurchase, deletePurchase,
  getOrders, createOrder, updateOrder, setCommissionStatus, deleteOrder,
};

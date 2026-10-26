const express = require('express');
const router = express.Router();
const {
  getInfluencers, getInfluencersSummary, getInfluencer, createInfluencer, updateInfluencer, deleteInfluencer,
  getPurchases, createPurchase, updatePurchase, recordVideo, refundPurchase, deletePurchase,
  getOrders, createOrder, updateOrder, setCommissionStatus, deleteOrder,
} = require('../controllers/influencerController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/summary', getInfluencersSummary);
router.route('/').get(getInfluencers).post(createInfluencer);

// Purchases
router.route('/purchases/:purchaseId').put(updatePurchase).delete(authorize('admin'), deletePurchase);
router.put('/purchases/:purchaseId/video', recordVideo);
router.put('/purchases/:purchaseId/refund', refundPurchase);
router.post('/purchases/:purchaseId/orders', createOrder);

// Orders through videos
router.route('/orders/:orderId').put(updateOrder).delete(authorize('admin'), deleteOrder);
router.put('/orders/:orderId/commission', setCommissionStatus);

router.route('/:id').get(getInfluencer).put(updateInfluencer).delete(authorize('admin'), deleteInfluencer);
router.route('/:id/purchases').get(getPurchases).post(createPurchase);
router.get('/:id/orders', getOrders);

module.exports = router;

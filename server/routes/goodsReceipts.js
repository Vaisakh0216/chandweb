const express = require('express');
const router = express.Router();
const { getGoodsReceipts, getGoodsReceipt, createGoodsReceipt, updateGoodsReceipt, deleteGoodsReceipt } = require('../controllers/goodsReceiptController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getGoodsReceipts).post(createGoodsReceipt);
router.route('/:id').get(getGoodsReceipt).put(updateGoodsReceipt).delete(authorize('admin'), deleteGoodsReceipt);

module.exports = router;

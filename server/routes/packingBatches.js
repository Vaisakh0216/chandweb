const express = require('express');
const router = express.Router();
const {
  getBatches, getSummary, getBatch, createBatch, updateBatch, deleteBatch,
  receiveMore, recordPacking, transferToWarehouse, deleteMovement,
} = require('../controllers/packingBatchController');
const { protect, authorize } = require('../middleware/auth');

const canEdit = authorize('admin', 'manager');

router.use(protect);
router.get('/summary', getSummary);
router.delete('/movements/:movementId', authorize('admin'), deleteMovement);
router.route('/').get(getBatches).post(canEdit, createBatch);
router.route('/:id')
  .get(getBatch)
  .put(canEdit, updateBatch)
  .delete(authorize('admin'), deleteBatch);
router.post('/:id/receive', canEdit, receiveMore);
router.post('/:id/pack', canEdit, recordPacking);
router.post('/:id/transfer', canEdit, transferToWarehouse);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  getPackingMaterials, getSummary, getPackingMaterial, getMovements,
  createPackingMaterial, updatePackingMaterial, deletePackingMaterial,
  issueStock, receiveStock, adjustStock, importPackingMaterials,
} = require('../controllers/packingMaterialController');
const { protect, authorize } = require('../middleware/auth');

const canEdit = authorize('admin', 'manager');

router.use(protect);
router.get('/summary', getSummary);
router.get('/movements', getMovements);
router.post('/import', canEdit, importPackingMaterials);
router.route('/').get(getPackingMaterials).post(canEdit, createPackingMaterial);
router.route('/:id')
  .get(getPackingMaterial)
  .put(canEdit, updatePackingMaterial)
  .delete(authorize('admin'), deletePackingMaterial);
router.post('/:id/issue', canEdit, issueStock);
router.post('/:id/receive', canEdit, receiveStock);
router.post('/:id/adjust', canEdit, adjustStock);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getVendors, getVendor, createVendor, updateVendor, deleteVendor, getVendorHistory, getVendorsDropdown } = require('../controllers/vendorController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/dropdown', getVendorsDropdown);
router.route('/').get(getVendors).post(createVendor);
router.route('/:id').get(getVendor).put(updateVendor).delete(authorize('admin'), deleteVendor);
router.get('/:id/history', getVendorHistory);

module.exports = router;

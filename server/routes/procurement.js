const express = require('express');
const router = express.Router();
const { getProcurements, getProcurement, createProcurement, updateProcurement, deleteProcurement } = require('../controllers/procurementController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getProcurements).post(createProcurement);
router.route('/:id').get(getProcurement).put(updateProcurement).delete(deleteProcurement);

module.exports = router;

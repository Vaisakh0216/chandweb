const express = require('express');
const router = express.Router();
const {
  getProductPriceHistory, getMonthlySummary, getVendorSummary,
  exportGoodsReceiptsCSV, exportIndentsCSV,
} = require('../controllers/reportsController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/price-history/:productCode', getProductPriceHistory);
router.get('/monthly', getMonthlySummary);
router.get('/vendor-summary', getVendorSummary);
router.get('/export/goods-receipts', exportGoodsReceiptsCSV);
router.get('/export/indents', exportIndentsCSV);

module.exports = router;

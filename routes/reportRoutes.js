const express = require('express');
const router = express.Router();
const {
  getStockValuationReport,
  getSalesSummaryReport,
  getProductMovementReport,
  getClientSalesReport,
  getSupplierPurchaseReport,
  exportReportToExcel,
  exportReportToPDF
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/stock-valuation', getStockValuationReport);
router.get('/sales-summary', getSalesSummaryReport);
router.get('/product-movement', getProductMovementReport);
router.get('/client-sales', getClientSalesReport);
router.get('/supplier-purchase', getSupplierPurchaseReport);
router.get('/export/excel/:reportType', exportReportToExcel);
router.get('/export/pdf/:reportType', exportReportToPDF);

module.exports = router;

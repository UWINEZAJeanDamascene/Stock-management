const express = require('express');
const router = express.Router();
const {
  getPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  deletePurchase,
  receivePurchase,
  recordPayment,
  cancelPurchase,
  getSupplierPurchases,
  generatePurchasePDF
} = require('../controllers/purchaseController');
const { protect, authorize } = require('../middleware/auth');
const logAction = require('../middleware/logAction');

router.use(protect);

router.route('/')
  .get(getPurchases)
  .post(authorize('admin', 'stock_manager', 'purchases'), logAction('purchase'), createPurchase);

router.route('/:id')
  .get(getPurchase)
  .put(authorize('admin', 'stock_manager'), logAction('purchase'), updatePurchase)
  .delete(authorize('admin', 'user_manager'), logAction('purchase'), deletePurchase);

// Receive purchase (add stock)
router.put('/:id/receive', authorize('admin', 'stock_manager'), logAction('purchase'), receivePurchase);

// Record payment
router.post('/:id/payment', authorize('admin', 'stock_manager', 'purchases'), logAction('purchase'), recordPayment);

// Cancel purchase
router.put('/:id/cancel', authorize('admin'), logAction('purchase'), cancelPurchase);

// PDF generation
router.get('/:id/pdf', generatePurchasePDF);

// Supplier specific routes
router.get('/supplier/:supplierId', getSupplierPurchases);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  archiveProduct,
  restoreProduct,
  getProductHistory,
  getProductLifecycle,
  getLowStockProducts
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const logAction = require('../middleware/logAction');

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getProducts)
  .post(authorize('admin', 'stock_manager'), logAction('product'), createProduct);

router.get('/low-stock', getLowStockProducts);

router.route('/:id')
  .get(getProduct)
  .put(authorize('admin', 'stock_manager'), logAction('product'), updateProduct)
  .delete(authorize('admin', 'stock_manager'), logAction('product'), deleteProduct);

router.put('/:id/archive', authorize('admin', 'stock_manager'), logAction('product'), archiveProduct);
router.put('/:id/restore', authorize('admin', 'stock_manager'), logAction('product'), restoreProduct);
router.get('/:id/history', getProductHistory);
router.get('/:id/lifecycle', getProductLifecycle);

module.exports = router;

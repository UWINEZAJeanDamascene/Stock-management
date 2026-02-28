const express = require('express');
const router = express.Router();
const {
  getStockMovements,
  getStockMovement,
  receiveStock,
  adjustStock,
  getProductStockMovements,
  getStockSummary,
  updateStockMovement,
  deleteStockMovement
} = require('../controllers/stockController');
const { protect, authorize } = require('../middleware/auth');
const logAction = require('../middleware/logAction');

router.use(protect);

router.route('/movements')
  .get(getStockMovements)
  .post(authorize('admin', 'stock_manager'), logAction('stock'), receiveStock);

router.get('/movements/:id', getStockMovement);
router.put('/movements/:id', authorize('admin', 'stock_manager'), logAction('stock'), updateStockMovement);
router.delete('/movements/:id', authorize('admin', 'stock_manager'), logAction('stock'), deleteStockMovement);
router.get('/product/:productId/movements', getProductStockMovements);
router.post('/adjust', authorize('admin', 'stock_manager'), logAction('stock'), adjustStock);
router.get('/summary', getStockSummary);

module.exports = router;

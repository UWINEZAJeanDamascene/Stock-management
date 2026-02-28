const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getRecentActivities,
  getLowStockAlerts,
  getTopSellingProducts,
  getTopClients,
  getSalesChart,
  getStockMovementChart
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/stats', getDashboardStats);
router.get('/recent-activities', getRecentActivities);
router.get('/low-stock-alerts', getLowStockAlerts);
router.get('/top-selling-products', getTopSellingProducts);
router.get('/top-clients', getTopClients);
router.get('/sales-chart', getSalesChart);
router.get('/stock-movement-chart', getStockMovementChart);

module.exports = router;

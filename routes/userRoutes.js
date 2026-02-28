const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserActionLogs
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const logAction = require('../middleware/logAction');

router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getUsers)
  .post(logAction('user'), createUser);

router.route('/:id')
  .get(getUser)
  .put(logAction('user'), updateUser)
  .delete(logAction('user'), deleteUser);

router.get('/:id/action-logs', getUserActionLogs);

module.exports = router;

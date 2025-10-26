// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,      // ✅ NOUVEAU
  updateUser,
  deleteUser,
  updatePassword,
  toggleBlockUser
} = require('../controllers/userController');

// Routes
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);              // ✅ NOUVELLE ROUTE
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.put('/:id/password', updatePassword);
router.put('/:id/toggle-block', toggleBlockUser);

module.exports = router;
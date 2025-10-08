// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getAllUsers, 
  getUserById, 
  updateUser, 
  deleteUser,
  updatePassword,
  toggleBlockUser  // NOUVEAU
} = require('../controllers/userController');

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.put('/:id/password', updatePassword);
router.put('/:id/toggle-block', toggleBlockUser);  // NOUVELLE ROUTE

module.exports = router;
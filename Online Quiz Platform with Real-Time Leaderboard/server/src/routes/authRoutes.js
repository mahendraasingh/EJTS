/**
 * Authentication REST Routes
 */
const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Full name is required.'),
    body('email').isEmail().normalizeEmail().withMessage('A valid email address is required.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
    body('role').optional().isIn(['student', 'admin']).withMessage('Role must be student or admin.'),
    validate,
  ],
  authController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('A valid email address is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
    validate,
  ],
  authController.login
);

router.get('/me', authenticateToken, authController.getMe);

module.exports = router;


const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { redirectIfAuth, requireAuth } = require('../../middlewares/auth.middleware');
const {
  registerValidator,
  loginValidator,
  forgotValidator,
  resetValidator,
} = require('./auth.validators');

router.get('/register', redirectIfAuth, authController.showRegister);
router.post('/register', redirectIfAuth, registerValidator, authController.register);

router.get('/login', redirectIfAuth, authController.showLogin);
router.post('/login', redirectIfAuth, loginValidator, authController.login);

router.post('/logout', requireAuth, authController.logout);

router.get('/forgot', redirectIfAuth, authController.showForgot);
router.post('/forgot', redirectIfAuth, forgotValidator, authController.forgotPassword);

router.get('/reset/:token', redirectIfAuth, authController.showReset);
router.post('/reset/:token', redirectIfAuth, resetValidator, authController.resetPassword);

module.exports = router;
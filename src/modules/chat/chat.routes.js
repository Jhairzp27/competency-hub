const express = require('express');
const router = express.Router();
const chatController = require('./chat.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');

// Pantalla del chat (solo con sesión iniciada). Los mensajes se envían por WebSocket.
router.get('/', requireAuth, chatController.showChat);

module.exports = router;

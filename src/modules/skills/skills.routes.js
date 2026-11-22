// Rutas del catálogo de skills. Se montan en app.js con requireAuth:
// todas exigen sesión iniciada y los POST pasan por la protección CSRF global.
const express = require('express');
const skillsController = require('./skills.controller');

const router = express.Router();

router.get('/', skillsController.listar);

module.exports = router;

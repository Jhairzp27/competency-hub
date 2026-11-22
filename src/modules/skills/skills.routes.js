// Rutas del catálogo de skills. Se montan en app.js con requireAuth:
// todas exigen sesión iniciada y los POST pasan por la protección CSRF global.
const express = require('express');
const skillsController = require('./skills.controller');
const { skillValidator, nombreUnicoValidator } = require('./skills.validators');
const { manejarErroresValidacion } = require('./skills.validation');

const router = express.Router();

router.get('/', skillsController.listar);

// "/nueva" va antes de "/:id" para que no se interprete como un id
router.get('/nueva', skillsController.formularioNueva);
router.post(
  '/',
  skillValidator,
  nombreUnicoValidator,
  manejarErroresValidacion('skills/nueva', skillsController.localsNueva),
  skillsController.crear
);

router.get('/:id', skillsController.detalle);

module.exports = router;

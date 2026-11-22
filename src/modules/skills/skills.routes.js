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

// Rutas de una skill concreta: cargarSkill valida el id y responde 404 si no existe
router.get('/:id', skillsController.cargarSkill, skillsController.detalle);

router.get('/:id/editar', skillsController.cargarSkill, skillsController.formularioEditar);
router.post(
  '/:id/editar',
  skillsController.cargarSkill,
  skillValidator,
  nombreUnicoValidator, // excluye la propia skill (req.params.id)
  manejarErroresValidacion('skills/editar', skillsController.localsEditar),
  skillsController.actualizar
);

// Eliminar: siempre con confirmación (modal o página) y por POST con token CSRF
router.get('/:id/eliminar', skillsController.cargarSkill, skillsController.confirmarEliminar);
router.post('/:id/eliminar', skillsController.cargarSkill, skillsController.eliminar);

module.exports = router;

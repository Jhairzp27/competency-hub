/**
 * UI kit: página de referencia de componentes para el equipo.
 * Solo se monta fuera de producción (ver app.js).
 */
const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('ui-kit', {
    sampleErrors: [
      { msg: 'El nombre debe tener entre 3 y 100 caracteres.' },
      { msg: 'El nivel esperado debe ser un número del 1 al 5.' },
    ],
  });
});

// Demostración del mensaje flash: lo guarda en sesión y redirige
router.get('/flash', (req, res) => {
  req.session.flash = { type: 'success', message: 'Mensaje flash de prueba: la acción se completó.' };
  res.redirect('/ui-kit');
});

module.exports = router;

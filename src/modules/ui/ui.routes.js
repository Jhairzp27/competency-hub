/**
 * UI kit: página de referencia de componentes para el equipo.
 * Solo se monta fuera de producción (ver app.js).
 */
const express = require('express');

const router = express.Router();

const sampleSkills = [
  { name: 'Node.js', category: 'TECNICA', level: 4, importance: 'Alta' },
  { name: 'Comunicación asertiva', category: 'CONDUCTUAL', level: 3, importance: 'Media' },
  { name: 'PostgreSQL', category: 'TECNICA', level: 3, importance: 'Alta' },
  { name: 'Trabajo en equipo', category: 'CONDUCTUAL', level: 5, importance: 'Media' },
  { name: 'Docker', category: 'TECNICA', level: 2, importance: 'Baja' },
];

router.get('/', (req, res) => {
  res.render('ui-kit', {
    sampleErrors: [
      { msg: 'El nombre debe tener entre 3 y 100 caracteres.' },
      { msg: 'El nivel esperado debe ser un número del 1 al 5.' },
    ],
    sampleSkills,
    sampleUsers: ['Ana Torres', 'Luis Pérez', `${req.session.user ? req.session.user.name : 'Invitado'} (tú)`],
    sampleMessages: [
      { author: 'Ana Torres', content: '¿Alguien tiene experiencia con Prisma y PostgreSQL?', createdAt: new Date(Date.now() - 6 * 60000) },
      { author: 'Luis Pérez', content: 'Sí, lo usamos en el último proyecto. Te paso la guía.', createdAt: new Date(Date.now() - 4 * 60000) },
      { author: 'Tú', content: 'Acabo de agregar la skill «Prisma ORM» al catálogo 👍', createdAt: new Date(Date.now() - 60000), own: true },
    ],
    query: {
      q: typeof req.query.q === 'string' ? req.query.q : '',
      category: typeof req.query.category === 'string' ? req.query.category : '',
      page: typeof req.query.page === 'string' ? req.query.page : '',
    },
  });
});

// Demostración del mensaje flash: lo guarda en sesión y redirige
router.get('/flash', (req, res) => {
  req.session.flash = { type: 'success', message: 'Mensaje flash de prueba: la acción se completó.' };
  res.redirect('/ui-kit');
});

// Demostración del modal de confirmación (no elimina nada)
router.post('/confirm-demo', (req, res) => {
  req.session.flash = { type: 'success', message: 'Confirmación recibida (demo): no se eliminó nada.' };
  res.redirect('/ui-kit');
});

module.exports = router;

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { sessionMiddleware } = require('./config/session');
const { generateCsrfToken, verifyCsrfToken } = require('./middlewares/csrf.middleware');
const authRoutes = require('./modules/auth/auth.routes');
const chatRoutes = require('./modules/chat/chat.routes');
const skillsRoutes = require('./modules/skills/skills.routes');
const { requireAuth } = require('./middlewares/auth.middleware');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));

// Rendimiento: comprime (gzip/deflate) HTML, CSS y JS. Medido con Lighthouse en docs/rendimiento.md
app.use(compression());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
// Archivos estáticos con caché: en producción el navegador reutiliza CSS, JS e imágenes
// durante 7 días (revalida con ETag); en desarrollo no se cachea para ver los cambios al instante.
// Las fuentes nunca cambian de contenido, así que se cachean un año como inmutables.
const isProduction = process.env.NODE_ENV === 'production';
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: isProduction ? '7d' : 0,
    setHeaders: (res, filePath) => {
      if (/\.woff2$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

app.use(sessionMiddleware);
app.use(generateCsrfToken);
app.use(verifyCsrfToken);

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.currentPath = req.path; // para marcar el enlace activo del navbar
  // Mensaje flash: se muestra una sola vez (ver views/partials/flash.ejs)
  res.locals.flash = req.session.flash || null;
  if (req.session.flash) delete req.session.flash;
  next();
});

app.get('/', (req, res) => {
  return req.session.user ? res.redirect('/dashboard') : res.redirect('/auth/login');
});

app.use('/auth', authRoutes);

app.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard');
});

app.use('/chat', chatRoutes);

// Catálogo de skills (CRUD): todas las rutas exigen sesión
app.use('/skills', requireAuth, skillsRoutes);

// UI kit de referencia para el equipo (solo en desarrollo)
if (process.env.NODE_ENV !== 'production') {
  app.use('/ui-kit', require('./modules/ui/ui.routes'));
}

// 404: ninguna ruta coincidió
app.use((req, res) => {
  res.status(404).render('errors/error', {
    status: 404,
    heading: 'Página no encontrada',
    message: 'La dirección que buscas no existe o fue movida. Revisa el enlace o vuelve al inicio.',
  });
});

// Manejador de errores: registra el detalle en consola y muestra una página genérica
// (nunca expone el stack ni mensajes internos al usuario)
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);

  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  const isServerError = status >= 500;

  res.status(status).render(
    'errors/error',
    {
      status,
      heading: isServerError ? 'Algo salió mal' : 'No se pudo completar la solicitud',
      message: isServerError
        ? 'Ocurrió un error inesperado en el servidor. Intenta de nuevo en unos minutos.'
        : 'La solicitud no es válida. Revisa los datos e inténtalo de nuevo.',
    },
    (renderErr, html) => {
      // Si la vista de error también falla, responde en texto plano
      if (renderErr) {
        console.error(renderErr);
        return res.type('text').send('Error interno del servidor.');
      }
      res.send(html);
    }
  );
});

module.exports = app;
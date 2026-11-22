const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { sessionMiddleware } = require('./config/session');
const { generateCsrfToken, verifyCsrfToken } = require('./middlewares/csrf.middleware');

const app = express();

// Seguridad de cabeceras HTTP (XSS, clickjacking, MIME sniffing)
// Nota: contentSecurityPolicy se deja en false temporalmente si Daniel usa CDNs (Tailwind/Bootstrap)
app.use(helmet({ contentSecurityPolicy: false }));

// Motor de vistas EJS (renderizado en servidor)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Parsers y archivos estáticos
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Sesiones y protección CSRF
app.use(sessionMiddleware);
app.use(generateCsrfToken);
app.use(verifyCsrfToken);

// Datos globales disponibles en todas las vistas EJS
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// Ruta temporal de prueba (luego redirigirá a /auth/login o /dashboard)
app.get('/', (req, res) => {
  res.send('Servidor Competency Hub corriendo correctamente.');
});

// Aquí montaremos:
// app.use('/auth', authRoutes);
// app.use('/skills', skillsRoutes);
// app.use('/chat', chatRoutes);

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Error interno del servidor.');
});

module.exports = app;
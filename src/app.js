const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { sessionMiddleware } = require('./config/session');
const { generateCsrfToken, verifyCsrfToken } = require('./middlewares/csrf.middleware');
const authRoutes = require('./modules/auth/auth.routes');
const { requireAuth } = require('./middlewares/auth.middleware');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(sessionMiddleware);
app.use(generateCsrfToken);
app.use(verifyCsrfToken);

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.currentPath = req.path; // para marcar el enlace activo del navbar
  next();
});

app.get('/', (req, res) => {
  return req.session.user ? res.redirect('/dashboard') : res.redirect('/auth/login');
});

app.use('/auth', authRoutes);

app.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard');
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Error interno del servidor.');
});

module.exports = app;
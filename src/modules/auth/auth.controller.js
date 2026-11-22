const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const prisma = require('../../config/db');

const SALT_ROUNDS = 12;

// --- VISTAS ---
exports.showRegister = (req, res) => {
  res.render('auth/register', { errors: [], old: {} });
};

exports.showLogin = (req, res) => {
  res.render('auth/login', { errors: [], message: req.query.msg || null, old: {} });
};

exports.showForgot = (req, res) => {
  res.render('auth/forgot', { errors: [], message: null });
};

exports.showReset = async (req, res) => {
  const { token } = req.params;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.used || record.expiresAt < new Date()) {
    return res.status(400).render('auth/forgot', {
      errors: [{ msg: 'El enlace de recuperación es inválido o ha expirado.' }],
      message: null,
    });
  }

  res.render('auth/reset', { token, errors: [] });
};

// --- ACCIONES ---
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('auth/register', {
        errors: errors.array(),
        old: { name: req.body.name, email: req.body.email },
      });
    }

    const { name, email, password } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).render('auth/register', {
        errors: [{ msg: 'Este correo ya está registrado.' }],
        old: { name, email },
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await prisma.user.create({
      data: { name, email, passwordHash },
    });

    res.redirect('/auth/login?msg=Cuenta+creada.+Ahora+puedes+iniciar+sesión.');
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('auth/login', {
        errors: errors.array(),
        message: null,
        old: { email: req.body.email },
      });
    }

    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    const isValid = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !isValid) {
      return res.status(401).render('auth/login', {
        errors: [{ msg: 'Credenciales incorrectas.' }],
        message: null,
        old: { email },
      });
    }

    // Regenera la sesión para prevenir fijación de sesión
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
      req.session.save(() => res.redirect('/dashboard'));
    });
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.redirect('/auth/login');
  });
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('auth/forgot', { errors: errors.array(), message: null });
    }

    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

      await prisma.passwordResetToken.create({
        data: { tokenHash, userId: user.id, expiresAt },
      });

      const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/auth/reset/${rawToken}`;
      console.log('\n=================================================');
      console.log(`[SIMULACIÓN EMAIL] Recuperación para: ${user.email}`);
      console.log(`Enlace (válido 15 min, un solo uso): ${resetUrl}`);
      console.log('=================================================\n');
    }

    // Mensaje genérico para no revelar si el correo existe o no
    res.render('auth/forgot', {
      errors: [],
      message: 'Si el correo existe, se generó un enlace de recuperación (revisa la consola del servidor).',
    });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('auth/reset', { token, errors: errors.array() });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.used || record.expiresAt < new Date()) {
      return res.status(400).render('auth/forgot', {
        errors: [{ msg: 'El enlace de recuperación es inválido o ha expirado.' }],
        message: null,
      });
    }

    const passwordHash = await bcrypt.hash(req.body.password, SALT_ROUNDS);

    // Transacción: actualiza clave y marca el token como usado (un solo uso)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { used: true },
      }),
    ]);

    res.redirect('/auth/login?msg=Contraseña+actualizada+correctamente.');
  } catch (err) {
    next(err);
  }
};
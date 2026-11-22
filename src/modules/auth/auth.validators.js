const { body } = require('express-validator');

const registerValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio.')
    .isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres.'),
  body('email')
    .trim()
    .isEmail().withMessage('Ingresa un correo electrónico válido.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8, max: 64 }).withMessage('La contraseña debe tener entre 8 y 64 caracteres.')
    .matches(/[A-Z]/).withMessage('La contraseña debe incluir al menos una letra mayúscula.')
    .matches(/[0-9]/).withMessage('La contraseña debe incluir al menos un número.'),
];

const loginValidator = [
  body('email')
    .trim()
    .isEmail().withMessage('Ingresa un correo electrónico válido.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria.'),
];

const forgotValidator = [
  body('email')
    .trim()
    .isEmail().withMessage('Ingresa un correo electrónico válido.')
    .normalizeEmail(),
];

const resetValidator = [
  body('password')
    .isLength({ min: 8, max: 64 }).withMessage('La nueva contraseña debe tener entre 8 y 64 caracteres.')
    .matches(/[A-Z]/).withMessage('Debe incluir al menos una letra mayúscula.')
    .matches(/[0-9]/).withMessage('Debe incluir al menos un número.'),
];

module.exports = {
  registerValidator,
  loginValidator,
  forgotValidator,
  resetValidator,
};
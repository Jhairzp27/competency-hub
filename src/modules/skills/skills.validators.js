const { body, validationResult } = require('express-validator');
const prisma = require('../../config/db');
const { CATEGORIAS, IMPORTANCIAS, LIMITES } = require('./skills.constants');

const valoresCategoria = CATEGORIAS.map((c) => c.value);
const valoresImportancia = IMPORTANCIAS.map((i) => i.value);

// Letras (con tildes y ñ), números, espacios y símbolos habituales en nombres
// de tecnologías: "Node.js", "C#", "C++", "CI/CD", "HTML y CSS", "Seguridad web (OWASP)".
const PATRON_NOMBRE = /^[\p{L}\p{N} .,+#()/&'-]+$/u;
// Caracteres de control no imprimibles (se permiten salto de línea y tabulación).
const PATRON_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

// express-validator aplica los validadores a cada elemento cuando el valor es un arreglo
// (por ejemplo, ?nombre=a&nombre=b). Este paso exige un único valor de texto.
const esTextoUnico = (campo) =>
  body(campo)
    .custom((value) => value === undefined || typeof value === 'string')
    .withMessage('Envía un único valor de texto.')
    .bail();

// Reglas comunes para crear y actualizar una skill.
// Nota: no se usa .escape(); las vistas EJS escapan con <%= %> y escapar aquí
// guardaría "&amp;" en la base de datos y se mostraría doble escapado.
const skillValidator = [
  esTextoUnico('nombre')
    .trim()
    .customSanitizer((value) => value.replace(/\s+/g, ' '))
    .notEmpty().withMessage('El nombre es obligatorio.').bail()
    .isLength({ min: LIMITES.nombre.min, max: LIMITES.nombre.max })
    .withMessage(`El nombre debe tener entre ${LIMITES.nombre.min} y ${LIMITES.nombre.max} caracteres.`).bail()
    .matches(PATRON_NOMBRE)
    .withMessage('El nombre solo puede contener letras, números, espacios y los símbolos . , + # ( ) / & \' -'),

  esTextoUnico('categoria')
    .trim()
    .notEmpty().withMessage('Selecciona una categoría.').bail()
    .isIn(valoresCategoria).withMessage('La categoría debe ser «Técnica» o «Conductual».'),

  esTextoUnico('nivelEsperado')
    .trim()
    .notEmpty().withMessage('El nivel esperado es obligatorio.').bail()
    .isInt({ min: LIMITES.nivelEsperado.min, max: LIMITES.nivelEsperado.max, allow_leading_zeroes: false })
    .withMessage(`El nivel esperado debe ser un número entero del ${LIMITES.nivelEsperado.min} al ${LIMITES.nivelEsperado.max}.`).bail()
    .toInt(),

  esTextoUnico('importancia')
    .trim()
    .notEmpty().withMessage('Selecciona la importancia.').bail()
    .isIn(valoresImportancia).withMessage('La importancia debe ser «Baja», «Media», «Alta» o «Crítica».'),

  esTextoUnico('descripcion')
    .trim()
    .notEmpty().withMessage('La descripción es obligatoria.').bail()
    .isLength({ min: LIMITES.descripcion.min, max: LIMITES.descripcion.max })
    .withMessage(`La descripción debe tener entre ${LIMITES.descripcion.min} y ${LIMITES.descripcion.max} caracteres.`).bail()
    .not().matches(PATRON_CONTROL).withMessage('La descripción contiene caracteres no permitidos.'),
];

// Nombre único sin distinguir mayúsculas ("React" y "react" se consideran el mismo).
// La restricción UNIQUE de la BD distingue mayúsculas, por eso se comprueba aquí.
// En la edición se excluye la propia skill (req.params.id).
// Se omite si el nombre ya tiene otro error, para no consultar la BD en vano.
const nombreUnicoValidator = body('nombre').custom(async (nombre, { req }) => {
  if (typeof nombre !== 'string' || validationResult(req).array().some((e) => e.path === 'nombre')) {
    return true;
  }
  const idActual = Number.parseInt(req.params?.id, 10);
  const existente = await prisma.skill.findFirst({
    where: {
      nombre: { equals: nombre, mode: 'insensitive' },
      ...(Number.isInteger(idActual) ? { NOT: { id: idActual } } : {}),
    },
    select: { id: true },
  });
  if (existente) throw new Error('Ya existe una skill con ese nombre.');
  return true;
});

module.exports = { skillValidator, nombreUnicoValidator, PATRON_NOMBRE };

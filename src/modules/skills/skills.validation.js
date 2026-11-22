// Manejo de errores de validación del módulo de Skills.
// Si hay errores: vuelve a mostrar el formulario (HTTP 400, igual que el módulo de auth)
// con un mensaje por campo y lo que el usuario escribió. No se toca la base de datos.
// Si no hay errores: deja en req.skillData solo los campos validados (lista blanca).
const { validationResult, matchedData } = require('express-validator');
const { CATEGORIAS, IMPORTANCIAS, LIMITES } = require('./skills.constants');

const CAMPOS = ['nombre', 'categoria', 'nivelEsperado', 'importancia', 'descripcion'];

// Datos que toda vista con el formulario de skill necesita.
function localsFormulario(extra = {}) {
  return {
    CATEGORIAS,
    IMPORTANCIAS,
    LIMITES,
    errors: [],
    fieldErrors: {},
    old: {},
    ...extra,
  };
}

// Primer mensaje de cada campo: { nombre: '...', nivelEsperado: '...' }
function erroresPorCampo(errores) {
  return errores.reduce((mapa, e) => {
    if (e.path && !(e.path in mapa)) mapa[e.path] = e.msg;
    return mapa;
  }, {});
}

// Lo que el usuario escribió (ya recortado por los sanitizadores) para rellenar el formulario.
// Cualquier valor que no sea texto o número (arreglos, objetos) se descarta.
function valoresAnteriores(body = {}) {
  return CAMPOS.reduce((old, campo) => {
    const v = body[campo];
    old[campo] = typeof v === 'string' || typeof v === 'number' ? String(v) : '';
    return old;
  }, {});
}

// Middleware que se coloca después de las cadenas de validación.
//   vista:        vista a renderizar con los errores (p. ej. 'skills/nueva')
//   localsExtra:  función (req) => objeto con datos adicionales de la vista (acción, skill, etc.)
function manejarErroresValidacion(vista, localsExtra = () => ({})) {
  return async (req, res, next) => {
    const resultado = validationResult(req);
    if (resultado.isEmpty()) {
      req.skillData = matchedData(req, { onlyValidData: true, locations: ['body'] });
      return next();
    }
    const fieldErrors = erroresPorCampo(resultado.array());
    return res.status(400).render(
      vista,
      localsFormulario({
        ...(await localsExtra(req)),
        errors: Object.values(fieldErrors).map((msg) => ({ msg })),
        fieldErrors,
        old: valoresAnteriores(req.body),
      })
    );
  };
}

// Traduce un error de Prisma a errores por campo cuando se puede corregir en el formulario.
// P2002: violación de UNIQUE (p. ej. dos usuarios guardan el mismo nombre a la vez).
function errorPrismaACampos(err) {
  if (err && err.code === 'P2002') {
    const target = err.meta && err.meta.target;
    const objetivo = Array.isArray(target) ? target.join(',') : String(target || '');
    if (objetivo.includes('nombre')) return { nombre: 'Ya existe una skill con ese nombre.' };
  }
  return null;
}

module.exports = {
  CAMPOS,
  localsFormulario,
  erroresPorCampo,
  valoresAnteriores,
  manejarErroresValidacion,
  errorPrismaACampos,
};

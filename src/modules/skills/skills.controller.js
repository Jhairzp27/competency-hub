const skillService = require('./skills.service');
const {
  CATEGORIAS,
  IMPORTANCIAS,
  LIMITES,
  etiquetaCategoria,
  etiquetaImportancia,
} = require('./skills.constants');

const valoresCategoria = CATEGORIAS.map((c) => c.value);
const valoresImportancia = IMPORTANCIAS.map((i) => i.value);

// Filtros del listado desde la query string, saneados antes de llegar al servicio:
//  - q: solo texto, sin espacios extremos ni repetidos, máximo 80 caracteres.
//  - categoria / importancia: solo valores permitidos; cualquier otro se ignora.
// Un arreglo (?q=a&q=b) u otro tipo se descarta.
function leerFiltros(query = {}) {
  const texto = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');
  const q = texto(query.q).slice(0, LIMITES.nombre.max);
  const categoria = valoresCategoria.includes(query.categoria) ? query.categoria : '';
  const importancia = valoresImportancia.includes(query.importancia) ? query.importancia : '';
  return { q, categoria, importancia };
}

// Número de página desde ?page=. Cualquier valor no numérico o fuera de rango se trata como 1.
function leerPagina(valor) {
  if (typeof valor !== 'string' || !/^\d{1,6}$/.test(valor)) return 1;
  return Math.max(1, Number.parseInt(valor, 10));
}

// Id de la URL (/skills/:id). Solo enteros positivos que caben en INTEGER de PostgreSQL;
// cualquier otra cosa ("abc", "1.5", "0", "-3", "1e3") se responde como 404.
const MAX_INT = 2147483647;
function leerId(valor) {
  if (typeof valor !== 'string' || !/^[1-9]\d{0,9}$/.test(valor)) return null;
  const id = Number(valor);
  return id <= MAX_INT ? id : null;
}

function skillNoEncontrada(res) {
  return res.status(404).render('errors/error', {
    status: 404,
    heading: 'Skill no encontrada',
    message: 'La skill que buscas no existe o fue eliminada. Vuelve al catálogo para ver las disponibles.',
  });
}

// Fecha legible en español de Ecuador, p. ej. "22 nov 2026, 15:30".
const formatearFecha = (fecha) =>
  new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(fecha);

// Ayudas de presentación disponibles en las vistas de skills.
const helpersVista = { etiquetaCategoria, etiquetaImportancia, formatearFecha, CATEGORIAS, IMPORTANCIAS };

// GET /skills?q=&categoria=&importancia=&page=
exports.listar = async (req, res) => {
  const filtros = leerFiltros(req.query);
  const resultado = await skillService.listar({ ...filtros, page: leerPagina(req.query.page) });
  const hayFiltros = Boolean(filtros.q || filtros.categoria || filtros.importancia);
  // query: filtros activos que la paginación conserva en sus enlaces
  res.render('skills/index', { ...helpersVista, ...resultado, query: filtros, hayFiltros });
};

// GET /skills/:id
exports.detalle = async (req, res) => {
  const id = leerId(req.params.id);
  const skill = id && (await skillService.obtenerPorId(id));
  if (!skill) return skillNoEncontrada(res);
  res.render('skills/detalle', { ...helpersVista, skill });
};

exports.leerFiltros = leerFiltros;
exports.leerPagina = leerPagina;
exports.leerId = leerId;

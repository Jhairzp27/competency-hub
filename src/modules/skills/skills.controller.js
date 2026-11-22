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

// Ayudas de presentación disponibles en las vistas de skills.
const helpersVista = { etiquetaCategoria, etiquetaImportancia, CATEGORIAS, IMPORTANCIAS };

// GET /skills?q=&categoria=&importancia=&page=
exports.listar = async (req, res) => {
  const filtros = leerFiltros(req.query);
  const resultado = await skillService.listar({ ...filtros, page: leerPagina(req.query.page) });
  const hayFiltros = Boolean(filtros.q || filtros.categoria || filtros.importancia);
  // query: filtros activos que la paginación conserva en sus enlaces
  res.render('skills/index', { ...helpersVista, ...resultado, query: filtros, hayFiltros });
};

exports.leerFiltros = leerFiltros;
exports.leerPagina = leerPagina;

const skillService = require('./skills.service');
const { etiquetaCategoria, etiquetaImportancia } = require('./skills.constants');

// Número de página desde ?page=. Cualquier valor no numérico o fuera de rango se trata como 1.
function leerPagina(valor) {
  if (typeof valor !== 'string' || !/^\d{1,6}$/.test(valor)) return 1;
  return Math.max(1, Number.parseInt(valor, 10));
}

// Ayudas de presentación disponibles en las vistas de skills.
const helpersVista = { etiquetaCategoria, etiquetaImportancia };

// GET /skills
exports.listar = async (req, res) => {
  const resultado = await skillService.listar({ page: leerPagina(req.query.page) });
  res.render('skills/index', { ...helpersVista, ...resultado, query: {} });
};

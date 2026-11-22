// Acceso a datos del módulo de Skills (Prisma).
// Todas las consultas pasan por Prisma, que usa parámetros: no se concatena SQL.
const prisma = require('../../config/db');

const TAMANO_PAGINA = 10;

// Prisma no escapa los comodines de LIKE en `contains`: sin esto, buscar "%" o "_"
// devolvería todas las skills. PostgreSQL usa "\" como carácter de escape por defecto.
const escaparLike = (texto) => texto.replace(/[\\%_]/g, '\\$&');

// Condición WHERE a partir de filtros ya validados (ver skills.controller.js).
function construirFiltro({ q, categoria, importancia } = {}) {
  const where = {};
  if (q) where.nombre = { contains: escaparLike(q), mode: 'insensitive' }; // usa el índice GIN de trigramas
  if (categoria) where.categoria = categoria; // usa el índice (categoria, importancia)
  if (importancia) where.importancia = importancia;
  return where;
}

// Listado paginado. Si la página pedida no existe, devuelve la última disponible.
async function listar({ q, categoria, importancia, page = 1 } = {}) {
  const where = construirFiltro({ q, categoria, importancia });
  const totalItems = await prisma.skill.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalItems / TAMANO_PAGINA));
  const pagina = Math.min(Math.max(1, page), totalPages);

  const items = await prisma.skill.findMany({
    where,
    orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
    skip: (pagina - 1) * TAMANO_PAGINA,
    take: TAMANO_PAGINA,
  });

  return { items, page: pagina, totalPages, totalItems, pageSize: TAMANO_PAGINA };
}

async function obtenerPorId(id) {
  return prisma.skill.findUnique({
    where: { id },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

// data: solo los campos validados (req.skillData). createdById sale de la sesión, nunca del formulario.
async function crear(data, usuarioId) {
  return prisma.skill.create({
    data: { ...data, createdById: usuarioId ?? null },
  });
}

// Devuelve null si la skill no existe (error P2025 de Prisma).
async function actualizar(id, data) {
  try {
    return await prisma.skill.update({ where: { id }, data });
  } catch (err) {
    if (err.code === 'P2025') return null;
    throw err;
  }
}

// Devuelve la skill eliminada, o null si no existía.
async function eliminar(id) {
  try {
    return await prisma.skill.delete({ where: { id } });
  } catch (err) {
    if (err.code === 'P2025') return null;
    throw err;
  }
}

module.exports = {
  TAMANO_PAGINA,
  escaparLike,
  construirFiltro,
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
};

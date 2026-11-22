// Valores permitidos y límites de la entidad Skill.
// Fuente única para el validador, las vistas (selects) y el seed.
// Los "value" coinciden con los enums de Prisma (prisma/schema.prisma).

const CATEGORIAS = [
  { value: 'TECNICA', label: 'Técnica' },
  { value: 'CONDUCTUAL', label: 'Conductual' },
];

const IMPORTANCIAS = [
  { value: 'BAJA', label: 'Baja' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'CRITICA', label: 'Crítica' },
];

const LIMITES = {
  nombre: { min: 3, max: 80 },
  descripcion: { min: 10, max: 500 },
  nivelEsperado: { min: 1, max: 5 },
};

const etiqueta = (lista, value) => (lista.find((item) => item.value === value) || {}).label || value;

module.exports = {
  CATEGORIAS,
  IMPORTANCIAS,
  LIMITES,
  etiquetaCategoria: (value) => etiqueta(CATEGORIAS, value),
  etiquetaImportancia: (value) => etiqueta(IMPORTANCIAS, value),
};

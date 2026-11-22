// Datos base (ficticios) del catálogo de skills.
// Idempotente: usa upsert por "nombre" (único), así que puede ejecutarse varias veces
// sin duplicar registros; si una skill ya existe, se actualizan sus atributos.
// Uso: npm run seed
require('dotenv').config();
const prisma = require('../src/config/db');

const skills = [
  // --- Técnicas ---
  { nombre: 'JavaScript', categoria: 'TECNICA', nivelEsperado: 4, importancia: 'CRITICA', descripcion: 'Dominio del lenguaje: ES2015+, asincronía con promesas y async/await, módulos y manejo de errores.' },
  { nombre: 'Node.js y Express', categoria: 'TECNICA', nivelEsperado: 4, importancia: 'CRITICA', descripcion: 'Construcción de APIs y aplicaciones web en el servidor con middlewares, rutas y manejo de sesiones.' },
  { nombre: 'SQL y PostgreSQL', categoria: 'TECNICA', nivelEsperado: 3, importancia: 'ALTA', descripcion: 'Modelado relacional, consultas con JOIN, índices y lectura de planes de ejecución con EXPLAIN.' },
  { nombre: 'Git y GitHub', categoria: 'TECNICA', nivelEsperado: 3, importancia: 'CRITICA', descripcion: 'Trabajo con ramas, pull requests, resolución de conflictos y mensajes de commit convencionales.' },
  { nombre: 'HTML y CSS', categoria: 'TECNICA', nivelEsperado: 3, importancia: 'ALTA', descripcion: 'Maquetación semántica, diseño adaptable con Flexbox y Grid, y buenas prácticas de accesibilidad.' },
  { nombre: 'React', categoria: 'TECNICA', nivelEsperado: 3, importancia: 'MEDIA', descripcion: 'Componentes funcionales, hooks, manejo de estado y consumo de APIs desde el cliente.' },
  { nombre: 'TypeScript', categoria: 'TECNICA', nivelEsperado: 2, importancia: 'MEDIA', descripcion: 'Tipado estático, interfaces, genéricos y configuración del compilador en proyectos Node.' },
  { nombre: 'Docker', categoria: 'TECNICA', nivelEsperado: 2, importancia: 'ALTA', descripcion: 'Creación de imágenes, uso de docker compose y contenedores para entornos de desarrollo.' },
  { nombre: 'Pruebas automatizadas', categoria: 'TECNICA', nivelEsperado: 3, importancia: 'ALTA', descripcion: 'Pruebas unitarias y de integración con Jest o Mocha y supertest; cobertura de casos límite.' },
  { nombre: 'Seguridad web (OWASP)', categoria: 'TECNICA', nivelEsperado: 3, importancia: 'CRITICA', descripcion: 'Prevención de inyección, XSS y CSRF, gestión segura de contraseñas y sesiones según OWASP.' },
  { nombre: 'Diseño de APIs REST', categoria: 'TECNICA', nivelEsperado: 3, importancia: 'ALTA', descripcion: 'Recursos, verbos HTTP, códigos de estado, paginación y versionado de APIs.' },
  { nombre: 'Python', categoria: 'TECNICA', nivelEsperado: 2, importancia: 'BAJA', descripcion: 'Scripts de automatización, manejo de archivos y uso básico de librerías estándar.' },
  { nombre: 'Linux y línea de comandos', categoria: 'TECNICA', nivelEsperado: 2, importancia: 'MEDIA', descripcion: 'Navegación del sistema de archivos, permisos, procesos y scripts básicos de shell.' },
  { nombre: 'Integración y despliegue continuo', categoria: 'TECNICA', nivelEsperado: 1, importancia: 'MEDIA', descripcion: 'Pipelines de CI/CD que ejecutan pruebas y despliegan automáticamente a un entorno.' },
  { nombre: 'Computación en la nube', categoria: 'TECNICA', nivelEsperado: 1, importancia: 'BAJA', descripcion: 'Conceptos de IaaS y PaaS, despliegue de aplicaciones y bases de datos administradas.' },
  { nombre: 'Arquitectura de software', categoria: 'TECNICA', nivelEsperado: 5, importancia: 'ALTA', descripcion: 'Diseño de monolitos modulares y microservicios, patrones y decisiones de arquitectura documentadas.' },
  // --- Conductuales ---
  { nombre: 'Comunicación efectiva', categoria: 'CONDUCTUAL', nivelEsperado: 4, importancia: 'CRITICA', descripcion: 'Expresar ideas técnicas con claridad a clientes y compañeros, de forma oral y escrita.' },
  { nombre: 'Trabajo en equipo', categoria: 'CONDUCTUAL', nivelEsperado: 4, importancia: 'CRITICA', descripcion: 'Colaborar con otros roles, compartir conocimiento y apoyar los objetivos comunes del proyecto.' },
  { nombre: 'Resolución de problemas', categoria: 'CONDUCTUAL', nivelEsperado: 4, importancia: 'ALTA', descripcion: 'Analizar causas, proponer alternativas y tomar decisiones con información incompleta.' },
  { nombre: 'Gestión del tiempo', categoria: 'CONDUCTUAL', nivelEsperado: 3, importancia: 'MEDIA', descripcion: 'Priorizar tareas, estimar esfuerzos y cumplir con los plazos acordados en cada sprint.' },
  { nombre: 'Liderazgo técnico', categoria: 'CONDUCTUAL', nivelEsperado: 5, importancia: 'ALTA', descripcion: 'Guiar al equipo en decisiones técnicas, revisar código y acompañar el crecimiento de otros.' },
  { nombre: 'Adaptabilidad', categoria: 'CONDUCTUAL', nivelEsperado: 3, importancia: 'MEDIA', descripcion: 'Ajustarse a cambios de requisitos, tecnologías o prioridades sin perder productividad.' },
  { nombre: 'Atención al cliente', categoria: 'CONDUCTUAL', nivelEsperado: 2, importancia: 'MEDIA', descripcion: 'Escuchar las necesidades del cliente de la PYME y traducirlas en requisitos verificables.' },
  { nombre: 'Pensamiento crítico', categoria: 'CONDUCTUAL', nivelEsperado: 3, importancia: 'BAJA', descripcion: 'Evaluar argumentos y soluciones con evidencia antes de adoptarlas en el proyecto.' },
  { nombre: 'Aprendizaje continuo', categoria: 'CONDUCTUAL', nivelEsperado: 1, importancia: 'BAJA', descripcion: 'Interés por actualizarse en nuevas herramientas y compartir lo aprendido con el equipo.' },
];

async function main() {
  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { nombre: skill.nombre },
      update: skill,
      create: skill,
    });
  }
  const total = await prisma.skill.count();
  console.log(`Seed completado: ${skills.length} skills procesadas, ${total} en la base de datos.`);
}

main()
  .catch((err) => {
    console.error('Error al ejecutar el seed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

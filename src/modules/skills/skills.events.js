// Eventos de la aplicación del módulo de Skills.
// Punto de integración con el módulo de tiempo real (Sergio): el CRUD solo emite eventos
// y no conoce Socket.IO. Así el CRUD se puede probar sin sockets y el chat sin el CRUD.
//
// Eventos (se emiten después de guardar correctamente en la BD):
//   'skill:created'  payload: { id, nombre, categoria, nivelEsperado, importancia, por }
//   'skill:updated'  payload: { id, nombre, categoria, nivelEsperado, importancia, por }
//   (por = nombre del usuario que hizo el cambio)
//
// Ejemplo de uso en src/server.js, donde ya existe `io`:
//   const { skillEvents } = require('./modules/skills/skills.events');
//   skillEvents.on('skill:created', (skill) => io.emit('skill:created', skill));
//   skillEvents.on('skill:updated', (skill) => io.emit('skill:updated', skill));
const { EventEmitter } = require('events');

const skillEvents = new EventEmitter();

// Datos públicos de la skill para la notificación (sin descripción ni ids de usuario).
function payload(skill, usuario) {
  return {
    id: skill.id,
    nombre: skill.nombre,
    categoria: skill.categoria,
    nivelEsperado: skill.nivelEsperado,
    importancia: skill.importancia,
    por: usuario ? usuario.name : null,
  };
}

// Emite el evento sin dejar que un fallo de un oyente rompa la petición:
// la skill ya se guardó, la notificación es secundaria.
function notificar(evento, skill, usuario) {
  try {
    skillEvents.emit(evento, payload(skill, usuario));
  } catch (err) {
    console.error(`Error al notificar ${evento}:`, err);
  }
}

module.exports = { skillEvents, notificar, payload };

/**
 * Notificaciones en tiempo real (namespace /notifications).
 *
 * Todas las páginas con sesión iniciada se conectan a este namespace (ver
 * views/partials/footer.ejs y /js/realtime.js) y muestran un toast cuando otra
 * persona crea o actualiza una skill del catálogo.
 *
 * Contrato de eventos (servidor -> clientes):
 *   skill:created  { id, nombre, by, at }
 *   skill:updated  { id, nombre, by, at }
 *
 * Uso desde el CRUD de skills, DESPUÉS de guardar en la BD:
 *   const { notifySkillChange } = require('../notifications/notifications.socket');
 *   notifySkillChange(req, 'created', skill);   // o 'updated'
 */
const { authenticateHandshake } = require('../../middlewares/socket-auth.middleware');

const NOTIFICATIONS_NAMESPACE = '/notifications';
const SKILL_EVENTS = { created: 'skill:created', updated: 'skill:updated' };

// Cada usuario tiene su propia sala para poder excluirlo de sus propios avisos
const userRoom = (userId) => `user:${userId}`;

function registerNotifications(io) {
  const notifications = io.of(NOTIFICATIONS_NAMESPACE);
  notifications.use(authenticateHandshake);
  notifications.on('connection', (socket) => {
    socket.join(userRoom(socket.data.user.id));
  });
}

/**
 * Avisa a los demás usuarios conectados que una skill se creó o se actualizó.
 * Quien hizo el cambio no recibe el toast (ya ve el mensaje flash de confirmación).
 * Devuelve true si se emitió el aviso.
 */
function notifySkillChange(req, action, skill) {
  const event = SKILL_EVENTS[action];
  if (!event) {
    throw new Error(`Acción de notificación desconocida: ${action}. Usa 'created' o 'updated'.`);
  }

  const io = req.app.get('io');
  // Sin servidor de sockets (p. ej. pruebas con supertest) o sin skill, no hay nada que avisar
  if (!io || !skill) return false;

  const actor = req.session && req.session.user;
  // Solo datos públicos del catálogo: nunca correos ni otros datos personales
  const payload = {
    id: skill.id,
    nombre: skill.nombre,
    by: actor ? actor.name : 'Alguien',
    at: new Date().toISOString(),
  };

  const notifications = io.of(NOTIFICATIONS_NAMESPACE);
  const target = actor ? notifications.except(userRoom(actor.id)) : notifications;
  target.emit(event, payload);
  return true;
}

module.exports = {
  registerNotifications,
  notifySkillChange,
  NOTIFICATIONS_NAMESPACE,
  SKILL_EVENTS,
};

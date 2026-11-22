/**
 * Notificaciones en tiempo real (namespace /notifications).
 *
 * Todas las páginas con sesión iniciada se conectan a este namespace (ver
 * views/partials/footer.ejs y /js/realtime.js) y muestran un toast cuando otra
 * persona crea o actualiza una skill del catálogo.
 *
 * Puente entre el CRUD y los navegadores:
 *   CRUD de skills --notificar()--> skillEvents (EventEmitter de Node, skills.events.js)
 *                  --este módulo--> Socket.IO /notifications --> realtime.js --> Toast
 * Así el CRUD no depende de Socket.IO y cada parte se puede probar por separado.
 *
 * Contrato de eventos (servidor -> clientes):
 *   skill:created  { id, nombre, by, at }
 *   skill:updated  { id, nombre, by, at }
 */
const { authenticateHandshake } = require('../../middlewares/socket-auth.middleware');
const { skillEvents } = require('../skills/skills.events');

const NOTIFICATIONS_NAMESPACE = '/notifications';
const SKILL_EVENTS = ['skill:created', 'skill:updated'];

// Cada usuario tiene su propia sala para poder excluirlo de sus propios avisos
const userRoom = (userId) => `user:${userId}`;

/** Datos que viajan al navegador: solo información pública del catálogo. */
function toNotification(skill) {
  return {
    id: skill.id,
    nombre: skill.nombre,
    by: skill.por || 'Alguien',
    at: new Date().toISOString(),
  };
}

/**
 * Registra el namespace y se suscribe a los eventos del CRUD de skills.
 * Devuelve una función que quita las suscripciones.
 */
function registerNotifications(io) {
  const notifications = io.of(NOTIFICATIONS_NAMESPACE);
  notifications.use(authenticateHandshake);
  notifications.on('connection', (socket) => {
    socket.join(userRoom(socket.data.user.id));
  });

  const listeners = SKILL_EVENTS.map((event) => {
    const listener = (skill, meta = {}) => {
      // Quien hizo el cambio no recibe el toast: ya ve el mensaje flash de confirmación
      const target = meta.actorId ? notifications.except(userRoom(meta.actorId)) : notifications;
      target.emit(event, toNotification(skill));
    };
    skillEvents.on(event, listener);
    return [event, listener];
  });

  return () => listeners.forEach(([event, listener]) => skillEvents.off(event, listener));
}

module.exports = {
  registerNotifications,
  toNotification,
  NOTIFICATIONS_NAMESPACE,
  SKILL_EVENTS,
};

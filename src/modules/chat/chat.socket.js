/**
 * Chat en tiempo real con Socket.IO (namespace /chat, sala general).
 *
 * El chat tiene su propio namespace para que la lista de conectados solo cuente a quienes
 * están en la pantalla del chat (las notificaciones de skills usan /notifications en todas
 * las páginas). Ambos namespaces comparten una sola conexión WebSocket (multiplexación).
 *
 * Contrato de eventos:
 *   Cliente -> servidor
 *     chat:send   { content }            con ack -> { ok: true, message } | { ok: false, error }
 *   Servidor -> clientes
 *     chat:message { id, userId, author, content, createdAt }   (a toda la sala, incluido quien lo envió)
 *     chat:users   [{ id, name }]                                (lista de conectados)
 *     chat:system  { text, createdAt }                           (alguien se unió o salió)
 *     chat:error   { code, error }                               (p. ej. sesión expirada; luego se desconecta)
 *
 * El handshake se autentica con la sesión de Express (ver middlewares/socket-auth.middleware.js).
 */
const prisma = require('../../config/db');
const { authenticateHandshake } = require('../../middlewares/socket-auth.middleware');
const { CHAT_NAMESPACE, GENERAL_ROOM } = require('./chat.constants');
const { validateMessage } = require('./chat.validators');
const { toMessageDTO } = require('./chat.controller');

// Máximo de mensajes por usuario en una ventana de tiempo (evita inundar el chat)
const RATE_LIMIT = { max: 5, windowMs: 5000 };

// Usuarios conectados: userId -> { id, name, connections, sentAt }
// Se cuentan las conexiones para que alguien con dos pestañas abiertas aparezca una sola vez.
const onlineUsers = new Map();

/**
 * Vuelve a leer la sesión desde la BD: si el usuario cerró sesión o la sesión expiró
 * después de conectarse, el socket deja de ser válido.
 */
function isSessionStillValid(socket) {
  return new Promise((resolve) => {
    const session = socket.request.session;
    if (!session) return resolve(false);
    session.reload((err) => {
      // reload() reemplaza socket.request.session por la versión guardada en la BD
      const current = socket.request.session;
      resolve(!err && Boolean(current && current.user) && current.user.id === socket.data.user.id);
    });
  });
}

/** Devuelve true si el usuario superó el límite de mensajes; si no, registra el envío. */
function isRateLimited(entry, now = Date.now()) {
  entry.sentAt = entry.sentAt.filter((time) => now - time < RATE_LIMIT.windowMs);
  if (entry.sentAt.length >= RATE_LIMIT.max) return true;
  entry.sentAt.push(now);
  return false;
}

function onlineList() {
  return [...onlineUsers.values()]
    .map(({ id, name }) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

function systemMessage(text) {
  return { text, createdAt: new Date() };
}

function registerChat(io) {
  const chat = io.of(CHAT_NAMESPACE);
  chat.use(authenticateHandshake);

  chat.on('connection', (socket) => {
    const { id, name } = socket.data.user;
    socket.join(GENERAL_ROOM);

    let entry = onlineUsers.get(id);
    if (!entry) {
      entry = { id, name, connections: 0, sentAt: [] };
      onlineUsers.set(id, entry);
    }
    entry.connections += 1;

    // Aviso solo en la primera pestaña del usuario
    if (entry.connections === 1) {
      socket.to(GENERAL_ROOM).emit('chat:system', systemMessage(`${name} se unió al chat`));
    }
    chat.to(GENERAL_ROOM).emit('chat:users', onlineList());
    console.log(`[chat] Conectado: usuario ${id} (${entry.connections} conexión/es)`);

    socket.on('chat:send', async (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};

      if (!(await isSessionStillValid(socket))) {
        const error = 'Tu sesión expiró. Vuelve a iniciar sesión.';
        reply({ ok: false, error });
        socket.emit('chat:error', { code: 'SESSION_EXPIRED', error });
        socket.disconnect(true);
        return;
      }

      if (isRateLimited(entry)) {
        return reply({ ok: false, error: 'Estás enviando mensajes muy rápido. Espera unos segundos.' });
      }

      const result = validateMessage(payload);
      if (!result.ok) {
        return reply({ ok: false, error: result.error });
      }

      try {
        const saved = await prisma.chatMessage.create({
          data: { content: result.content, room: GENERAL_ROOM, userId: id },
          include: { user: { select: { name: true } } },
        });
        const message = toMessageDTO(saved);
        // Se envía a toda la sala (incluido el autor): el cliente pinta el mensaje al recibir este evento
        chat.to(GENERAL_ROOM).emit('chat:message', message);
        reply({ ok: true, message });
      } catch (err) {
        console.error('[chat] Error al guardar el mensaje:', err);
        reply({ ok: false, error: 'No se pudo enviar el mensaje. Intenta de nuevo.' });
      }
    });

    socket.on('disconnect', () => {
      const current = onlineUsers.get(id);
      if (!current) return;
      current.connections -= 1;
      if (current.connections <= 0) {
        onlineUsers.delete(id);
        chat.to(GENERAL_ROOM).emit('chat:system', systemMessage(`${name} salió del chat`));
      }
      chat.to(GENERAL_ROOM).emit('chat:users', onlineList());
      console.log(`[chat] Desconectado: usuario ${id}`);
    });
  });
}

module.exports = {
  registerChat,
  // Exportados para las pruebas automatizadas
  isRateLimited,
  RATE_LIMIT,
};

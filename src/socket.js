/**
 * Servidor de tiempo real (Socket.IO) montado sobre el mismo servidor HTTP de Express.
 * Se usa en server.js y en las pruebas automatizadas, para que ambos tengan
 * exactamente la misma configuración.
 */
const { Server } = require('socket.io');
const { sessionMiddleware } = require('./config/session');
const { authenticateHandshake } = require('./middlewares/socket-auth.middleware');
const { registerChat } = require('./modules/chat/chat.socket');
const { registerNotifications } = require('./modules/notifications/notifications.socket');

function createSocketServer(httpServer, app) {
  const io = new Server(httpServer, {
    // Un mensaje de chat ocupa pocos KB: se limita lo que puede enviar un cliente (por defecto 1 MB)
    maxHttpBufferSize: 1e4,
  });

  // Comparte la sesión de Express con Socket.IO para autenticar el handshake
  io.engine.use(sessionMiddleware);

  // Guardamos io en app para que el CRUD de Isaac pueda emitir notificaciones en tiempo real
  // (ver notifySkillChange en modules/notifications/notifications.socket.js)
  app.set('io', io);

  // El namespace principal "/" no se usa, pero también exige sesión
  io.use(authenticateHandshake);

  // Namespace /chat: autenticación en el handshake, sala general, mensajes y usuarios conectados
  registerChat(io);

  // Namespace /notifications: avisos en todas las páginas cuando se crea o actualiza una skill
  registerNotifications(io);

  return io;
}

module.exports = { createSocketServer };

require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { sessionMiddleware } = require('./config/session');
const { authenticateHandshake } = require('./middlewares/socket-auth.middleware');
const { registerChat } = require('./modules/chat/chat.socket');
const { registerNotifications } = require('./modules/notifications/notifications.socket');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
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

server.listen(PORT, () => {
  console.log(`Servidor corriendo en ${process.env.APP_URL || `http://localhost:${PORT}`}`);
});
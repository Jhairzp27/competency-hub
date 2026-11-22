require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { sessionMiddleware } = require('./config/session');
const { registerChat } = require('./modules/chat/chat.socket');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
  // Un mensaje de chat ocupa pocos KB: se limita lo que puede enviar un cliente (por defecto 1 MB)
  maxHttpBufferSize: 1e4,
});

// Comparte la sesión de Express con Socket.IO para autenticar el handshake
io.engine.use(sessionMiddleware);

// Guardamos io en app para que el CRUD de Isaac pueda emitir notificaciones en tiempo real
app.set('io', io);

// Chat en tiempo real: autenticación en el handshake, sala general, mensajes y usuarios conectados
registerChat(io);

server.listen(PORT, () => {
  console.log(`Servidor corriendo en ${process.env.APP_URL || `http://localhost:${PORT}`}`);
});
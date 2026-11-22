require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { sessionMiddleware } = require('./config/session');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server);

// Comparte la sesión de Express con Socket.IO para autenticar el handshake
io.engine.use(sessionMiddleware);

// Guardamos io en app para que el CRUD de Isaac pueda emitir notificaciones en tiempo real
app.set('io', io);

// Base mínima de conexión para que Sergio continúe aquí su módulo de chat
io.on('connection', (socket) => {
  const user = socket.request.session?.user;
  if (!user) {
    socket.disconnect(true);
    return;
  }
  console.log(`Usuario conectado por WebSocket: ${user.email}`);
});

server.listen(PORT, () => {
  console.log(`Servidor corriendo en ${process.env.APP_URL || `http://localhost:${PORT}`}`);
});
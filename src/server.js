require('dotenv').config();
const http = require('http');
const app = require('./app');
const { createSocketServer } = require('./socket');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Socket.IO corre dentro del mismo servidor HTTP (chat y notificaciones en tiempo real)
createSocketServer(server, app);

server.listen(PORT, () => {
  console.log(`Servidor corriendo en ${process.env.APP_URL || `http://localhost:${PORT}`}`);
});

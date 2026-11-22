/**
 * Autenticación del handshake de Socket.IO (se usa en todos los namespaces).
 *
 * La sesión de Express se comparte con Socket.IO en server.js
 * (io.engine.use(sessionMiddleware)), así que el handshake llega con la cookie
 * de sesión y aquí se decide si la conexión se acepta.
 */

/**
 * Defensa contra Cross-Site WebSocket Hijacking: el navegador siempre envía Origin en el
 * handshake, y debe coincidir con el host de la app. Los clientes que no son navegadores
 * (pruebas, scripts) no envían Origin ni tienen cookies de otro sitio, así que se aceptan.
 */
function isSameOrigin(headers) {
  const { origin, host } = headers;
  if (!origin) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Middleware de Socket.IO: rechaza la conexión si viene de otro origen o no hay sesión. */
function authenticateHandshake(socket, next) {
  if (!isSameOrigin(socket.handshake.headers)) {
    return next(new Error('Origen no permitido'));
  }
  const user = socket.request.session && socket.request.session.user;
  if (!user) {
    return next(new Error('No autorizado'));
  }
  // Solo se guardan los datos necesarios; el autor de cada mensaje sale de aquí, nunca del cliente
  socket.data.user = { id: user.id, name: user.name };
  next();
}

module.exports = { authenticateHandshake, isSameOrigin };

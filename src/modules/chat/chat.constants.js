/**
 * Constantes del módulo de chat. Se comparten entre la vista, la validación
 * del servidor y el WebSocket para que los límites sean siempre los mismos
 * (y coinciden con las restricciones CHECK de la tabla chat_messages).
 */
module.exports = {
  // Namespace de Socket.IO del chat (separado del de notificaciones)
  CHAT_NAMESPACE: '/chat',
  // Sala única del primer bimestre (la columna room deja preparado el modelo para más salas)
  GENERAL_ROOM: 'general',
  // Largo máximo de un mensaje, en caracteres, después de quitar espacios extremos
  MAX_MESSAGE_LENGTH: 500,
  // Cantidad de mensajes del historial que se muestran al abrir el chat
  HISTORY_LIMIT: 50,
};

const prisma = require('../../config/db');
const { GENERAL_ROOM, MAX_MESSAGE_LENGTH, HISTORY_LIMIT } = require('./chat.constants');

/**
 * Formato único de un mensaje para la vista y para el WebSocket.
 * Solo expone los datos necesarios (nunca el correo ni otros datos del usuario).
 */
function toMessageDTO(message) {
  return {
    id: message.id,
    userId: message.userId,
    author: message.user ? message.user.name : 'Usuario',
    content: message.content,
    createdAt: message.createdAt,
  };
}

/**
 * Últimos mensajes de una sala, en orden cronológico (del más antiguo al más nuevo).
 * Se piden en orden descendente para aprovechar el índice (room, created_at)
 * y quedarse con los N más recientes; luego se invierten para mostrarlos.
 */
async function getRecentMessages(room = GENERAL_ROOM, limit = HISTORY_LIMIT) {
  const latest = await prisma.chatMessage.findMany({
    where: { room },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
    include: { user: { select: { name: true } } },
  });
  return latest.reverse().map(toMessageDTO);
}

// --- VISTAS ---
exports.showChat = async (req, res, next) => {
  try {
    const messages = await getRecentMessages();
    res.render('chat', { messages, maxLength: MAX_MESSAGE_LENGTH });
  } catch (err) {
    next(err);
  }
};

exports.toMessageDTO = toMessageDTO;
exports.getRecentMessages = getRecentMessages;

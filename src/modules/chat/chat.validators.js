/**
 * Validación y saneamiento de los mensajes que llegan por WebSocket.
 *
 * El texto se guarda tal cual lo escribió el usuario (sin convertir a HTML):
 * la protección contra XSS se aplica al mostrarlo, con el escape de EJS
 * (<%= %>) en el historial y con textContent en ChatUI para los mensajes en vivo.
 * Aquí solo se valida el tipo y el largo, y se quitan caracteres invisibles
 * que no tienen sentido en un chat.
 */
const { MAX_MESSAGE_LENGTH } = require('./chat.constants');

// Caracteres de control ASCII (excepto tabulación y salto de línea)
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
// Marcas de dirección bidireccional: permiten disfrazar el texto ("Trojan Source")
const BIDI_CHARS = /[‪-‮⁦-⁩]/g;
// Más de 2 saltos de línea seguidos se reducen a 2 (evita mensajes "en blanco" gigantes)
const EXTRA_NEWLINES = /\n{3,}/g;

/**
 * Limpia el texto: normaliza saltos de línea, quita caracteres invisibles
 * peligrosos y espacios al inicio y al final.
 */
function sanitizeContent(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARS, '')
    .replace(BIDI_CHARS, '')
    .replace(EXTRA_NEWLINES, '\n\n')
    .trim();
}

/**
 * Valida el payload del evento chat:send, que debe ser { content: string }.
 * Devuelve { ok: true, content } con el texto limpio, o { ok: false, error }
 * con un mensaje claro para mostrar al usuario.
 */
function validateMessage(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, error: 'Formato de mensaje inválido.' };
  }
  if (typeof payload.content !== 'string') {
    return { ok: false, error: 'El mensaje debe ser texto.' };
  }

  const content = sanitizeContent(payload.content);

  if (content.length === 0) {
    return { ok: false, error: 'El mensaje no puede estar vacío.' };
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `El mensaje no puede superar los ${MAX_MESSAGE_LENGTH} caracteres.` };
  }

  return { ok: true, content };
}

module.exports = { validateMessage, sanitizeContent };

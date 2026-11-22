// Pruebas de la validación y el saneamiento de los mensajes del chat (Sergio).
// Son pruebas unitarias: no necesitan base de datos ni servidor.
const { validateMessage, sanitizeContent } = require('../src/modules/chat/chat.validators');
const { MAX_MESSAGE_LENGTH } = require('../src/modules/chat/chat.constants');
const { isSameOrigin } = require('../src/middlewares/socket-auth.middleware');

describe('Validación de mensajes del chat (servidor)', () => {
  test('acepta un mensaje válido y quita los espacios de los extremos', () => {
    expect(validateMessage({ content: '   Hola equipo   ' })).toEqual({ ok: true, content: 'Hola equipo' });
  });

  test('rechaza mensajes vacíos o con solo espacios y saltos de línea', () => {
    for (const content of ['', '     ', '\n\n\t  \n']) {
      expect(validateMessage({ content })).toEqual({ ok: false, error: 'El mensaje no puede estar vacío.' });
    }
  });

  test(`acepta exactamente ${MAX_MESSAGE_LENGTH} caracteres y rechaza uno más`, () => {
    expect(validateMessage({ content: 'a'.repeat(MAX_MESSAGE_LENGTH) }).ok).toBe(true);
    expect(validateMessage({ content: 'a'.repeat(MAX_MESSAGE_LENGTH + 1) })).toEqual({
      ok: false,
      error: `El mensaje no puede superar los ${MAX_MESSAGE_LENGTH} caracteres.`,
    });
  });

  test('el largo se mide después de limpiar los espacios extremos', () => {
    const content = `   ${'a'.repeat(MAX_MESSAGE_LENGTH)}   `;
    expect(validateMessage({ content })).toEqual({ ok: true, content: 'a'.repeat(MAX_MESSAGE_LENGTH) });
  });

  test('rechaza contenido que no es texto (tipos)', () => {
    for (const content of [123, true, null, undefined, ['hola'], { texto: 'hola' }]) {
      expect(validateMessage({ content })).toEqual({ ok: false, error: 'El mensaje debe ser texto.' });
    }
  });

  test('rechaza payloads que no son un objeto { content }', () => {
    for (const payload of ['hola', 42, null, undefined, ['hola']]) {
      expect(validateMessage(payload)).toEqual({ ok: false, error: 'Formato de mensaje inválido.' });
    }
  });

  test('no convierte el HTML: se guarda como texto y se escapa al mostrarlo (EJS / textContent)', () => {
    const content = '<script>alert("xss")</script>';
    expect(validateMessage({ content })).toEqual({ ok: true, content });
  });
});

describe('Saneamiento de mensajes', () => {
  test('quita caracteres de control y marcas bidireccionales (Trojan Source)', () => {
    expect(sanitizeContent('ho\u0000la\u0007 mun‮do⁦')).toBe('hola mundo');
  });

  test('normaliza saltos de línea de Windows y limita los saltos seguidos a 2', () => {
    expect(sanitizeContent('uno\r\ndos\r\n\r\n\r\n\r\ntres')).toBe('uno\ndos\n\ntres');
  });

  test('conserva tabulaciones, acentos y emojis', () => {
    expect(sanitizeContent('código\tñandú 👍')).toBe('código\tñandú 👍');
  });
});

describe('Origen del handshake de Socket.IO (Cross-Site WebSocket Hijacking)', () => {
  test('acepta el mismo origen que el host de la app', () => {
    expect(isSameOrigin({ origin: 'http://localhost:3000', host: 'localhost:3000' })).toBe(true);
    expect(isSameOrigin({ origin: 'https://competency.example.com', host: 'competency.example.com' })).toBe(true);
  });

  test('rechaza otros sitios, otros puertos y orígenes mal formados', () => {
    expect(isSameOrigin({ origin: 'http://sitio-malicioso.example', host: 'localhost:3000' })).toBe(false);
    expect(isSameOrigin({ origin: 'http://localhost:4000', host: 'localhost:3000' })).toBe(false);
    expect(isSameOrigin({ origin: 'no-es-una-url', host: 'localhost:3000' })).toBe(false);
  });

  test('acepta clientes que no son navegadores (sin cabecera Origin)', () => {
    expect(isSameOrigin({ host: 'localhost:3000' })).toBe(true);
  });
});

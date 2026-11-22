// Pruebas de integración del tiempo real (Socket.IO): servidor HTTP real en un puerto libre,
// la misma configuración que server.js (createSocketServer) y clientes socket.io-client.
// No necesitan PostgreSQL: Prisma se reemplaza por un mock y las sesiones usan memoria.
const http = require('http');
const bcrypt = require('bcrypt');
const { io: connectClient } = require('socket.io-client');

jest.mock('../src/config/session', () => {
  const session = require('express-session');
  return {
    sessionMiddleware: session({
      secret: 'secreto-solo-para-pruebas',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax' },
    }),
    pgPool: { end: jest.fn() },
  };
});

jest.mock('../src/config/db', () => ({
  user: { findUnique: jest.fn() },
  chatMessage: { findMany: jest.fn(), create: jest.fn() },
  skill: { findFirst: jest.fn(), create: jest.fn() },
}));

const prisma = require('../src/config/db');
const app = require('../src/app');
const { createSocketServer } = require('../src/socket');
const { notificar } = require('../src/modules/skills/skills.events');
const { RATE_LIMIT } = require('../src/modules/chat/chat.socket');

const PASSWORD = 'Prueba1234';
const USERS = {
  1: { id: 1, name: 'Ana Torres', email: 'ana.torres@example.com' },
  2: { id: 2, name: 'Beto Ruiz', email: 'beto.ruiz@example.com' },
  3: { id: 3, name: 'Carla Vega', email: 'carla.vega@example.com' },
};

let server;
let io;
let baseUrl;
const cookies = {};
const openSockets = [];

// --- Utilidades ---------------------------------------------------------------

/** Inicia sesión por HTTP (con CSRF) y devuelve la cookie de sesión "connect.sid=...". */
async function loginAs(user) {
  let cookie = '';
  const keepCookie = (res) => {
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return res;
  };
  const page = keepCookie(await fetch(`${baseUrl}/auth/login`));
  const _csrf = (await page.text()).match(/name="_csrf" value="([^"]+)"/)[1];
  const res = keepCookie(await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ _csrf, email: user.email, password: PASSWORD }).toString(),
  }));
  if (res.status !== 302) throw new Error(`No se pudo iniciar sesión como ${user.name}`);
  return cookie;
}

/** Conecta un cliente a un namespace. Cada cliente usa su propia conexión (forceNew). */
function connect(namespace, cookie, options = {}) {
  return new Promise((resolve, reject) => {
    const socket = connectClient(baseUrl + namespace, {
      forceNew: true,
      reconnection: false,
      transports: ['websocket'],
      extraHeaders: cookie ? { cookie } : {},
      ...options,
    });
    openSockets.push(socket);
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', (err) => reject(err));
  });
}

/** Espera un evento que cumpla la condición; falla si no llega a tiempo. */
function waitFor(socket, event, predicate = () => true, ms = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`No llegó el evento ${event}`));
    }, ms);
    function handler(data) {
      if (!predicate(data)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(data);
    }
    socket.on(event, handler);
  });
}

/** Registra si llega un evento en un tiempo dado (para comprobar que NO llega). */
function collect(socket, event, ms = 300) {
  const received = [];
  socket.on(event, (data) => received.push(data));
  return new Promise((resolve) => setTimeout(() => resolve(received), ms));
}

const send = (socket, payload) => socket.timeout(2000).emitWithAck('chat:send', payload);

// --- Preparación --------------------------------------------------------------

beforeAll(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {}); // silencia los logs de conexión del chat
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  prisma.user.findUnique.mockImplementation(async ({ where }) => {
    const user = Object.values(USERS).find((u) => u.email === where.email);
    return user ? { ...user, passwordHash, role: 'USER' } : null;
  });
  prisma.chatMessage.findMany.mockResolvedValue([]);

  server = http.createServer(app);
  io = createSocketServer(server, app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  cookies.ana = await loginAs(USERS[1]);
  cookies.beto = await loginAs(USERS[2]);
});

beforeEach(() => {
  let nextId = 1;
  prisma.chatMessage.create.mockReset();
  prisma.chatMessage.create.mockImplementation(async ({ data }) => ({
    id: nextId++,
    ...data,
    createdAt: new Date(),
    user: { name: USERS[data.userId].name },
  }));
});

afterEach(async () => {
  // Cierra los clientes y espera a que el servidor procese las desconexiones
  openSockets.splice(0).forEach((socket) => socket.close());
  for (let i = 0; i < 40 && (io.of('/chat').sockets.size > 0 || io.of('/notifications').sockets.size > 0); i++) {
    await new Promise((r) => setTimeout(r, 25));
  }
});

afterAll(async () => {
  await io.close(); // cierra también el servidor HTTP
});

// --- Pruebas ------------------------------------------------------------------

describe('Autenticación del handshake', () => {
  test.each(['/', '/chat', '/notifications'])('sin sesión, el namespace %s rechaza la conexión', async (namespace) => {
    await expect(connect(namespace, null)).rejects.toThrow('No autorizado');
  });

  test('con sesión pero desde otro sitio web (Origin distinto), se rechaza', async () => {
    await expect(connect('/chat', cookies.ana, { extraHeaders: { cookie: cookies.ana, origin: 'http://sitio-malicioso.example' } }))
      .rejects.toThrow('Origen no permitido');
  });

  test('con una sesión válida, la conexión se acepta', async () => {
    const socket = await connect('/chat', cookies.ana);
    expect(socket.connected).toBe(true);
  });
});

describe('Chat en tiempo real (sala general)', () => {
  test('un mensaje llega en vivo al otro usuario y se guarda con el autor de la sesión, no el que envía el cliente', async () => {
    const ana = await connect('/chat', cookies.ana);
    const beto = await connect('/chat', cookies.beto);

    const llega = waitFor(beto, 'chat:message');
    const ack = await send(ana, { content: '  Hola Beto  ', userId: 2, author: 'Impostor' });
    const mensaje = await llega;

    expect(ack.ok).toBe(true);
    expect(mensaje).toMatchObject({ userId: 1, author: 'Ana Torres', content: 'Hola Beto' });
    expect(prisma.chatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { content: 'Hola Beto', room: 'general', userId: 1 } }),
    );
  });

  test('los mensajes inválidos se rechazan con un error claro y no se guardan', async () => {
    const ana = await connect('/chat', cookies.ana);

    await expect(send(ana, { content: '    ' })).resolves.toEqual({ ok: false, error: 'El mensaje no puede estar vacío.' });
    await expect(send(ana, { content: 'x'.repeat(501) })).resolves.toEqual({ ok: false, error: 'El mensaje no puede superar los 500 caracteres.' });
    await expect(send(ana, { content: 123 })).resolves.toEqual({ ok: false, error: 'El mensaje debe ser texto.' });
    expect(prisma.chatMessage.create).not.toHaveBeenCalled();
  });

  test(`limita la frecuencia: máximo ${RATE_LIMIT.max} mensajes cada ${RATE_LIMIT.windowMs / 1000} s por usuario`, async () => {
    const beto = await connect('/chat', cookies.beto);
    for (let i = 1; i <= RATE_LIMIT.max; i++) {
      await expect(send(beto, { content: `mensaje ${i}` })).resolves.toMatchObject({ ok: true });
    }
    const extra = await send(beto, { content: 'uno de más' });
    expect(extra).toEqual({ ok: false, error: 'Estás enviando mensajes muy rápido. Espera unos segundos.' });
    expect(prisma.chatMessage.create).toHaveBeenCalledTimes(RATE_LIMIT.max);
  });

  test('muestra los usuarios conectados (sin duplicar pestañas) y avisa al entrar y al salir', async () => {
    const ana = await connect('/chat', cookies.ana);

    const listaConDos = waitFor(ana, 'chat:users', (users) => users.length === 2);
    const seUnio = waitFor(ana, 'chat:system', (m) => m.text === 'Beto Ruiz se unió al chat');
    const betoPestana1 = await connect('/chat', cookies.beto);
    const betoPestana2 = await connect('/chat', cookies.beto); // misma persona, otra pestaña
    await seUnio;
    expect((await listaConDos).map((u) => u.name)).toEqual(['Ana Torres', 'Beto Ruiz']);

    const salio = waitFor(ana, 'chat:system', (m) => m.text === 'Beto Ruiz salió del chat');
    const listaConUno = waitFor(ana, 'chat:users', (users) => users.length === 1);
    betoPestana1.close();
    betoPestana2.close();
    await salio;
    expect(await listaConUno).toEqual([{ id: 1, name: 'Ana Torres' }]);
  });

  test('al cerrar sesión, el socket deja de poder enviar mensajes y se desconecta', async () => {
    const cookie = await loginAs(USERS[3]);
    const carla = await connect('/chat', cookie);

    // Cierra sesión por HTTP (con su token CSRF)
    const dashboard = await fetch(`${baseUrl}/dashboard`, { headers: { cookie } });
    const _csrf = (await dashboard.text()).match(/name="_csrf" value="([^"]+)"/)[1];
    await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
      body: new URLSearchParams({ _csrf }).toString(),
    });

    const error = waitFor(carla, 'chat:error');
    const desconectado = waitFor(carla, 'disconnect');
    await expect(send(carla, { content: 'hola' })).resolves.toEqual({ ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' });
    await expect(error).resolves.toMatchObject({ code: 'SESSION_EXPIRED' });
    await desconectado;
    expect(prisma.chatMessage.create).not.toHaveBeenCalled();
  });
});

describe('Notificación en tiempo real de skills', () => {
  test('crear una skill por HTTP (CRUD) avisa a los demás conectados, pero no a quien la creó', async () => {
    const skill = {
      id: 5, nombre: 'Docker', categoria: 'TECNICA', nivelEsperado: 2, importancia: 'ALTA',
      descripcion: 'Contenedores para entornos de desarrollo.', createdById: 1,
    };
    prisma.skill.findFirst.mockResolvedValue(null); // el nombre no está repetido
    prisma.skill.create.mockResolvedValue(skill);

    const ana = await connect('/notifications', cookies.ana);
    const beto = await connect('/notifications', cookies.beto);
    const avisosAna = collect(ana, 'skill:created', 500);
    const avisoBeto = waitFor(beto, 'skill:created');

    // Ana crea la skill con el formulario del CRUD (con su token CSRF)
    const form = await fetch(`${baseUrl}/skills/nueva`, { headers: { cookie: cookies.ana } });
    const _csrf = (await form.text()).match(/name="_csrf" value="([^"]+)"/)[1];
    const res = await fetch(`${baseUrl}/skills`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookies.ana },
      body: new URLSearchParams({
        _csrf, nombre: skill.nombre, categoria: skill.categoria, nivelEsperado: '2',
        importancia: skill.importancia, descripcion: skill.descripcion,
      }).toString(),
    });

    expect(res.status).toBe(302);
    await expect(avisoBeto).resolves.toMatchObject({ id: 5, nombre: 'Docker', by: 'Ana Torres' });
    expect(await avisosAna).toEqual([]);
  });

  test('actualizar una skill avisa con skill:updated y el nombre de quien la cambió', async () => {
    const ana = await connect('/notifications', cookies.ana);
    const aviso = waitFor(ana, 'skill:updated');
    notificar('skill:updated', { id: 5, nombre: 'Docker y Compose' }, USERS[2]);
    await expect(aviso).resolves.toMatchObject({ id: 5, nombre: 'Docker y Compose', by: 'Beto Ruiz' });
  });

  test('el aviso solo lleva datos públicos (sin descripción, correos ni ids de usuario)', async () => {
    const beto = await connect('/notifications', cookies.beto);
    const aviso = waitFor(beto, 'skill:created');
    notificar('skill:created', { id: 9, nombre: 'Git', descripcion: 'x', createdById: 1, categoria: 'TECNICA' }, USERS[1]);
    expect(Object.keys(await aviso).sort()).toEqual(['at', 'by', 'id', 'nombre']);
  });

  test('las páginas sin sesión no reciben avisos (el namespace exige sesión)', async () => {
    await expect(connect('/notifications', null)).rejects.toThrow('No autorizado');
  });
});

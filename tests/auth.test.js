// Pruebas de autenticación y seguridad sobre la app real (Express + vistas EJS) con supertest.
// No necesitan PostgreSQL: Prisma se reemplaza por un mock y las sesiones usan memoria.
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const request = require('supertest');

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
  user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  passwordResetToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  chatMessage: { findMany: jest.fn(), create: jest.fn() },
  $transaction: jest.fn(),
}));

const prisma = require('../src/config/db');
const app = require('../src/app');

const PASSWORD = 'Prueba1234';
let usuario; // usuario ficticio guardado "en la BD" (mock)

// Obtiene el token CSRF de la sesión leyendo el formulario de una página
async function csrf(agent, path = '/auth/login') {
  const res = await agent.get(path).expect(200);
  const match = res.text.match(/name="_csrf" value="([^"]+)"/);
  if (!match) throw new Error(`La página ${path} no tiene token CSRF`);
  return match[1];
}

async function login(agent, email = usuario.email, password = PASSWORD) {
  const _csrf = await csrf(agent);
  return agent.post('/auth/login').type('form').send({ _csrf, email, password });
}

beforeAll(async () => {
  usuario = {
    id: 1,
    name: 'Ana Torres',
    email: 'ana.torres@example.com',
    passwordHash: await bcrypt.hash(PASSWORD, 4),
    role: 'USER',
  };
});

beforeEach(() => {
  jest.resetAllMocks();
  prisma.user.findUnique.mockImplementation(async ({ where }) => (where.email === usuario.email ? usuario : null));
  prisma.chatMessage.findMany.mockResolvedValue([]);
});

describe('Rutas protegidas', () => {
  test.each(['/dashboard', '/chat'])('sin sesión, %s redirige al inicio de sesión', async (path) => {
    const res = await request(app).get(path).expect(302);
    expect(res.headers.location).toBe('/auth/login');
  });
});

describe('Protección CSRF', () => {
  test('un POST sin token CSRF se rechaza con 403', async () => {
    const res = await request(app).post('/auth/login').type('form').send({ email: usuario.email, password: PASSWORD });
    expect(res.status).toBe(403);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  test('un POST con un token CSRF que no es el de la sesión se rechaza con 403', async () => {
    const agent = request.agent(app);
    await csrf(agent);
    const res = await agent.post('/auth/login').type('form').send({ _csrf: 'f'.repeat(64), email: usuario.email, password: PASSWORD });
    expect(res.status).toBe(403);
  });
});

describe('Registro (SignUp)', () => {
  test('rechaza datos inválidos con mensajes claros y no crea el usuario', async () => {
    const agent = request.agent(app);
    const _csrf = await csrf(agent, '/auth/register');
    const res = await agent.post('/auth/register').type('form')
      .send({ _csrf, name: 'Al', email: 'no-es-correo', password: 'corta' });

    expect(res.status).toBe(400);
    expect(res.text).toContain('El nombre debe tener entre 3 y 100 caracteres.');
    expect(res.text).toContain('Ingresa un correo electrónico válido.');
    expect(res.text).toContain('La contraseña debe tener entre 8 y 64 caracteres.');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  test('no permite registrar un correo que ya existe', async () => {
    const agent = request.agent(app);
    const _csrf = await csrf(agent, '/auth/register');
    const res = await agent.post('/auth/register').type('form')
      .send({ _csrf, name: 'Otra Ana', email: usuario.email, password: PASSWORD });

    expect(res.status).toBe(400);
    expect(res.text).toContain('Este correo ya está registrado.');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  test('guarda la contraseña como hash bcrypt con sal, nunca en texto plano', async () => {
    prisma.user.create.mockResolvedValue({ id: 2 });
    const agent = request.agent(app);
    const _csrf = await csrf(agent, '/auth/register');
    const res = await agent.post('/auth/register').type('form')
      .send({ _csrf, name: 'Luis Pérez', email: 'luis.perez@example.com', password: PASSWORD });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/^\/auth\/login\?msg=/);

    const { data } = prisma.user.create.mock.calls[0][0];
    expect(data).not.toHaveProperty('password');
    expect(data.passwordHash).not.toBe(PASSWORD);
    expect(data.passwordHash).toMatch(/^\$2[aby]\$12\$/); // bcrypt, costo 12 (la sal va dentro del hash)
    await expect(bcrypt.compare(PASSWORD, data.passwordHash)).resolves.toBe(true);
  });
});

describe('Inicio de sesión (SignIn)', () => {
  test('con contraseña incorrecta o correo inexistente responde igual (401), sin revelar cuál falló', async () => {
    const malaClave = await login(request.agent(app), usuario.email, 'OtraClave123');
    const sinCuenta = await login(request.agent(app), 'nadie@example.com', PASSWORD);
    for (const res of [malaClave, sinCuenta]) {
      expect(res.status).toBe(401);
      expect(res.text).toContain('Credenciales incorrectas.');
    }
  });

  test('con credenciales correctas crea una sesión nueva (anti fijación) y da acceso a las rutas privadas', async () => {
    const agent = request.agent(app);
    const antes = (await agent.get('/auth/login')).headers['set-cookie'][0];
    const res = await login(agent);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
    const despues = res.headers['set-cookie'][0];
    expect(despues).toMatch(/HttpOnly/i);
    expect(despues.split(';')[0]).not.toBe(antes.split(';')[0]); // session.regenerate()

    const dashboard = await agent.get('/dashboard').expect(200);
    expect(dashboard.text).toContain('Ana Torres');
  });

  test('al cerrar sesión, las rutas privadas vuelven a pedir inicio de sesión', async () => {
    const agent = request.agent(app);
    await login(agent);
    const _csrf = await csrf(agent, '/dashboard');
    await agent.post('/auth/logout').type('form').send({ _csrf }).expect(302);

    const res = await agent.get('/dashboard').expect(302);
    expect(res.headers.location).toBe('/auth/login');
  });
});

describe('Recuperación de clave (token de un solo uso y con caducidad)', () => {
  const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

  test('genera un token aleatorio, guarda solo su hash y caduca en 15 minutos', async () => {
    const logs = [];
    jest.spyOn(console, 'log').mockImplementation((...args) => logs.push(args.join(' ')));
    prisma.passwordResetToken.create.mockResolvedValue({});

    const agent = request.agent(app);
    const _csrf = await csrf(agent, '/auth/forgot');
    const inicio = Date.now();
    const res = await agent.post('/auth/forgot').type('form').send({ _csrf, email: usuario.email });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Si el correo existe');
    const { data } = prisma.passwordResetToken.create.mock.calls[0][0];
    expect(data.userId).toBe(usuario.id);
    expect(data.tokenHash).toMatch(/^[a-f0-9]{64}$/);

    const minutos = (data.expiresAt.getTime() - inicio) / 60000;
    expect(minutos).toBeGreaterThan(14.9);
    expect(minutos).toBeLessThanOrEqual(15.1);

    // El enlace "enviado" (consola) lleva el token original; la BD solo guarda su hash
    const token = logs.join('\n').match(/\/auth\/reset\/([a-f0-9]{64})/)[1];
    expect(token).not.toBe(data.tokenHash);
    expect(sha256(token)).toBe(data.tokenHash);
  });

  test('con un correo que no existe responde el mismo mensaje y no crea token', async () => {
    const agent = request.agent(app);
    const _csrf = await csrf(agent, '/auth/forgot');
    const res = await agent.post('/auth/forgot').type('form').send({ _csrf, email: 'nadie@example.com' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Si el correo existe');
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  test.each([
    ['ya usado', { used: true, expiresAt: new Date(Date.now() + 60000) }],
    ['caducado', { used: false, expiresAt: new Date(Date.now() - 1000) }],
  ])('rechaza un token %s y no cambia la contraseña', async (_caso, estado) => {
    const token = 'a'.repeat(64);
    prisma.passwordResetToken.findUnique.mockResolvedValue({ id: 7, userId: usuario.id, tokenHash: sha256(token), ...estado });

    const agent = request.agent(app);
    const _csrf = await csrf(agent);
    const res = await agent.post(`/auth/reset/${token}`).type('form').send({ _csrf, password: 'NuevaClave123' });

    expect(res.status).toBe(400);
    expect(res.text).toContain('El enlace de recuperación es inválido o ha expirado.');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('con un token válido cambia la contraseña (hash) y marca el token como usado en una transacción', async () => {
    const token = 'b'.repeat(64);
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 8, userId: usuario.id, tokenHash: sha256(token), used: false, expiresAt: new Date(Date.now() + 60000),
    });
    prisma.user.update.mockResolvedValue({});
    prisma.passwordResetToken.update.mockResolvedValue({});
    prisma.$transaction.mockImplementation((ops) => Promise.all(ops));

    const agent = request.agent(app);
    const _csrf = await csrf(agent);
    const res = await agent.post(`/auth/reset/${token}`).type('form').send({ _csrf, password: 'NuevaClave123' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/^\/auth\/login\?msg=/);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.passwordResetToken.update).toHaveBeenCalledWith({ where: { id: 8 }, data: { used: true } });

    const { where, data } = prisma.user.update.mock.calls[0][0];
    expect(where).toEqual({ id: usuario.id });
    await expect(bcrypt.compare('NuevaClave123', data.passwordHash)).resolves.toBe(true);
  });
});

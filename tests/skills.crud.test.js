// Pruebas de integración del CRUD de skills (Isaac).
// Usan la app real (sesión, CSRF, rutas, validación, vistas) contra la base de datos de desarrollo.
// Requisito: PostgreSQL levantado (docker compose up -d) y migraciones aplicadas.
// Crean un usuario y skills con un prefijo propio y los eliminan al terminar.
require('dotenv').config({ quiet: true });
const bcrypt = require('bcrypt');
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');
const { pgPool } = require('../src/config/session');
const { skillEvents } = require('../src/modules/skills/skills.events');

const PREFIJO = 'Prueba Jest';
const EMAIL = `jest-crud-${Date.now()}@example.test`;
const CLAVE = 'ClaveDePrueba1';

const csrfDe = (html) => (html.match(/name="_csrf" value="([^"]+)"/) || [])[1];
const idDeUbicacion = (location) => Number((location.match(/^\/skills\/(\d+)$/) || [])[1]);

let agente; // cliente con cookie de sesión iniciada
let csrf;
let usuario;

async function limpiar() {
  await prisma.skill.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
}

// Devuelve la petición de supertest (sin async) para poder encadenar .expect()
function crearSkill(datos = {}) {
  return agente
    .post('/skills')
    .type('form')
    .send({
      _csrf: csrf,
      nombre: `${PREFIJO} Node`,
      categoria: 'TECNICA',
      nivelEsperado: '3',
      importancia: 'ALTA',
      descripcion: 'Skill creada por las pruebas de integración.',
      ...datos,
    });
}

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    throw new Error('No hay conexión con PostgreSQL. Ejecuta "docker compose up -d" y "npx prisma migrate deploy".');
  }
  await limpiar();
  usuario = await prisma.user.create({
    data: { name: 'Usuario Jest', email: EMAIL, passwordHash: await bcrypt.hash(CLAVE, 4) },
  });

  // Inicia sesión como lo haría el navegador: obtiene el token CSRF y envía el formulario
  agente = request.agent(app);
  const login = await agente.get('/auth/login');
  await agente.post('/auth/login').type('form').send({ _csrf: csrfDe(login.text), email: EMAIL, password: CLAVE }).expect(302);
  // La sesión se regenera al iniciar sesión, así que se toma el nuevo token
  csrf = csrfDe((await agente.get('/skills').expect(200)).text);
});

afterAll(async () => {
  await limpiar();
  if (usuario) await prisma.user.delete({ where: { id: usuario.id } });
  await prisma.$disconnect();
  await pgPool.end();
});

describe('CRUD de skills (integración)', () => {
  test('las rutas de skills exigen sesión iniciada', async () => {
    const res = await request(app).get('/skills');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/auth/login');
  });

  test('crear: guarda la skill con el usuario de la sesión, emite skill:created y muestra un mensaje', async () => {
    const eventos = [];
    const oyente = (s) => eventos.push(s);
    skillEvents.on('skill:created', oyente);

    const res = await crearSkill({ createdById: '999999' }); // intento de cambiar el autor
    skillEvents.off('skill:created', oyente);

    expect(res.status).toBe(302);
    const id = idDeUbicacion(res.headers.location);
    const guardada = await prisma.skill.findUnique({ where: { id } });
    expect(guardada).toMatchObject({ nombre: `${PREFIJO} Node`, nivelEsperado: 3, createdById: usuario.id });
    expect(eventos).toEqual([expect.objectContaining({ id, nombre: `${PREFIJO} Node`, por: 'Usuario Jest' })]);

    const detalle = await agente.get(res.headers.location).expect(200);
    expect(detalle.text).toContain(`Se creó la skill «${PREFIJO} Node».`);
  });

  test('crear con datos inválidos o sin token CSRF no guarda nada', async () => {
    const invalida = await crearSkill({ nombre: `${PREFIJO} X`, nivelEsperado: '9' });
    expect(invalida.status).toBe(400);
    expect(invalida.text).toContain('El nivel esperado debe ser un número entero del 1 al 5.');

    const sinCsrf = await crearSkill({ _csrf: undefined, nombre: `${PREFIJO} Sin token` });
    expect(sinCsrf.status).toBe(403);

    expect(await prisma.skill.count({ where: { nombre: { in: [`${PREFIJO} X`, `${PREFIJO} Sin token`] } } })).toBe(0);
  });

  test('listar con búsqueda y filtro: encuentra por texto parcial y respeta la categoría', async () => {
    await crearSkill({ nombre: `${PREFIJO} Empatía`, categoria: 'CONDUCTUAL', importancia: 'MEDIA' }).expect(302);

    const porTexto = await agente.get('/skills').query({ q: 'prueba jest' }).expect(200);
    expect(porTexto.text).toContain(`${PREFIJO} Node`);
    expect(porTexto.text).toContain(`${PREFIJO} Empatía`);
    expect(porTexto.text).toMatch(/Mostrando <strong>1–2<\/strong> de <strong>2<\/strong>/);

    const conFiltro = await agente.get('/skills').query({ q: 'prueba jest', categoria: 'CONDUCTUAL' }).expect(200);
    expect(conFiltro.text).toContain(`${PREFIJO} Empatía`);
    expect(conFiltro.text).not.toContain(`${PREFIJO} Node`);
  });

  test('listar pagina de 10 en 10', async () => {
    const res = await agente.get('/skills').query({ page: '1' }).expect(200);
    const filas = res.text.match(/<td class="cell-title">/g) || [];
    expect(filas.length).toBeLessThanOrEqual(10);
    expect(res.text).toMatch(/Mostrando <strong>1–\d+<\/strong> de <strong>\d+<\/strong>/);
  });

  test('actualizar: cambia los datos, emite skill:updated y rechaza un nombre duplicado', async () => {
    const skill = await prisma.skill.findFirst({ where: { nombre: `${PREFIJO} Node` } });
    const eventos = [];
    const oyente = (s) => eventos.push(s);
    skillEvents.on('skill:updated', oyente);

    const res = await agente
      .post(`/skills/${skill.id}/editar`)
      .type('form')
      .send({
        _csrf: csrf,
        nombre: `${PREFIJO} Node avanzado`,
        categoria: 'TECNICA',
        nivelEsperado: '5',
        importancia: 'CRITICA',
        descripcion: 'Descripción actualizada por la prueba.',
      });
    skillEvents.off('skill:updated', oyente);

    expect(res.status).toBe(302);
    expect(await prisma.skill.findUnique({ where: { id: skill.id } })).toMatchObject({
      nombre: `${PREFIJO} Node avanzado`,
      nivelEsperado: 5,
      importancia: 'CRITICA',
    });
    expect(eventos).toEqual([expect.objectContaining({ id: skill.id, nivelEsperado: 5 })]);

    const duplicado = await agente
      .post(`/skills/${skill.id}/editar`)
      .type('form')
      .send({
        _csrf: csrf,
        nombre: `${PREFIJO.toUpperCase()} EMPATÍA`,
        categoria: 'TECNICA',
        nivelEsperado: '5',
        importancia: 'CRITICA',
        descripcion: 'Intento de usar un nombre existente.',
      });
    expect(duplicado.status).toBe(400);
    expect(duplicado.text).toContain('Ya existe una skill con ese nombre.');
  });

  test('detalle y edición responden 404 si el id no existe o no es válido', async () => {
    for (const ruta of ['/skills/999999999', '/skills/abc', '/skills/1.5/editar']) {
      const res = await agente.get(ruta);
      expect(res.status).toBe(404);
      expect(res.text).toContain('Skill no encontrada');
    }
  });

  test('eliminar: pide confirmación y borra solo con POST y token CSRF', async () => {
    const skill = await prisma.skill.findFirst({ where: { nombre: `${PREFIJO} Empatía` } });

    const confirmacion = await agente.get(`/skills/${skill.id}/eliminar`).expect(200);
    expect(confirmacion.text).toContain(`¿Eliminar la skill «${PREFIJO} Empatía»?`);
    expect(await prisma.skill.findUnique({ where: { id: skill.id } })).not.toBeNull();

    await agente.post(`/skills/${skill.id}/eliminar`).type('form').send({}).expect(403);
    expect(await prisma.skill.findUnique({ where: { id: skill.id } })).not.toBeNull();

    const res = await agente.post(`/skills/${skill.id}/eliminar`).type('form').send({ _csrf: csrf });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/skills');
    expect(await prisma.skill.findUnique({ where: { id: skill.id } })).toBeNull();

    await agente.get(`/skills/${skill.id}`).expect(404);
  });
});

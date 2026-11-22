// Pruebas de la validación en el servidor del módulo de Skills (Isaac).
// No necesitan base de datos: Prisma se reemplaza por un mock.
const path = require('path');
const express = require('express');
const request = require('supertest');
const { validationResult, matchedData } = require('express-validator');

jest.mock('../src/config/db', () => ({
  skill: { findFirst: jest.fn() },
}));
const prisma = require('../src/config/db');
const { skillValidator, nombreUnicoValidator } = require('../src/modules/skills/skills.validators');
const { manejarErroresValidacion, errorPrismaACampos } = require('../src/modules/skills/skills.validation');

const valida = () => ({
  nombre: 'Node.js y Express',
  categoria: 'TECNICA',
  nivelEsperado: '4',
  importancia: 'CRITICA',
  descripcion: 'Construcción de APIs y aplicaciones web en el servidor.',
});

// Ejecuta las cadenas de validación sobre un objeto req simulado.
async function validar(body, { params = {}, cadenas = skillValidator } = {}) {
  const req = { body, params };
  for (const cadena of cadenas) await cadena.run(req);
  const errores = validationResult(req).array();
  const porCampo = Object.fromEntries(errores.map((e) => [e.path, e.msg]));
  return { req, errores, porCampo };
}

beforeEach(() => {
  prisma.skill.findFirst.mockReset();
  prisma.skill.findFirst.mockResolvedValue(null);
});

describe('Validador de skills (express-validator)', () => {
  test('acepta datos válidos, normaliza los valores y descarta campos no permitidos', async () => {
    const { req, errores } = await validar({
      ...valida(),
      nombre: '   Node.js    y  Express ',
      nivelEsperado: ' 4 ',
      createdById: '99', // intento de asignación masiva
    });

    expect(errores).toHaveLength(0);
    const datos = matchedData(req);
    expect(datos).toEqual({
      nombre: 'Node.js y Express',
      categoria: 'TECNICA',
      nivelEsperado: 4,
      importancia: 'CRITICA',
      descripcion: 'Construcción de APIs y aplicaciones web en el servidor.',
    });
    expect(datos).not.toHaveProperty('createdById');
  });

  test('exige todos los campos obligatorios con un mensaje claro por campo', async () => {
    const { porCampo } = await validar({});

    expect(porCampo).toEqual({
      nombre: 'El nombre es obligatorio.',
      categoria: 'Selecciona una categoría.',
      nivelEsperado: 'El nivel esperado es obligatorio.',
      importancia: 'Selecciona la importancia.',
      descripcion: 'La descripción es obligatoria.',
    });
  });

  test.each([
    ['nombre', 'ab', 'El nombre debe tener entre 3 y 80 caracteres.'],
    ['nombre', 'x'.repeat(81), 'El nombre debe tener entre 3 y 80 caracteres.'],
    ['nombre', '   ', 'El nombre es obligatorio.'],
    ['descripcion', 'corta', 'La descripción debe tener entre 10 y 500 caracteres.'],
    ['descripcion', 'x'.repeat(501), 'La descripción debe tener entre 10 y 500 caracteres.'],
  ])('valida la longitud de %s (%#)', async (campo, valor, mensaje) => {
    const { porCampo } = await validar({ ...valida(), [campo]: valor });
    expect(porCampo).toEqual({ [campo]: mensaje });
  });

  test.each(['0', '6', '3.5', 'tres', '-1', '03'])(
    'rechaza nivelEsperado fuera del rango 1-5 o no entero: "%s"',
    async (nivel) => {
      const { porCampo } = await validar({ ...valida(), nivelEsperado: nivel });
      expect(porCampo).toEqual({ nivelEsperado: 'El nivel esperado debe ser un número entero del 1 al 5.' });
    }
  );

  test('acepta los extremos del rango de nivel (1 y 5)', async () => {
    for (const nivel of ['1', '5']) {
      const { errores } = await validar({ ...valida(), nivelEsperado: nivel });
      expect(errores).toHaveLength(0);
    }
  });

  test('solo permite los valores definidos para categoría e importancia', async () => {
    const { porCampo } = await validar({ ...valida(), categoria: 'Otra', importancia: 'alta' });

    expect(porCampo).toEqual({
      categoria: 'La categoría debe ser «Técnica» o «Conductual».',
      importancia: 'La importancia debe ser «Baja», «Media», «Alta» o «Crítica».',
    });
  });

  test('rechaza valores repetidos (arreglos) enviados en un mismo campo', async () => {
    const { porCampo } = await validar({ ...valida(), nivelEsperado: ['2', '3'], nombre: ['Uno', 'Dos'] });

    expect(porCampo).toEqual({
      nombre: 'Envía un único valor de texto.',
      nivelEsperado: 'Envía un único valor de texto.',
    });
  });

  test('rechaza nombres con caracteres no permitidos (HTML o comillas dobles)', async () => {
    for (const nombre of ['<script>alert(1)</script>', 'Skill "rara"']) {
      const { porCampo } = await validar({ ...valida(), nombre });
      expect(porCampo.nombre).toMatch(/solo puede contener letras, números/);
    }
  });
});

describe('Nombre único (sin distinguir mayúsculas)', () => {
  const cadenas = [...skillValidator, nombreUnicoValidator];

  test('marca el nombre duplicado y consulta sin distinguir mayúsculas', async () => {
    prisma.skill.findFirst.mockResolvedValue({ id: 1 });

    const { porCampo } = await validar({ ...valida(), nombre: 'node.js y express' }, { cadenas });

    expect(porCampo).toEqual({ nombre: 'Ya existe una skill con ese nombre.' });
    expect(prisma.skill.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { nombre: { equals: 'node.js y express', mode: 'insensitive' } },
      })
    );
  });

  test('al editar excluye la propia skill de la búsqueda de duplicados', async () => {
    const { errores } = await validar(valida(), { cadenas, params: { id: '7' } });

    expect(errores).toHaveLength(0);
    expect(prisma.skill.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ NOT: { id: 7 } }),
      })
    );
  });

  test('no consulta la base de datos si el nombre ya es inválido', async () => {
    await validar({ ...valida(), nombre: 'ab' }, { cadenas });
    expect(prisma.skill.findFirst).not.toHaveBeenCalled();
  });

  test('traduce la violación de UNIQUE de Prisma (P2002) a un error del campo nombre', () => {
    expect(errorPrismaACampos({ code: 'P2002', meta: { target: ['nombre'] } })).toEqual({
      nombre: 'Ya existe una skill con ese nombre.',
    });
    expect(errorPrismaACampos({ code: 'P2025' })).toBeNull();
  });
});

describe('Manejo de errores de validación (HTTP)', () => {
  // App mínima con el middleware real y el formulario real (src/views/skills/_form.ejs).
  const guardar = jest.fn((req, res) => res.status(201).json(req.skillData));
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', [path.join(__dirname, 'fixtures/views'), path.join(__dirname, '../src/views')]);
  app.use(express.urlencoded({ extended: true }));
  app.use((req, res, next) => {
    res.locals.csrfToken = 'token-de-prueba';
    next();
  });
  app.post(
    '/skills',
    skillValidator,
    nombreUnicoValidator,
    manejarErroresValidacion('skill-form', () => ({ action: '/skills', submitLabel: 'Crear skill', cancelUrl: '/skills' })),
    guardar
  );

  beforeEach(() => guardar.mockClear());

  test('con datos inválidos responde 400, muestra cada error junto a su campo y no guarda nada', async () => {
    const res = await request(app)
      .post('/skills')
      .type('form')
      .send({ nombre: 'ab', categoria: 'X', nivelEsperado: '9', importancia: 'ALTA', descripcion: '<b>Texto con HTML</b>' });

    expect(res.status).toBe(400);
    expect(guardar).not.toHaveBeenCalled();
    expect(res.text).toContain('Revisa los datos del formulario');
    expect(res.text).toMatch(/id="skill-nombre-error">El nombre debe tener entre 3 y 80 caracteres\.</);
    expect(res.text).toMatch(/id="skill-categoria-error">La categoría debe ser «Técnica» o «Conductual»\.</);
    expect(res.text).toMatch(/id="skill-nivelEsperado-error">El nivel esperado debe ser un número entero del 1 al 5\.</);
    expect(res.text.match(/aria-invalid="true"/g)).toHaveLength(3);
    // Conserva lo que escribió el usuario (escapado) y el token CSRF
    expect(res.text).toContain('value="ab"');
    expect(res.text).toMatch(/<option value="ALTA" selected>/);
    expect(res.text).toContain('&lt;b&gt;Texto con HTML&lt;/b&gt;');
    expect(res.text).not.toContain('<b>Texto con HTML</b>');
    expect(res.text).toContain('name="_csrf" value="token-de-prueba"');
  });

  test('muestra el error de nombre duplicado en el formulario', async () => {
    prisma.skill.findFirst.mockResolvedValue({ id: 3 });

    const res = await request(app).post('/skills').type('form').send({ ...valida(), nombre: 'JAVASCRIPT' });

    expect(res.status).toBe(400);
    expect(guardar).not.toHaveBeenCalled();
    expect(res.text).toMatch(/id="skill-nombre-error">Ya existe una skill con ese nombre\.</);
    expect(res.text).toContain('value="JAVASCRIPT"');
  });

  test('con datos válidos continúa y entrega solo los campos validados', async () => {
    const res = await request(app).post('/skills').type('form').send({ ...valida(), createdById: '1', id: '50' });

    expect(res.status).toBe(201);
    expect(guardar).toHaveBeenCalledTimes(1);
    expect(res.body).toEqual({ ...valida(), nivelEsperado: 4 });
  });
});

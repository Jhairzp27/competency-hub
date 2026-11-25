// Prueba E2E del sistema completo contra un servidor en ejecución (misma BD del .env).
// Uso:
//   PORT=3100 APP_URL=http://localhost:3100 node src/server.js > e2e-server.log   (otra terminal)
//   node scripts/e2e.js e2e-server.log
// El log del servidor se usa para leer el enlace de recuperación de clave (correo simulado).
// Crea usuarios y skills temporales con sufijo único y los elimina al terminar.
const fs = require('fs');
const path = require('path');
const PROJ = path.join(__dirname, '..');
const req = require;
process.chdir(PROJ);
req('dotenv').config({ path: path.join(PROJ, '.env') });
const { io } = req('socket.io-client');
const bcrypt = req('bcrypt');
const { PrismaClient } = req('@prisma/client');
const prisma = new PrismaClient();

const BASE = process.env.E2E_URL || 'http://localhost:3100';
const LOG = process.argv[2];
const RUN = Date.now().toString(36);
const results = [];
const check = (flow, name, ok, extra = '') => {
  results.push({ flow, name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${flow}] ${name}${extra ? ' — ' + extra : ''}`);
};

class Client {
  constructor() { this.cookie = ''; }
  async go(url, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    if (this.cookie) headers.cookie = this.cookie;
    let body = opts.body;
    if (body && typeof body === 'object') {
      headers['content-type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams(body).toString();
    }
    const res = await fetch(BASE + url, { method: opts.method || 'GET', headers, body, redirect: 'manual' });
    const sc = res.headers.getSetCookie?.() || [];
    for (const c of sc) if (c.startsWith('connect.sid=')) this.cookie = c.split(';')[0];
    const text = await res.text();
    return { status: res.status, location: res.headers.get('location'), text, headers: res.headers };
  }
  async csrf(url) {
    const r = await this.go(url);
    const m = r.text.match(/name="_csrf" value="([^"]+)"/);
    return m && m[1];
  }
  socket(ns) {
    return io(BASE + ns, { extraHeaders: { cookie: this.cookie }, forceNew: true, reconnection: false });
  }
}
const once = (s, ev, ms = 4000) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('timeout ' + ev)), ms);
  s.once(ev, (d) => { clearTimeout(t); res(d); });
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const emailA = `e2e-a-${RUN}@test.local`, emailB = `e2e-b-${RUN}@test.local`;
  const passA = 'E2eClave' + RUN.slice(-3) + '1', passB = 'E2eOtra' + RUN.slice(-3) + '2';
  const A = new Client(), B = new Client(), anon = new Client();

  // ---------- 1. AUTH ----------
  let r = await anon.go('/skills');
  check('Auth', 'Ruta privada /skills sin sesión redirige a login', r.status === 302 && r.location === '/auth/login');
  r = await anon.go('/chat');
  check('Auth', 'Ruta privada /chat sin sesión redirige a login', r.status === 302 && r.location === '/auth/login');

  let t = await A.csrf('/auth/register');
  r = await A.go('/auth/register', { method: 'POST', body: { _csrf: t, name: 'E2E', email: 'no-es-correo', password: 'corta' } });
  check('Auth', 'Registro inválido rechazado en servidor (400)', r.status === 400 && /correo electrónico válido/.test(r.text));

  r = await A.go('/auth/register', { method: 'POST', body: { _csrf: t, name: 'E2E Usuario A', email: emailA, password: passA } });
  check('Auth', 'SignUp usuario A', r.status === 302 && r.location.startsWith('/auth/login'));
  t = await B.csrf('/auth/register');
  r = await B.go('/auth/register', { method: 'POST', body: { _csrf: t, name: 'E2E Usuario B', email: emailB, password: passB } });
  check('Auth', 'SignUp usuario B', r.status === 302);
  r = await B.go('/auth/register', { method: 'POST', body: { _csrf: t, name: 'Dup', email: emailB, password: passB } });
  check('Auth', 'Correo duplicado rechazado', r.status === 400 && /ya está registrado/.test(r.text));

  const uA = await prisma.user.findUnique({ where: { email: emailA } });
  check('Auth', 'Hash bcrypt en BD ($2b$, costo 12, ≠ clave plana)', uA && /^\$2[aby]\$12\$/.test(uA.passwordHash) && uA.passwordHash !== passA, uA?.passwordHash.slice(0, 7));
  check('Auth', 'bcrypt.compare valida la clave contra el hash', await bcrypt.compare(passA, uA.passwordHash));

  t = await A.csrf('/auth/login');
  r = await A.go('/auth/login', { method: 'POST', body: { _csrf: t, email: emailA, password: 'Incorrecta1' } });
  check('Auth', 'SignIn con clave incorrecta → 401 genérico', r.status === 401 && /Credenciales incorrectas/.test(r.text));
  const cookieBefore = A.cookie;
  r = await A.go('/auth/login', { method: 'POST', body: { _csrf: t, email: emailA, password: passA } });
  check('Auth', 'SignIn correcto → /dashboard', r.status === 302 && r.location === '/dashboard');
  check('Auth', 'Sesión regenerada al iniciar (anti fijación)', A.cookie && A.cookie !== cookieBefore);
  r = await A.go('/dashboard');
  check('Auth', 'Dashboard accesible con sesión', r.status === 200);
  t = await B.csrf('/auth/login');
  r = await B.go('/auth/login', { method: 'POST', body: { _csrf: t, email: emailB, password: passB } });
  check('Auth', 'SignIn usuario B', r.status === 302);

  // Recuperación de clave
  const R = new Client();
  t = await R.csrf('/auth/forgot');
  r = await R.go('/auth/forgot', { method: 'POST', body: { _csrf: t, email: `noexiste-${RUN}@test.local` } });
  check('Recuperación', 'Correo inexistente → mismo mensaje genérico', r.status === 200 && /Si el correo existe/.test(r.text));
  r = await R.go('/auth/forgot', { method: 'POST', body: { _csrf: t, email: emailB } });
  await wait(300);
  const log = fs.readFileSync(LOG, 'utf8');
  const m = [...log.matchAll(/\/auth\/reset\/([a-f0-9]{64})/g)].pop();
  const token = m && m[1];
  check('Recuperación', 'Enlace con token generado (consola simulada)', !!token);
  const rec = await prisma.passwordResetToken.findFirst({ where: { user: { email: emailB } }, orderBy: { id: 'desc' } });
  const mins = (rec.expiresAt - rec.createdAt) / 60000;
  check('Recuperación', 'En BD se guarda solo el hash SHA-256 del token', rec.tokenHash !== token && rec.tokenHash.length === 64);
  check('Recuperación', 'Caducidad de 15 minutos', Math.round(mins) === 15, `${mins.toFixed(1)} min`);
  r = await R.go(`/auth/reset/${token}`);
  check('Recuperación', 'Formulario de reset accesible con token válido', r.status === 200);
  const tr = r.text.match(/name="_csrf" value="([^"]+)"/)[1];
  const newPassB = 'NuevaClave' + RUN.slice(-3) + '9';
  r = await R.go(`/auth/reset/${token}`, { method: 'POST', body: { _csrf: tr, password: newPassB, confirmPassword: newPassB } });
  check('Recuperación', 'Cambio de clave con token', r.status === 302 && /actualizada/.test(decodeURIComponent(r.location)));
  r = await R.go(`/auth/reset/${token}`);
  check('Recuperación', 'Token de un solo uso: reutilizarlo → 400', r.status === 400);
  // Token caducado
  await prisma.passwordResetToken.create({ data: { tokenHash: require('crypto').createHash('sha256').update('expirado' + RUN).digest('hex'), userId: rec.userId, expiresAt: new Date(Date.now() - 1000) } });
  r = await R.go(`/auth/reset/expirado${RUN}`);
  check('Recuperación', 'Token caducado → 400', r.status === 400 && /inválido o ha expirado/.test(r.text));
  const L = new Client();
  t = await L.csrf('/auth/login');
  r = await L.go('/auth/login', { method: 'POST', body: { _csrf: t, email: emailB, password: passB } });
  check('Recuperación', 'Clave anterior ya no sirve', r.status === 401);
  r = await L.go('/auth/login', { method: 'POST', body: { _csrf: t, email: emailB, password: newPassB } });
  check('Recuperación', 'SignIn con la clave nueva', r.status === 302 && r.location === '/dashboard');

  // ---------- 2. Sockets: conectar A y B ----------
  const bad = io(BASE + '/chat', { forceNew: true, reconnection: false });
  const badErr = await once(bad, 'connect_error').catch(() => null);
  check('Tiempo real', 'Handshake sin sesión rechazado', badErr && /No autorizado/.test(badErr.message));
  bad.close();
  const evil = io(BASE + '/chat', { forceNew: true, reconnection: false, extraHeaders: { cookie: A.cookie, origin: 'http://evil.example' } });
  const evilErr = await once(evil, 'connect_error').catch(() => null);
  check('Tiempo real', 'Handshake con Origin ajeno rechazado (CSWSH)', evilErr && /Origen no permitido/.test(evilErr.message));
  evil.close();

  const chatA = A.socket('/chat');
  await once(chatA, 'connect');
  const chatB = B.socket('/chat');
  const usersP = once(chatA, 'chat:users');
  await once(chatB, 'connect');
  const users = await usersP;
  check('Tiempo real', '2 usuarios conectados en /chat', users.some((u) => u.name === 'E2E Usuario A') && users.some((u) => u.name === 'E2E Usuario B'), users.map((u) => u.name).join(', '));
  await wait(300);
  check('Tiempo real', 'Transporte actualizado a WebSocket', chatA.io.engine.transport.name === 'websocket', chatA.io.engine.transport.name);

  const msgText = `Hola desde E2E ${RUN} <script>alert(1)</script>`;
  const recvB = once(chatB, 'chat:message');
  const ack = await chatA.timeout(4000).emitWithAck('chat:send', { content: msgText });
  const got = await recvB;
  check('Tiempo real', 'Mensaje de A llega a B en tiempo real', ack.ok && got.content.includes(RUN) && got.author === 'E2E Usuario A');
  const dbMsg = await prisma.chatMessage.findFirst({ where: { content: { contains: RUN } } });
  check('Tiempo real', 'Mensaje persistido en chat_messages', !!dbMsg);
  const ackBad = await chatA.timeout(4000).emitWithAck('chat:send', { content: '   ' });
  check('Tiempo real', 'Mensaje vacío rechazado por el servidor', ackBad.ok === false, ackBad.error);
  r = await B.go('/chat');
  check('Tiempo real', 'Historial cargado desde BD al abrir /chat', r.text.includes(RUN));
  check('Seguridad', 'XSS escapado en historial del chat (EJS)', !r.text.includes('<script>alert(1)</script>') && r.text.includes('&lt;script&gt;'));

  // ---------- 3. CRUD Skills + notificaciones ----------
  const notifB = B.socket('/notifications');
  await once(notifB, 'connect');
  const notifA = A.socket('/notifications');
  await once(notifA, 'connect');
  let aGotOwn = false;
  notifA.on('skill:created', () => (aGotOwn = true));

  r = await A.go('/skills');
  check('CRUD Skills', 'Listado /skills (página 1)', r.status === 200 && /page=2/.test(r.text));
  r = await A.go('/skills?page=2');
  check('CRUD Skills', 'Paginación ?page=2', r.status === 200);
  r = await A.go('/skills?q=java');
  check('CRUD Skills', 'Búsqueda por nombre (q=java → JavaScript)', r.text.includes('JavaScript') && !r.text.includes('Trabajo en equipo'));
  r = await A.go('/skills?categoria=CONDUCTUAL&importancia=CRITICA');
  check('CRUD Skills', 'Filtro categoría + importancia', r.text.includes('Comunicación efectiva') && !r.text.includes('JavaScript'));
  r = await A.go('/skills?page=abc&categoria=HACK');
  check('CRUD Skills', 'Parámetros inválidos saneados (sin error)', r.status === 200);

  t = await A.csrf('/skills/nueva');
  r = await A.go('/skills/nueva');
  check('Validación', 'Formulario con validación en cliente (data-validate, required, minlength)', /data-validate/.test(r.text) && /required/.test(r.text) && /minlength/.test(r.text));
  r = await A.go('/skills', { method: 'POST', body: { _csrf: t, nombre: 'x', categoria: 'OTRA', nivelEsperado: '9', importancia: 'X', descripcion: 'corta' } });
  check('Validación', 'Servidor rechaza datos inválidos (400) con mensajes', r.status === 400 && (r.text.match(/field-error|invalid-feedback|aria-invalid="true"/g) || []).length >= 3);
  r = await A.go('/skills', { method: 'POST', body: { _csrf: t, nombre: 'javascript', categoria: 'TECNICA', nivelEsperado: '3', importancia: 'ALTA', descripcion: 'Duplicado sin distinguir mayúsculas.' } });
  check('Validación', 'Nombre duplicado (sin distinguir mayúsculas) rechazado', r.status === 400);

  const nombre = `E2E Skill ${RUN}`;
  const createdP = once(notifB, 'skill:created');
  r = await A.go('/skills', { method: 'POST', body: { _csrf: t, nombre, categoria: 'TECNICA', nivelEsperado: '3', importancia: 'ALTA', descripcion: 'Skill creada por la prueba E2E automatizada.' } });
  const id = r.location && r.location.split('/').pop();
  check('CRUD Skills', 'Crear skill → redirige al detalle', r.status === 302 && /^\/skills\/\d+$/.test(r.location));
  const nC = await createdP.catch(() => null);
  check('Notificaciones', 'B recibe skill:created en tiempo real', nC && nC.nombre === nombre && nC.by === 'E2E Usuario A');
  await wait(300);
  check('Notificaciones', 'El autor A no recibe su propio aviso', !aGotOwn);
  r = await A.go(`/skills/${id}`);
  check('CRUD Skills', 'Ver detalle', r.status === 200 && r.text.includes(nombre));
  r = await A.go(`/skills?q=${encodeURIComponent(RUN)}`);
  check('CRUD Skills', 'La nueva skill aparece en la búsqueda', r.text.includes(nombre));

  t = await A.csrf(`/skills/${id}/editar`);
  const updatedP = once(notifB, 'skill:updated');
  r = await A.go(`/skills/${id}/editar`, { method: 'POST', body: { _csrf: t, nombre: nombre + ' v2', categoria: 'TECNICA', nivelEsperado: '4', importancia: 'CRITICA', descripcion: 'Skill editada por la prueba E2E automatizada.' } });
  check('CRUD Skills', 'Editar skill', r.status === 302);
  const nU = await updatedP.catch(() => null);
  check('Notificaciones', 'B recibe skill:updated en tiempo real', nU && nU.nombre === nombre + ' v2');
  const dbSkill = await prisma.skill.findUnique({ where: { id: Number(id) } });
  check('CRUD Skills', 'Cambios persistidos en BD', dbSkill.nivelEsperado === 4 && dbSkill.importancia === 'CRITICA');

  r = await A.go(`/skills/${id}/eliminar`);
  check('CRUD Skills', 'Página de confirmación antes de eliminar', r.status === 200 && /eliminar/i.test(r.text));
  r = await A.go(`/skills/${id}`);
  check('CRUD Skills', 'Detalle incluye modal <dialog> de confirmación', /<dialog/.test(r.text));
  t = await A.csrf(`/skills/${id}/eliminar`);
  r = await A.go(`/skills/${id}/eliminar`, { method: 'POST', body: { _csrf: t } });
  check('CRUD Skills', 'Eliminar skill', r.status === 302 && r.location === '/skills');
  r = await A.go(`/skills/${id}`);
  check('CRUD Skills', 'Skill eliminada → 404', r.status === 404);
  r = await A.go('/skills/abc');
  check('CRUD Skills', 'Id inválido → 404', r.status === 404);

  // ---------- 4. CSRF + Helmet ----------
  r = await A.go('/skills', { method: 'POST', body: { nombre: 'Sin token', categoria: 'TECNICA', nivelEsperado: '3', importancia: 'ALTA', descripcion: 'Sin token CSRF en el formulario.' } });
  check('Seguridad', 'POST sin token CSRF → 403', r.status === 403);
  r = await A.go('/skills', { method: 'POST', body: { _csrf: 'a'.repeat(64), nombre: 'Token falso', categoria: 'TECNICA', nivelEsperado: '3', importancia: 'ALTA', descripcion: 'Token CSRF que no coincide.' } });
  check('Seguridad', 'POST con token CSRF falso → 403', r.status === 403);
  r = await anon.go('/auth/login', { method: 'POST', body: { email: emailA, password: passA } });
  check('Seguridad', 'Login sin token CSRF → 403', r.status === 403);
  r = await A.go('/dashboard');
  const h = r.headers;
  const hs = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'SAMEORIGIN',
    'strict-transport-security': 'max-age',
    'referrer-policy': 'no-referrer',
    'cross-origin-opener-policy': 'same-origin',
  };
  for (const [k, v] of Object.entries(hs)) check('Seguridad', `Helmet: ${k}`, (h.get(k) || '').includes(v), h.get(k));
  check('Seguridad', 'Helmet oculta X-Powered-By', !h.get('x-powered-by'));
  check('Seguridad', 'Content-Security-Policy activa', !!h.get('content-security-policy'), h.get('content-security-policy') ? '' : 'desactivada (contentSecurityPolicy: false)');
  const login = await new Client().go('/auth/login');
  r = await A.go('/auth/login'); // fuerza set-cookie? se revisa en login nuevo
  const C = new Client();
  t = await C.csrf('/auth/login');
  const raw = await fetch(BASE + '/auth/login', { method: 'POST', redirect: 'manual', headers: { cookie: C.cookie, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ _csrf: t, email: emailA, password: passA }) });
  const setc = (raw.headers.getSetCookie() || []).join(';');
  check('Seguridad', 'Cookie de sesión HttpOnly + SameSite=Lax', /HttpOnly/i.test(setc) && /SameSite=Lax/i.test(setc));

  // Logout invalida socket
  t = await A.csrf('/dashboard');
  r = await A.go('/auth/logout', { method: 'POST', body: { _csrf: t } });
  check('Auth', 'Logout', r.status === 302);
  r = await A.go('/skills');
  check('Auth', 'Tras logout la ruta privada vuelve a redirigir', r.status === 302);
  const ackExp = await chatA.timeout(4000).emitWithAck('chat:send', { content: 'después de logout' }).catch(() => ({ ok: false, error: 'desconectado' }));
  check('Tiempo real', 'Socket abierto deja de enviar tras logout (sesión revalidada)', ackExp.ok === false, ackExp.error);

  [chatA, chatB, notifA, notifB].forEach((s) => s.close());

  // ---------- Limpieza ----------
  await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } });
  await prisma.$executeRawUnsafe(`DELETE FROM user_sessions WHERE sess::text LIKE '%e2e-%${RUN}@test.local%'`);

  const failed = results.filter((x) => !x.ok);
  console.log(`\nTOTAL: ${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());

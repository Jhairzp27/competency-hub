# Pruebas E2E (de punta a punta)

Además de las 74 pruebas automatizadas de Jest (`npm test`), se ejecutó una prueba **E2E** contra el servidor real en ejecución: peticiones HTTP como las del navegador (cookies, formularios y token CSRF), dos clientes Socket.IO autenticados con sus propias sesiones y verificaciones directas en PostgreSQL.

- **Script:** [`scripts/e2e.js`](../scripts/e2e.js)
- **Fecha:** 24/11/2026 · Node 24 · PostgreSQL 16 (Docker)
- **Resultado:** **67/67 verificaciones correctas** (Jest: 5 suites, 74/74)

## Cómo ejecutarla

```bash
# Terminal 1: una instancia del servidor en otro puerto (usa la misma BD del .env)
PORT=3100 APP_URL=http://localhost:3100 node src/server.js > e2e-server.log

# Terminal 2
node scripts/e2e.js e2e-server.log
```

En PowerShell, la terminal 1 es: `$env:PORT=3100; $env:APP_URL='http://localhost:3100'; node src/server.js > e2e-server.log`.

El log del servidor se usa para leer el enlace de recuperación de clave (el correo se simula en la consola). El script crea dos usuarios y una skill con un sufijo único y **los elimina al terminar**.

## Resultados por flujo

| Flujo | Verificaciones | Resultado |
|---|---|---|
| **Registro e inicio de sesión** | Rutas privadas redirigen a `/auth/login` sin sesión · registro inválido rechazado en el servidor (400) · correo duplicado rechazado · hash en BD con formato `$2b$12$` (bcrypt, costo 12, sal incluida) y `bcrypt.compare` válido · clave incorrecta → 401 con mensaje genérico · sesión regenerada al iniciar (anti fijación de sesión) · logout cierra la sesión | 15/15 ✅ |
| **Recuperación de clave** | Mismo mensaje para correos existentes e inexistentes · en BD solo se guarda el hash SHA-256 del token · caducidad de 15 min · cambio de clave · el token no se puede reutilizar (un solo uso) · token caducado → 400 · la clave anterior deja de servir y la nueva funciona | 10/10 ✅ |
| **CRUD de Skills** | Listado paginado (`?page=2`) · búsqueda por nombre (`q=java`) · filtro categoría + importancia · parámetros inválidos saneados · crear → detalle · aparece en la búsqueda · editar y persistir en BD · página de confirmación y modal `<dialog>` antes de eliminar · eliminar → 404 · id inválido → 404 | 15/15 ✅ |
| **Validación cliente/servidor** | El formulario lleva `data-validate`, `required` y `minlength` (validación en el cliente, verificada además en el navegador) · el servidor rechaza datos inválidos con mensajes por campo · nombre duplicado sin distinguir mayúsculas rechazado | 3/3 ✅ |
| **Chat en tiempo real** | Handshake sin sesión rechazado (`No autorizado`) · handshake con `Origin` ajeno rechazado (CSWSH) · 2 usuarios conectados en la lista · transporte actualizado de polling a **WebSocket** · el mensaje de A llega a B · se guarda en `chat_messages` · mensaje vacío rechazado · historial cargado desde la BD · tras el logout, un socket abierto ya no puede enviar | 9/9 ✅ |
| **Notificaciones** | B recibe `skill:created` y `skill:updated` en tiempo real · el autor no recibe su propio aviso | 3/3 ✅ |
| **Seguridad (CSRF, Helmet, XSS)** | POST sin token CSRF → 403 · token falso → 403 · login sin token → 403 · cabeceras Helmet (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Referrer-Policy`, `Cross-Origin-Opener-Policy`, sin `X-Powered-By`) · **Content-Security-Policy** · cookie de sesión `HttpOnly` + `SameSite=Lax` · contenido `<script>` del chat se muestra escapado | 12/12 ✅ |

## Corrección aplicada durante la prueba

La primera corrida dio **66/67**: la **Content-Security-Policy** de Helmet estaba desactivada (`contentSecurityPolicy: false`). Como la app no usa scripts ni estilos en línea ni recursos externos (las fuentes son propias), se activó la política por defecto de Helmet (`default-src 'self'`, `script-src 'self'`, `object-src 'none'`, `frame-ancestors 'self'`…), con `upgrade-insecure-requests` solo en producción para no romper `http://localhost`. Se verificó en el navegador que el registro, la validación en el cliente, el chat (WebSocket) y el modal de eliminar siguen funcionando sin errores en la consola. Segunda corrida: **67/67**.

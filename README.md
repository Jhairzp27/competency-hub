# competency-hub

## Módulo de Skills — Isaac (Base de datos y CRUD)

**Responsabilidades:** esquema de la base de datos documentado con índices en los campos de búsqueda, datos base (seed) del catálogo, CRUD completo de Skill (listado paginado con búsqueda y filtros, detalle, crear, editar y eliminar con confirmación) y validación estricta en el servidor con mensajes claros.

**Documentación:**
- [docs/base-de-datos.md](docs/base-de-datos.md): modelo de datos, restricciones, índices, seed y medición de consultas con y sin índice.
- [docs/skills.md](docs/skills.md): rutas, parámetros de búsqueda y paginación, reglas de validación, seguridad, eventos para el tiempo real y pruebas.

**Uso rápido:**

```bash
docker compose up -d        # PostgreSQL 16
npx prisma migrate deploy   # crea las tablas
npm run seed                # carga 25 skills ficticias (se puede repetir sin duplicar)
npm run dev                 # http://localhost:3000/skills (requiere iniciar sesión)
npm test                    # 32 pruebas: validación (24) e integración del CRUD (8)
```

### Uso de IA (Isaac)

Se usó Claude Code (Anthropic) como asistente para generar y revisar código del módulo de Skills; todo fue revisado, probado y comprendido por el autor.

## Módulo de tiempo real y pruebas — Sergio

**Responsabilidades:** Socket.IO integrado en el mismo servidor Express (sin servicios externos), con autenticación en el handshake y saneamiento de mensajes; sala general de chat en tiempo real con indicador de usuarios conectados e historial guardado en la base de datos; notificación en tiempo real cuando se crea o actualiza una skill; pruebas automatizadas de validaciones, autenticación y tiempo real.

**Documentación:**
- [docs/tiempo-real.md](docs/tiempo-real.md): cómo funciona Socket.IO (handshake, paso de polling a WebSocket, respaldo, namespaces y salas), contrato de eventos, seguridad, `wss` en el despliegue y pruebas.
- [docs/base-de-datos.md](docs/base-de-datos.md): tabla `chat_messages` del historial.

**Uso rápido:**

```bash
docker compose up -d        # PostgreSQL 16
npx prisma migrate deploy   # crea las tablas (incluida chat_messages)
npx prisma generate         # genera el cliente de Prisma (npm install no lo hace)
npm run dev                 # http://localhost:3000/chat (requiere iniciar sesión)
npm test                    # incluye 42 pruebas de validación, autenticación y tiempo real que no necesitan BD
```

Para ver el chat en vivo, abre la app en una ventana normal y en otra de incógnito con dos cuentas distintas.

### Uso de IA (Sergio)

Se usó **Claude Code** (Anthropic, modelo Claude Opus 5.5) como asistente en esta parte, con estos propósitos:

- Analizar el repositorio y planificar por fases el módulo de tiempo real.
- Generar y revisar código: modelo y migración de `chat_messages`, servidor Socket.IO (namespaces, autenticación del handshake, validación y saneamiento, límite de frecuencia), cliente del chat y de las notificaciones, e integración con los eventos del CRUD de skills.
- Escribir las pruebas automatizadas y la documentación de [docs/tiempo-real.md](docs/tiempo-real.md).
- Preparar el entorno local (Node.js, Docker y migraciones).

Todo lo generado fue revisado, probado (pruebas automatizadas y pruebas manuales con dos navegadores) y comprendido por el autor, que puede explicarlo y modificarlo en la defensa.

# Competency Hub

Aplicación web **monolítica** para gestionar el catálogo de competencias (*skills*) técnicas y conductuales del equipo de una consultora / *software factory*, con chat del equipo y avisos en tiempo real.

Proyecto del primer bimestre de **Aplicaciones Web Avanzadas** (EPN). Versión de entrega: `v1.0-b1`.

## Problema de la PYME

Una *software factory* local (PYME ficticia) arma equipos para cada proyecto, pero las competencias que espera de su gente están dispersas en hojas de cálculo y conversaciones. Por eso:

- No hay un catálogo único de qué *skills* importan, con qué nivel y con qué prioridad.
- Cuesta buscar o filtrar competencias al planificar un proyecto o una capacitación.
- Los cambios en el catálogo no llegan a tiempo al resto del equipo.

**Competency Hub** centraliza ese catálogo, permite buscarlo y mantenerlo, y avisa al equipo en tiempo real cuando cambia.

## Funcionalidades

| Módulo | Qué hace |
|---|---|
| Autenticación | Registro, inicio de sesión, cierre de sesión y recuperación de clave con enlace de un solo uso que vence en 15 minutos (el correo se simula en la consola). Contraseñas con hash y sal (bcrypt). |
| Pantalla principal | Accesible solo con sesión; da acceso al catálogo y al chat. |
| Catálogo de skills (CRUD) | Listado paginado con búsqueda por nombre y filtros por categoría e importancia, detalle, crear, editar y eliminar con confirmación. |
| Chat en tiempo real | Sala general con Socket.IO, usuarios conectados e historial guardado en la base de datos. |
| Notificaciones | Aviso en tiempo real a los demás usuarios cuando se crea o actualiza una skill. |
| Validación | En el cliente (mensajes junto a cada campo y resumen de errores) y siempre en el servidor. |
| Seguridad | Rutas protegidas, sesiones en PostgreSQL, CSRF, cabeceras con Helmet, consultas parametrizadas con Prisma, escape de vistas EJS y WebSocket autenticado en el handshake. |

### Entidad principal: Skill

| Atributo | Tipo | Validación |
|---|---|---|
| `nombre` | texto | Obligatorio, 3 a 80 caracteres, único (sin distinguir mayúsculas), solo letras, números y `. , + # ( ) / & ' -` |
| `categoria` | enum | `TECNICA` o `CONDUCTUAL` |
| `nivelEsperado` | entero | Del 1 al 5 |
| `importancia` | enum | `BAJA`, `MEDIA`, `ALTA` o `CRITICA` |
| `descripcion` | texto | Obligatoria, 10 a 500 caracteres |

## Stack

| Capa | Tecnología |
|---|---|
| Servidor | Node.js + Express 5 (renderizado y enrutamiento en el servidor) |
| Vistas | EJS + HTML5 + CSS3 propio + JavaScript sin frameworks |
| Tiempo real | Socket.IO dentro del mismo servidor Express (sin servicios externos) |
| Base de datos | PostgreSQL 16 (Docker) + Prisma ORM |
| Sesiones | express-session + connect-pg-simple (guardadas en PostgreSQL) |
| Seguridad | bcrypt, Helmet, token CSRF propio, express-validator |
| Pruebas | Jest + Supertest + socket.io-client |

## Requisitos

- [Node.js](https://nodejs.org/) 20 o superior (probado con Node 24)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para PostgreSQL)
- Git

## Cómo ejecutar el proyecto

```bash
# 1. Clonar e instalar dependencias
git clone https://github.com/Jhairzp27/competency-hub.git
cd competency-hub
npm install

# 2. Variables de entorno: copiar el ejemplo y completar los valores
cp .env.example .env            # en PowerShell: Copy-Item .env.example .env

# 3. Levantar PostgreSQL en Docker
docker compose up -d

# 4. Crear las tablas, generar el cliente de Prisma y cargar los datos base
npx prisma migrate deploy
npx prisma generate
npm run seed                    # 25 skills ficticias (se puede repetir sin duplicar)

# 5. Iniciar la aplicación
npm run dev                     # http://localhost:3000
```

Luego crea una cuenta en `/auth/register`. Para probar el chat entre dos personas, abre la app en una ventana normal y en otra de incógnito con cuentas distintas.

### Variables de entorno

El archivo `.env` **no se sube al repositorio** (está en `.gitignore`); solo se versiona [`.env.example`](.env.example).

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NODE_ENV` | Entorno. En `production` la cookie de sesión es `secure` (requiere HTTPS) y no se monta `/ui-kit`. | `development` |
| `PORT` | Puerto del servidor | `3000` |
| `APP_URL` | URL pública; se usa en el enlace de recuperación de clave | `http://localhost:3000` |
| `SESSION_SECRET` | Secreto para firmar la sesión. Usa uno largo y aleatorio. | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credenciales con las que Docker crea la base de datos | — |
| `DATABASE_URL` | Cadena de conexión de Prisma y de las sesiones | `postgresql://usuario:clave@localhost:5432/competency_hub?schema=public` |

> **¿Prisma responde «Authentication failed»?** Probablemente ya tienes otro PostgreSQL usando el puerto `5432` (por ejemplo, uno instalado en Windows). Publica el contenedor en otro puerto con un archivo local `docker-compose.override.yml` (no lo subas):
>
> ```yaml
> services:
>   db:
>     ports: !override
>       - "5434:5432"
> ```
>
> y cambia el puerto en `DATABASE_URL` a `5434`.

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Inicia el servidor con recarga automática (nodemon) |
| `npm start` | Inicia el servidor sin recarga |
| `npm run seed` | Carga o actualiza el catálogo base de skills |
| `npm test` | Ejecuta las pruebas automatizadas (Jest) |

## Estructura del proyecto

```
├── design-system/competency-hub/MASTER.md   # Sistema de diseño (colores, tipografía, componentes, reglas de UX)
├── docs/                                     # Documentación de base de datos, skills, tiempo real y rendimiento
├── prisma/                                   # Esquema, migraciones y seed
├── src/
│   ├── app.js            # Express: middlewares, rutas y manejo de errores
│   ├── server.js         # Servidor HTTP + Socket.IO
│   ├── socket.js         # Configuración de Socket.IO y namespaces
│   ├── config/           # Base de datos (Prisma) y sesiones
│   ├── middlewares/      # Autenticación, CSRF y autenticación del WebSocket
│   ├── modules/          # auth, skills, chat, notifications y ui (cada uno con rutas, controlador y validación)
│   ├── public/           # CSS y JavaScript del cliente
│   └── views/            # Vistas EJS y partials compartidos
└── tests/                # Pruebas automatizadas
```

## Pruebas

```bash
npm test
```

74 pruebas en 5 suites: validación y autenticación, CRUD de skills (integración con la base de datos), validación del chat y WebSocket. Detalle en [docs/skills.md](docs/skills.md) y [docs/tiempo-real.md](docs/tiempo-real.md).

---

# Detalle por módulo

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

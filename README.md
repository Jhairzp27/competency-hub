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
| `node scripts/e2e.js <log>` | Prueba E2E contra un servidor en ejecución (ver [docs/pruebas-e2e.md](docs/pruebas-e2e.md)) |

## Estructura del proyecto

```
├── design-system/competency-hub/MASTER.md   # Sistema de diseño (colores, tipografía, componentes, reglas de UX)
├── docs/                                     # Documentación de base de datos, skills, tiempo real y rendimiento
├── prisma/                                   # Esquema, migraciones y seed
├── scripts/e2e.js                            # Prueba E2E contra el servidor en ejecución
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

**Prueba E2E** contra el servidor en ejecución ([`scripts/e2e.js`](scripts/e2e.js)): registro, inicio de sesión con hash bcrypt verificado en la BD, rutas protegidas, recuperación de clave (un solo uso y caducidad), CRUD completo con paginación y filtros, chat con dos usuarios por WebSocket, notificaciones en tiempo real, CSRF y cabeceras de Helmet. Resultado: **67/67**. Reporte y forma de ejecutarla en [docs/pruebas-e2e.md](docs/pruebas-e2e.md).

## Arquitectura del monolito

Todo corre en **un solo proceso de Node.js**: Express renderiza las vistas EJS y resuelve las rutas en el servidor, y Socket.IO comparte el mismo servidor HTTP y la misma sesión.

```mermaid
flowchart LR
  B["Navegador<br/>HTML + CSS + JS"]

  subgraph M["Monolito Node.js (un solo proceso desplegable)"]
    direction TB
    E["Express 5<br/>Helmet · sesión · CSRF"]
    R["Rutas y controladores<br/>auth · skills · chat · ui-kit"]
    V["Vistas EJS<br/>partials compartidos"]
    SV["Validación y servicios<br/>express-validator · bcrypt"]
    EV["Eventos de skills<br/>skill:created / skill:updated"]
    S["Socket.IO<br/>namespaces /chat y /notifications"]
    E --> R
    R --> V
    R --> SV
    SV --> EV
    EV --> S
  end

  P["Prisma ORM"]
  DB[("PostgreSQL 16<br/>users · password_reset_tokens<br/>skills · chat_messages · user_sessions")]

  B -- "HTTP: páginas y formularios" --> E
  B <-->|"WebSocket (handshake con la cookie de sesión)"| S
  SV --> P
  S --> P
  P --> DB
  E -- "sesiones (connect-pg-simple)" --> DB
```

- **Capa de presentación:** vistas EJS con partials compartidos (`head`, `navbar`, `footer`, alertas, tabla, paginación, modal, chat) y un sistema de diseño propio ([MASTER.md](design-system/competency-hub/MASTER.md)).
- **Capa de negocio:** módulos `auth`, `skills`, `chat` y `notifications`, cada uno con rutas, controlador y validación.
- **Tiempo real:** el CRUD de skills emite eventos y el módulo de notificaciones los reenvía por Socket.IO; así cada módulo se prueba por separado ([docs/tiempo-real.md](docs/tiempo-real.md)).
- **Persistencia:** PostgreSQL con Prisma (consultas parametrizadas) e índices en los campos de búsqueda ([docs/base-de-datos.md](docs/base-de-datos.md)).

### Modelo de datos

```mermaid
erDiagram
  users ||--o{ password_reset_tokens : "tiene"
  users |o--o{ skills : "crea"
  users ||--o{ chat_messages : "escribe"

  users {
    int id PK
    varchar name
    varchar email UK
    text password_hash "bcrypt"
  }
  password_reset_tokens {
    int id PK
    text token_hash UK "SHA-256"
    int user_id FK
    timestamp expires_at "15 min"
    boolean used "un solo uso"
  }
  skills {
    int id PK
    varchar nombre UK "índice GIN trigramas"
    enum categoria "índice (categoria, importancia)"
    smallint nivel_esperado
    enum importancia
    varchar descripcion
    int created_by_id FK
  }
  chat_messages {
    int id PK
    varchar content
    varchar room "índice (room, created_at)"
    int user_id FK
    timestamp created_at
  }
```

Diagrama completo, índices y medición con y sin índice en [docs/base-de-datos.md](docs/base-de-datos.md); flujo de Socket.IO en [docs/tiempo-real.md](docs/tiempo-real.md).

## Equipo y roles

| Integrante | Rol | Responsabilidades |
|---|---|---|
| Jhair Zambrano | Arquitectura base, autenticación y seguridad | Estructura de Express, conexión a la base de datos, `.env.example`, registro, inicio de sesión, recuperación de clave, rutas protegidas y defensas contra inyección, XSS y CSRF |
| Isaac Proaño | Base de datos y CRUD del catálogo | Esquema documentado e índices, seed, CRUD completo de Skill con paginación y filtros, validación en el servidor |
| Sergio Rodríguez | Tiempo real y pruebas | Socket.IO con handshake autenticado, chat con historial y usuarios conectados, notificación de cambios en skills, pruebas automatizadas |
| Daniel Moncayo | Vistas (UI/UX), validación en cliente y entregables | Sistema de diseño, navegación y estilo de todas las pantallas, validación en el cliente, medición de rendimiento, README y presentación |

El trabajo se hizo con una rama por funcionalidad y *pull requests* revisados antes de fusionar en `main`.

## Uso de IA

En cumplimiento de las normas de integridad académica de la EPN, el equipo declara que usó herramientas de inteligencia artificial generativa **como apoyo**, no como sustituto del trabajo propio:

| Herramienta | Proveedor | Para qué se usó |
|---|---|---|
| **Gemini** | Google | Planificación de la arquitectura del monolito, reparto de tareas entre los integrantes, diseño inicial de la autenticación y la seguridad (hash, sesiones, CSRF, recuperación de clave) y resolución de errores del entorno (Node.js, Docker, PostgreSQL y Prisma). |
| **Claude** (Claude Code, modelo Claude Opus 5.5) | Anthropic | Pruebas E2E del sistema, revisión de calidad del código, documentación (README y `docs/`) y estructuración de la presentación de la defensa. También como asistente de programación en cada módulo, según el detalle por integrante. |

**Declaración del equipo.** Todo el código y la documentación generados o sugeridos por estas herramientas fueron **revisados, probados y comprendidos por los 4 integrantes** (Jhair Zambrano, Isaac Proaño, Sergio Rodríguez y Daniel Moncayo). Cada integrante puede explicar y modificar su parte en la defensa. Las decisiones finales de diseño, las correcciones y la verificación (pruebas automatizadas, prueba E2E y pruebas manuales en el navegador) fueron responsabilidad del equipo.

| Integrante | Herramientas | Detalle |
|---|---|---|
| Jhair | Gemini y Claude Code | Arquitectura base, autenticación y seguridad planificadas con apoyo de Gemini; prueba E2E, revisión de calidad (activación de la Content-Security-Policy) y presentación con Claude Code |
| Isaac | Claude Code (Anthropic) | Ver [Uso de IA (Isaac)](#uso-de-ia-isaac) |
| Sergio | Claude Code (Anthropic, Claude Opus 5.5) | Ver [Uso de IA (Sergio)](#uso-de-ia-sergio) |
| Daniel | Claude Code (Anthropic, Claude Opus 5.5) y la skill [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Ver [Uso de IA (Daniel)](#uso-de-ia-daniel) |

Los commits hechos con asistencia de IA incluyen la línea `Co-Authored-By` correspondiente.

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

## Interfaz (UI/UX), validación en el cliente y entregables — Daniel

**Responsabilidades:** menú de navegación coherente y estilo de todas las pantallas EJS (login, registro, recuperación, pantalla principal, CRUD con confirmación al eliminar y chat), validación en el cliente de todos los formularios, medición de rendimiento, README, presentación y etiqueta `v1.0-b1`.

**Qué incluye:**
- **Sistema de diseño** ([design-system/competency-hub/MASTER.md](design-system/competency-hub/MASTER.md)): paleta con contraste WCAG AA verificado, tipografía Fira Sans / Fira Code, espaciados, componentes, reglas de UX y accesibilidad, y checklist de entrega.
- **CSS global** ([src/public/css/main.css](src/public/css/main.css)) basado en variables, sin frameworks; responsive desde 375 px y con soporte de `prefers-reduced-motion`.
- **Partials reutilizables** en `src/views/partials/`: `head`, `navbar` (enlace activo y menú móvil), `footer`, `icon` (iconos SVG Lucide), `alert` y `flash`, `pagination`, `level`, `confirm-dialog`, `chat-message`, `password-checklist` y `auth-aside`.
- **JavaScript del cliente** en `src/public/js/`:
  - `form-validation.js`: validación reutilizable con `data-validate`. Lee las reglas de los atributos HTML (las mismas del servidor), muestra el error junto al campo, un resumen enfocable con enlaces y evita el doble envío.
  - `confirm-dialog.js`: modal nativo `<dialog>` para eliminar (foco inicial en «Cancelar», Esc, POST con CSRF).
  - `toast.js`, `chat-ui.js`, `nav.js` y `password-checklist.js`.
- **Páginas 404 y 500** sin exponer detalles internos.
- **`/ui-kit`** (solo en desarrollo): muestra cada componente funcionando con su código de uso.
- **Rendimiento** ([docs/rendimiento.md](docs/rendimiento.md)): medición con Lighthouse antes y después de optimizar (compresión, caché de estáticos y fuentes propias) y arreglos de accesibilidad. Todas las pantallas quedan entre 97 y 100 en rendimiento y en 100 en accesibilidad, buenas prácticas y SEO.

**Accesibilidad:** etiquetas visibles en todos los campos, `aria-invalid` y `aria-describedby` en los errores, foco visible, enlace «Saltar al contenido», áreas táctiles de 44 px y estados que no dependen solo del color.

### Uso de IA (Daniel)

Se usó **Claude Code** (Anthropic, modelo Claude Opus 5.5) como asistente con estos propósitos:

- Planificar las ramas y los commits de mi parte.
- Generar el sistema de diseño con la skill **ui-ux-pro-max** y ajustarlo al proyecto (la propuesta inicial tenía paleta oscura y animaciones de *landing*, que se descartaron).
- Generar y revisar el CSS, los partials EJS, el JavaScript del cliente y la validación en el cliente.
- Probar cada pantalla en el navegador (escritorio y móvil), revisar el contraste y la accesibilidad, y redactar este README.

Todo fue revisado y probado por el autor en el navegador antes de cada commit, y puede explicarlo y modificarlo en la defensa.

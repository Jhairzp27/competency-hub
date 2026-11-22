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

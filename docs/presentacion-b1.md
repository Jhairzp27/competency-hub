# Defensa del Primer Bimestre — guion del equipo

Documento interno para ensayar. Las diapositivas están en [`docs/presentacion/index.html`](presentacion/index.html).

## Cómo presentar

- Abrir `docs/presentacion/index.html` en Chrome (funciona sin internet).
- **F**: pantalla completa · **→ / Espacio / clic**: siguiente · **←**: anterior · **Inicio / Fin**: primera y última.
- Cada diapositiva anima sus elementos al entrar; esperar ~1 s antes de explicar los diagramas.
- Para llevar una copia en PDF: `Ctrl + P` → «Guardar como PDF», sin márgenes y con «Gráficos de fondo» activado. Al imprimir, todas las animaciones aparecen en su estado final.

## Reparto y tiempos (15:00 + 5:00 de preguntas)

| # | Diapositiva | Quién | Tiempo |
|---|---|---|---|
| 1 | Portada | Isaac | 0:15 |
| 2 | El problema de la PYME | Isaac | 0:35 |
| 3 | Objetivos | Isaac | 0:25 |
| 4 | Cronograma y equipo | Isaac | 0:20 |
| 5 | Historias de usuario | Isaac | 0:25 |
| 6 | Arquitectura del monolito | Jhair | 1:00 |
| 7 | Modelo de datos e índices | Isaac | 0:50 |
| 8 | Pantallas implementadas | Daniel | 0:30 |
| 9 | Validación en cliente y servidor | Daniel | 0:30 |
| 10 | Contraseñas y sesiones | Jhair | 1:00 |
| 11 | CSRF, cabeceras y recuperación de clave | Jhair | 1:00 |
| 12 | Cómo se conecta Socket.IO sobre WebSocket | Sergio | 1:15 |
| 13 | Chat del equipo | Sergio | 0:25 |
| 14 | Avisos cuando cambia el catálogo | Sergio | 0:20 |
| 15 | Pruebas automatizadas y E2E | Sergio | 1:00 |
| 16 | Lighthouse antes → después | Daniel | 0:50 |
| 17 | Demostración en vivo | Todos | 2:40 |
| 18 | Repositorio y evidencia | Jhair | 0:20 |
| 19 | Declaración de uso de IA | Daniel | 0:30 |
| 20 | Conclusiones y lecciones | Daniel | 0:40 |
| 21 | Gracias / preguntas | Daniel | 0:10 |

**Totales:** Jhair 4:00 · Isaac 3:30 · Sergio 4:00 · Daniel 3:30 = **15:00**.

### Demostración en vivo (diapositiva 17)

| Pasos | Quién | Tiempo |
|---|---|---|
| 1–3: rutas protegidas, login + hash en la BD, recuperación de clave | Jhair | 0:40 |
| 4: búsqueda, filtros y paginación | Isaac | 0:40 |
| 5 y 8: validación en cliente y eliminar con el modal | Daniel | 0:20 |
| 6–7: chat en dos ventanas y aviso al crear/editar «Kubernetes» | Sergio | 1:00 |

## Qué decir en cada diapositiva

1. **Portada (Isaac).** Presentar al equipo y el proyecto en una frase.
2. **Problema (Isaac).** Contarlo como historia: el líder pregunta qué nivel de Docker se necesita y nadie sabe cuál es la hoja vigente. Cerrar con la solución.
3. **Objetivos (Isaac).** Leer el general completo; nombrar rápido los cinco específicos.
4. **Cronograma (Isaac).** Trabajo en paralelo por ramas y PR; no leer cada fecha.
5. **Historias (Isaac).** «Estas seis historias son las que verán en la demo». Pasar a Jhair.
6. **Arquitectura (Jhair).** Recorrer el diagrama: navegador → Express (Helmet, sesión, CSRF) → módulos → EJS. Clave: Socket.IO se monta sobre el mismo `http.createServer` y reutiliza la sesión. El CRUD emite eventos de Node y no depende de Socket.IO. Pasar a Isaac.
7. **Modelo de datos (Isaac).** Explicar las relaciones y por qué trigramas: un B-tree no sirve si el patrón empieza con `%`. Dato fuerte: ≈25× más rápida. Con 25 filas no se nota; los índices preparan el crecimiento.
8. **Pantallas (Daniel).** Navegación coherente, diseño propio, responsive y accesible.
9. **Validación (Daniel).** El cliente es para la experiencia; la seguridad real está en el servidor y en la BD. Pasar a Jhair.
10. **Contraseñas y sesiones (Jhair).** Explicar las 4 partes del hash. Si preguntan por la sal: bcrypt la genera y la guarda dentro del propio hash. Sesión en PostgreSQL y `regenerate()` contra la fijación de sesión.
11. **CSRF y recuperación (Jhair).** Token por sesión comparado en tiempo constante; sin token → 403. Helmet + CSP. Recuperación: hash SHA-256 en la BD, 15 min, un solo uso. Pasar a Sergio: «esa misma sesión autentica el WebSocket».
12. **WebSocket (Sergio).** Seguir los 4 pasos del diagrama. Remarcar que la autenticación ocurre en el handshake, antes de aceptar la conexión. Si preguntan por `wss`: detrás de HTTPS es automático.
13. **Chat (Sergio).** Conectados, historial y saneamiento.
14. **Avisos (Sergio).** Flujo CRUD → EventEmitter → `/notifications` → toast; el autor no recibe su propio aviso.
15. **Pruebas (Sergio).** 74 de Jest y 67 E2E. Contar que la E2E encontró la CSP desactivada y se corrigió. Pasar a Daniel.
16. **Rendimiento (Daniel).** Qué se optimizó y el punto en contra del LCP móvil (demuestra que se midió de verdad). «Ahora lo vemos funcionando».
17. **Demo (todos).** Seguir la tabla de arriba.
18. **Repositorio (Jhair).** Mostrar en GitHub los contribuidores y la etiqueta `v1.0-b1`.
19. **Uso de IA (Daniel).** Leer la declaración tal cual; es un punto de la rúbrica.
20. **Conclusiones (Daniel).** Una idea por tarjeta.
21. **Cierre (Daniel).** «Competency Hub deja a la PYME un catálogo único, seguro y vivo». Abrir preguntas: cada uno responde las de su módulo.

## Checklist antes de la defensa (5 minutos antes)

- `docker compose up -d` → contenedor `skillbridge_db` en «Up».
- `npm run dev` → «Servidor corriendo en http://localhost:3000». Dejar la terminal visible para el enlace de recuperación.
- Ventana A (Chrome normal) con la cuenta de Jhair y ventana B (incógnito) con la de Sergio Rodríguez, lado a lado.
- Verificar que **no** exista la skill «Kubernetes» (si existe, eliminarla antes).
- Zoom del navegador al 125 % para que se lea en el proyector.
- Consulta lista para mostrar el hash:
  ```bash
  docker exec -it skillbridge_db psql -U admin -d skillbridge -c "select name, left(password_hash, 29) from users;"
  ```
- Plan B si falla algo: mostrar las capturas de las diapositivas y la salida de `npm test` y `node scripts/e2e.js`.

## Preguntas probables

| Pregunta | Quién | Respuesta corta |
|---|---|---|
| ¿Dónde está la sal de bcrypt? | Jhair | Dentro del hash: los 22 caracteres después de `$2b$12$`. |
| ¿Por qué no JWT? | Jhair | Es un monolito con vistas en el servidor: la sesión en la BD se puede invalidar al cerrar sesión y la comparte Socket.IO. |
| ¿Qué pasa si se bloquea WebSocket? | Sergio | Socket.IO sigue con HTTP long-polling sin cambiar el código. |
| ¿Cómo evitan que alguien se haga pasar por otro en el chat? | Sergio | El autor sale de la sesión del handshake, nunca del mensaje del cliente. |
| ¿Por qué un índice GIN y no B-tree? | Isaac | `ILIKE '%texto%'` empieza con comodín y un B-tree solo busca por prefijo. |
| ¿La validación del cliente es suficiente? | Daniel | No: es para la experiencia. El servidor valida siempre y la BD tiene `CHECK`. |

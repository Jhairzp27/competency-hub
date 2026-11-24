# Medición de rendimiento — Lighthouse

Responsable: Daniel (UI/UX). Complementa la medición de tiempos de consulta con y sin índices de [base-de-datos.md](base-de-datos.md) (Isaac).

## Método

- **Herramienta:** Lighthouse 12.8.2 (CLI, `npx lighthouse@12`) con Google Chrome en modo *headless*.
- **Pantallas:** `/auth/login`, `/dashboard`, `/skills` (25 skills del seed) y `/chat`. Las tres últimas con sesión iniciada (cookie de sesión enviada como cabecera).
- **Perfiles:** móvil (por defecto de Lighthouse: Moto G Power simulado, red 4G lenta y CPU 4× más lenta) y escritorio (`--preset=desktop`).
- **Servidor:** `npm start` en local (sin `nodemon`, para que el servidor no se reinicie durante la medición) con PostgreSQL en Docker.
- **Repeticiones:** 3 pasadas por pantalla y perfil, antes y después; se informa la **mediana**. Se descartan las pasadas que Lighthouse marca con error interno de trazado (`NO_NAVSTART`): quedaron 2 pasadas válidas en `login` móvil (después) y `chat` móvil (antes).
- **Antes:** commit `272adc3` (sin optimizaciones). **Después:** commit `37bf034` (con las optimizaciones de abajo).

> En local la red es instantánea, así que los valores absolutos no representan un servidor real; lo importante es la **diferencia** entre antes y después con las mismas condiciones simuladas.

## Problemas encontrados

| Auditoría de Lighthouse | Dónde | Causa |
|---|---|---|
| *Enable text compression* | Todas las pantallas | El servidor enviaba HTML, CSS y JS sin comprimir (ahorro estimado de 42 a 70 KB por página). |
| *Eliminate render-blocking resources* | Todas las pantallas | La hoja de estilos de Google Fonts (servidor externo) bloqueaba el primer pintado (ahorro estimado de 0.8 a 1.3 s en móvil). |
| *Links do not have a discernible name* | `/skills` (móvil) | En móvil, el texto «Anterior/Siguiente» de la paginación se ocultaba con `display: none` y las flechas quedaban sin nombre accesible. |
| *Uses ARIA roles on incompatible elements* y *List items are not contained…* | `/chat` | `role="log"` no está permitido en `<ul>` y rompía la semántica de la lista de mensajes. |

## Optimizaciones aplicadas

1. **Accesibilidad** (`fix(a11y)`): el texto de la paginación queda oculto solo visualmente y se quitó `role="log"` de la lista del chat (`aria-live="polite"` sigue anunciando los mensajes nuevos).
2. **Compresión** (`perf`): middleware `compression` en Express. Ejemplo: `main.css` pasa de **41 KB a 7 KB** y el HTML del login de **7.9 KB a 2.2 KB**.
3. **Caché de estáticos** (`perf`): en producción CSS, JS e imágenes se cachean 7 días (revalidados con ETag); las fuentes `.woff2`, un año como `immutable`. En desarrollo no se cachea, para ver los cambios al instante.
4. **Fuentes propias** (`perf`): Fira Sans y Fira Code (subconjunto *latin*, licencia SIL OFL) servidas desde `src/public/fonts`, con `@font-face` + `font-display: swap` y precarga de las dos más usadas. Se eliminan las peticiones a `fonts.googleapis.com` y `fonts.gstatic.com`.

## Resultados (mediana de 3 pasadas)

### Móvil (Moto G Power simulado, 4G lenta)

| Pantalla | Rendimiento | Accesibilidad | Buenas prácticas | SEO | FCP | LCP | Peso transferido | Peticiones externas |
|---|---|---|---|---|---|---|---|---|
| `/auth/login` | 98 → **100** | 100 → **100** | 100 → **100** | 100 → **100** | 1894 ms → **1081 ms** | 1894 ms → **1531 ms** | 123 KB → **95 KB** | 4 → **0** |
| `/dashboard` | 97 → **99** | 100 → **100** | 100 → **100** | 100 → **100** | 2053 ms → **1381 ms** | 2053 ms → **2033 ms** | 183 KB → **155 KB** | 6 → **0** |
| `/skills` | 96 → **97** | 96 → **100** | 100 → **100** | 100 → **100** | 2071 ms → **1534 ms** | 2071 ms → **2502 ms** | 213 KB → **181 KB** | 6 → **0** |
| `/chat` | 97 → **98** | 95 → **100** | 100 → **100** | 100 → **100** | 2106 ms → **1378 ms** | 2106 ms → **2189 ms** | 188 KB → **164 KB** | 5 → **0** |

### Escritorio

| Pantalla | Rendimiento | Accesibilidad | Buenas prácticas | SEO | FCP | LCP | Peso transferido | Peticiones externas |
|---|---|---|---|---|---|---|---|---|
| `/auth/login` | 96 → **100** | 100 → **100** | 100 → **100** | 100 → **100** | 1115 ms → **352 ms** | 1115 ms → **392 ms** | 140 KB → **119 KB** | 5 → **0** |
| `/dashboard` | 96 → **100** | 100 → **100** | 100 → **100** | 100 → **100** | 1002 ms → **370 ms** | 1002 ms → **572 ms** | 183 KB → **154 KB** | 6 → **0** |
| `/skills` | 96 → **100** | 100 → **100** | 100 → **100** | 100 → **100** | 1050 ms → **405 ms** | 1050 ms → **614 ms** | 213 KB → **181 KB** | 6 → **0** |
| `/chat` | 97 → **100** | 95 → **100** | 100 → **100** | 100 → **100** | 1000 ms → **456 ms** | 1000 ms → **691 ms** | 206 KB → **188 KB** | 6 → **0** |

**FCP** (*First Contentful Paint*): cuándo aparece el primer contenido. **LCP** (*Largest Contentful Paint*): cuándo aparece el elemento más grande.

## Análisis

- **Escritorio:** todas las pantallas llegan a **100** en las cuatro categorías; el primer contenido aparece entre **54 y 68 % antes** y el LCP entre 31 y 65 % antes.
- **Móvil:** el FCP mejora entre **26 y 43 %** en todas las pantallas y el peso transferido baja entre 13 y 23 %. La accesibilidad sube a **100** en `/skills` y `/chat`.
- **Sin terceros:** ninguna pantalla depende ya de servidores externos para mostrarse (antes, de 4 a 6 peticiones a Google Fonts).
- **Punto en contra (LCP en móvil):** en `/skills` el LCP sube de 2.07 s a 2.50 s y en `/chat` de 2.11 s a 2.19 s. Antes, la hoja de Google Fonts retrasaba todo el pintado y el texto aparecía una sola vez, ya con la fuente final (FCP = LCP). Ahora el texto aparece antes con la fuente del sistema (`font-display: swap`) y se vuelve a pintar cuando llega Fira Sans; en una red 4G lenta simulada ese repintado del párrafo más grande cuenta como el LCP. Sigue en el rango «bueno» de Google (≤ 2.5 s) y el puntaje total no baja. Mejoras posibles: usar menos pesos de fuente o `font-display: optional`.
- **Pendientes menores** que Lighthouse aún sugiere: minificar CSS/JS (ahorro ≈ 12 KB) y CSS sin usar en cada página (la hoja es una sola para toda la app). Se dejan así para mantener el código legible en el proyecto académico.

## Informes completos

Informes HTML de Lighthouse de `/skills` (ábrelos en el navegador). La cookie de sesión usada para medir fue reemplazada por `REDACTED`.

- Móvil: [antes](rendimiento/lighthouse-skills-movil-antes.html) · [después](rendimiento/lighthouse-skills-movil-despues.html)
- Escritorio: [antes](rendimiento/lighthouse-skills-escritorio-antes.html) · [después](rendimiento/lighthouse-skills-escritorio-despues.html)

## Cómo repetir la medición

Con la app corriendo (`npm start`) y una sesión iniciada:

```bash
# Página pública
npx lighthouse@12 http://localhost:3000/auth/login --view

# Página con sesión: copia el valor de la cookie connect.sid desde las DevTools del navegador
# y guárdalo en headers.json (no lo subas):  {"Cookie": "connect.sid=..."}
npx lighthouse@12 http://localhost:3000/skills --extra-headers=headers.json --view
npx lighthouse@12 http://localhost:3000/skills --extra-headers=headers.json --preset=desktop --view
```

También se puede usar la pestaña **Lighthouse** de las DevTools de Chrome.

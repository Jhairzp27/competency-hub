# Sistema de Diseño — Competency Hub (MASTER)

> **LÓGICA:** al construir una pantalla, revisa primero `design-system/competency-hub/pages/<pantalla>.md`.
> Si ese archivo existe, sus reglas **sobrescriben** este Master. Si no, sigue estrictamente este archivo.

---

**Proyecto:** Competency Hub — catálogo de competencias técnicas de una consultora / *software factory* (PYME)
**Stack de UI:** EJS (renderizado en servidor) + CSS propio + JavaScript vanilla (sin frameworks CSS)
**Generado con:** skill [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (`--design-system`, dials: variance 3, motion 2, density 6) y **ajustado manualmente** por el equipo (paleta, tipografía y patrón de páginas). Ver sección «Uso de IA» del README.
**Responsable:** Daniel Moncayo (UI/UX)

---

## 1. Dirección visual

- **Estilo:** Minimalism & Swiss Style — limpio, funcional, basado en cuadrícula, alto contraste, tipografía sans-serif clara.
- **Tipo de producto:** herramienta interna B2B (dashboard + CRUD + chat), no una landing de marketing.
- **Modo:** claro por defecto. (Modo oscuro: opcional, fuera del alcance del bimestre 1.)
- **Densidad:** estándar — ni marketing espacioso ni dashboard apretado.

## 2. Paleta de colores

Fuente: paleta «B2B Service» de ui-ux-pro-max + colores de estado (verde/ámbar/rojo) de la estrategia de dashboards.
**Nunca usar hex directos en componentes**: siempre las variables CSS.

| Rol | Hex | Variable CSS | Uso |
|-----|-----|--------------|-----|
| Primario | `#0F172A` | `--color-primary` | Navbar, títulos, texto fuerte |
| Sobre primario | `#FFFFFF` | `--color-on-primary` | Texto sobre navbar |
| Secundario | `#334155` | `--color-secondary` | Elementos secundarios, hover del navbar |
| Sobre secundario | `#FFFFFF` | `--color-on-secondary` | |
| Acento / CTA | `#0369A1` | `--color-accent` | Botón principal, enlaces, foco |
| Acento hover | `#075985` | `--color-accent-hover` | Hover del botón principal |
| Sobre acento | `#FFFFFF` | `--color-on-accent` | Texto del botón principal |
| Fondo | `#F8FAFC` | `--color-background` | Fondo de la página |
| Texto | `#020617` | `--color-foreground` | Texto general |
| Tarjeta | `#FFFFFF` | `--color-card` | Tarjetas, formularios, tablas, modales |
| Atenuado | `#E8ECF1` | `--color-muted` | Fondos suaves, filas alternas |
| Texto atenuado | `#475569` | `--color-muted-foreground` | Ayudas, metadatos, placeholders |
| Borde | `#E2E8F0` | `--color-border` | Bordes de inputs, tablas, tarjetas |
| Destructivo | `#DC2626` | `--color-destructive` | Eliminar, errores |
| Sobre destructivo | `#FFFFFF` | `--color-on-destructive` | |
| Éxito | `#15803D` | `--color-success` | Mensajes de éxito, usuario en línea |
| Aviso | `#B45309` | `--color-warning` | Advertencias |
| Anillo de foco | `#0369A1` | `--color-ring` | `outline` de `:focus-visible` |

Contraste verificado (texto sobre `#FFFFFF` / `#F8FAFC`): acento 5.9 / 5.7, texto atenuado 7.6 / 7.2, éxito 5.0 / 4.8, aviso 5.0 / 4.8, destructivo 4.8 / 4.6, texto blanco sobre navbar 17.9 → todos ≥ 4.5:1 (WCAG AA).

## 3. Tipografía

- **Texto general y títulos:** *Fira Sans* (400, 500, 600, 700).
- **Datos técnicos:** *Fira Code* (400, 500, 600) — solo para nivel de la skill, IDs, etiquetas técnicas y horas del chat.
- **Carga:** archivos `.woff2` servidos por la propia app desde `src/public/fonts/` (subconjunto *latin*, licencia SIL OFL 1.1), declarados con `@font-face` y `font-display: swap` al inicio de `main.css`. Se precargan Fira Sans 400 y 700 en `partials/head.ejs`.
- **Por qué no Google Fonts:** su hoja de estilos externa bloqueaba el renderizado (Lighthouse estimaba de 0.8 a 1.3 s de ahorro); ver `docs/rendimiento.md`.

```html
<link rel="preload" href="/fonts/fira-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/fira-sans-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
```

| Token | Valor | Uso |
|-------|-------|-----|
| `--font-sans` | `'Fira Sans', system-ui, sans-serif` | Todo el texto |
| `--font-mono` | `'Fira Code', ui-monospace, monospace` | Datos técnicos |
| `--text-sm` | `0.875rem` (14px) | Ayudas, metadatos (mínimo permitido) |
| `--text-base` | `1rem` (16px) | Cuerpo (base obligatoria) |
| `--text-lg` | `1.125rem` (18px) | Subtítulos |
| `--text-xl` | `1.5rem` (24px) | Título de sección |
| `--text-2xl` | `2rem` (32px) | Título de página |

- Interlineado del cuerpo: `1.5`. Títulos: `1.2`.
- Nunca texto de cuerpo menor a 14px.

## 4. Espaciado, bordes y sombras

| Token | Valor | Uso |
|-------|-------|-----|
| `--space-xs` | `4px` | Espacios mínimos |
| `--space-sm` | `8px` | Icono–texto, separación mínima entre botones |
| `--space-md` | `16px` | Padding estándar |
| `--space-lg` | `24px` | Padding de tarjetas y secciones |
| `--space-xl` | `32px` | Separación grande |
| `--space-2xl` | `48px` | Márgenes de sección |
| `--space-3xl` | `64px` | Encabezados amplios |

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | `6px` | Badges, inputs pequeños |
| `--radius-md` | `8px` | Botones, inputs |
| `--radius-lg` | `12px` | Tarjetas |
| `--radius-xl` | `16px` | Modales |
| `--shadow-sm` | `0 1px 2px rgba(15,23,42,0.05)` | Elevación sutil |
| `--shadow-md` | `0 4px 6px rgba(15,23,42,0.08)` | Tarjetas |
| `--shadow-lg` | `0 10px 15px rgba(15,23,42,0.10)` | Dropdowns, toasts |
| `--shadow-xl` | `0 20px 25px rgba(15,23,42,0.15)` | Modales |

## 5. Layout y responsive

- **Mobile-first**. Breakpoints: `640px`, `768px`, `1024px`, `1280px`. Probar en 375, 768, 1024 y 1440 px.
- Contenedor: `max-width: 1200px`, centrado, `padding-inline: var(--space-md)`.
- `<meta name="viewport" content="width=device-width, initial-scale=1">` en todas las vistas. Nunca deshabilitar el zoom.
- Sin scroll horizontal en móvil. Las tablas van dentro de un contenedor con `overflow-x: auto`.
- El contenido no debe quedar oculto detrás del navbar.

## 6. Componentes

| Componente | Especificación |
|------------|----------------|
| **Navbar** | Fondo `--color-primary`, texto `--color-on-primary`. Enlace activo marcado (borde inferior acento + `aria-current="page"`). En móvil: botón hamburguesa con `aria-expanded` y `aria-controls`. Botón «Cerrar sesión» como `<form method="POST">` con CSRF. |
| **Botones** | `.btn` base: alto mínimo 44px, `padding: 12px 20px`, `--radius-md`, peso 600, `cursor: pointer`, transición 150–200ms. Variantes: `.btn-primary` (acento), `.btn-secondary` (borde, fondo blanco), `.btn-danger` (destructivo), `.btn-ghost` (sin fondo). Estado `:disabled` con opacidad 0.6 y `cursor: not-allowed`. Mostrar estado de carga al enviar. |
| **Inputs** | `<label>` visible siempre (nunca solo placeholder). Alto mínimo 44px, `font-size: 16px`, borde `--color-border`. Foco: borde y `outline` acento. Error: borde destructivo + mensaje debajo del campo con `aria-describedby` y `aria-invalid="true"`. Texto de ayuda en `--color-muted-foreground`. |
| **Tarjetas** | Fondo `--color-card`, `--radius-lg`, `padding: var(--space-lg)`, `--shadow-sm`, borde `--color-border`. Si es clicable: hover con `--shadow-md` (sin cambiar el layout). |
| **Alertas / flash** | Variantes éxito, error, aviso, info. Icono SVG + texto. `role="alert"` para errores, `role="status"` para éxito. |
| **Tabla** | Encabezado en `--color-muted`, filas con borde inferior, hover de fila suave. Envuelta en `.table-wrapper { overflow-x: auto }`. Acciones con texto o `aria-label`. |
| **Paginación** | `<nav aria-label="Paginación">`. Anterior / números / siguiente. Página actual con `aria-current="page"`. Botones de 44px mínimo. Mostrar «Mostrando X–Y de Z». |
| **Búsqueda / filtro** | Formulario `GET` (la búsqueda queda en la URL y se puede compartir). Input con label (puede ser visualmente oculto) + select de categoría + botón «Buscar» y «Limpiar». |
| **Modal de confirmación** | Elemento nativo `<dialog>` con `showModal()`. Título claro («¿Eliminar la skill "X"?»), texto de consecuencia, botones «Cancelar» (foco inicial) y «Eliminar» (`.btn-danger`). Cierra con Esc. Fondo `rgba(15,23,42,0.5)`. |
| **Toast** | Esquina inferior derecha (en móvil: abajo, ancho completo). `role="status"`, `aria-live="polite"`. Se cierra solo en 4s y tiene botón de cerrar. Máximo 3 a la vez. |
| **Badges** | Categoría (técnica/conductual) y nivel (1–5) en `--font-mono`. No depender solo del color: incluir siempre el texto. |
| **Chat** | Lista de mensajes con scroll propio, burbuja propia alineada a la derecha (acento) y ajena a la izquierda (tarjeta). Nombre + hora (`--font-mono`, `--text-sm`). Panel de usuarios conectados con punto verde + texto «en línea». Input con contador de caracteres. Contenedor de mensajes con `aria-live="polite"`. |

## 7. Iconos

- SVG en línea del set **Lucide** (trazo 2px, 20–24px). **Nunca emojis como iconos.**
- Iconos decorativos: `aria-hidden="true"`. Botones solo-icono: `aria-label` obligatorio.

## 8. Movimiento

- Solo micro-interacciones: transiciones de 150–250ms en `color`, `background-color`, `border-color`, `box-shadow`, `opacity` y `transform`.
- **Sin GSAP ni librerías de animación.** No animar `width`/`height`.
- Respetar `@media (prefers-reduced-motion: reduce)` → desactivar transiciones no esenciales.

## 9. Formularios y validación (UX)

Reglas obtenidas de `ui-ux-pro-max --domain ux`:

1. **Validación en línea al salir del campo (`blur`)** y otra vez al enviar. No validar solo al enviar.
2. **Error junto al campo**, en texto claro y en español («El nombre debe tener entre 3 y 100 caracteres»).
3. **Resumen de errores enfocable** arriba del formulario si falla el envío: `role="alert"`, `tabindex="-1"`, recibe el foco y enlaza a cada campo inválido. Mantener también los errores en línea.
4. Los atributos HTML5 (`required`, `minlength`, `maxlength`, `min`, `max`, `pattern`, `type="email"`) deben **coincidir con las reglas del servidor** (express-validator).
5. Confirmar las acciones exitosas con un mensaje breve (flash o toast). Nunca un éxito silencioso.
6. Confirmar siempre las acciones destructivas (eliminar) con el modal.

## 10. Accesibilidad (obligatorio)

- Contraste de texto ≥ 4.5:1.
- `:focus-visible` siempre visible (`outline: 2px solid var(--color-ring); outline-offset: 2px`). Nunca `outline: none` sin reemplazo.
- Navegable completamente con teclado (Tab, Shift+Tab, Enter, Esc).
- Áreas táctiles ≥ 44×44px con ≥ 8px de separación.
- `<html lang="es">`, un solo `<h1>` por página, jerarquía de títulos correcta.
- Enlace «Saltar al contenido» al inicio de cada página.

## 11. Anti-patrones (NO usar)

- ❌ Emojis como iconos
- ❌ Placeholder como única etiqueta
- ❌ Errores solo arriba del formulario, o solo en un toast
- ❌ Eliminar sin confirmación
- ❌ Texto gris claro sobre gris (bajo contraste)
- ❌ Hex directos en componentes (usar variables)
- ❌ Hover que mueva el layout; cambios de estado instantáneos (0ms)
- ❌ Focus invisible
- ❌ Scripts inline (todo el JS va en `src/public/js/`)

## 12. Checklist antes de entregar una pantalla

- [ ] Usa los partials (`head`, `navbar`, `alerts`, `footer`) y las variables CSS
- [ ] Sin emojis como iconos; iconos Lucide consistentes
- [ ] `cursor: pointer` en todo lo clicable; hover con transición 150–250ms
- [ ] Contraste ≥ 4.5:1
- [ ] Foco visible y navegación con teclado
- [ ] `prefers-reduced-motion` respetado
- [ ] Responsive en 375, 768, 1024 y 1440 px, sin scroll horizontal
- [ ] Formularios: label visible, validación en cliente igual a la del servidor, errores junto al campo
- [ ] Acciones destructivas con confirmación

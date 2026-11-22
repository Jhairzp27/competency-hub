/**
 * Notificaciones tipo toast (se cargan en todas las páginas desde footer.ejs).
 *
 * Uso desde cualquier script (por ejemplo, al recibir un evento de Socket.IO):
 *   Toast.show({ type: 'info', title: 'Nueva skill', message: 'Ana creó «Docker».' });
 *
 * - type: 'success' | 'error' | 'warning' | 'info' (por defecto 'info')
 * - duration: milisegundos antes de cerrarse solo (por defecto 4000; 0 = no se cierra)
 * - Máximo 3 visibles; se pausan al pasar el mouse o con foco; botón para cerrar.
 * - El texto se inserta con textContent (sin HTML) para evitar XSS.
 */
(function () {
  'use strict';

  const MAX_TOASTS = 3;
  const ICONS = {
    success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
    error: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    info: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  };

  function svg(paths, size) {
    return '<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"' +
      ' stroke-linejoin="round" aria-hidden="true" focusable="false">' + paths + '</svg>';
  }

  function getRegion() {
    let region = document.querySelector('[data-toast-region]');
    if (!region) {
      region = document.createElement('div');
      region.className = 'toast-region';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('data-toast-region', '');
      document.body.appendChild(region);
    }
    return region;
  }

  function dismiss(toast) {
    if (!toast || toast.classList.contains('is-leaving')) return;
    clearTimeout(toast._timer);
    toast.classList.add('is-leaving');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(function () { toast.remove(); }, reduce ? 0 : 180);
  }

  function startTimer(toast, duration) {
    if (duration > 0) toast._timer = setTimeout(function () { dismiss(toast); }, duration);
  }

  function show(options) {
    const opts = options || {};
    const type = ICONS[opts.type] ? opts.type : 'info';
    const duration = typeof opts.duration === 'number' ? opts.duration : 4000;
    const region = getRegion();

    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;

    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.innerHTML = svg(ICONS[type], 20); // contenido fijo, no proviene del usuario

    const body = document.createElement('div');
    body.className = 'toast-body';
    if (opts.title) {
      const title = document.createElement('p');
      title.className = 'toast-title';
      title.textContent = String(opts.title);
      body.appendChild(title);
    }
    if (opts.message) {
      const message = document.createElement('p');
      message.className = 'toast-message';
      message.textContent = String(opts.message);
      body.appendChild(message);
    }

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'toast-close';
    close.setAttribute('aria-label', 'Cerrar notificación');
    close.innerHTML = svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', 18);
    close.addEventListener('click', function () { dismiss(toast); });

    toast.append(icon, body, close);

    // Pausa mientras el usuario la lee o la enfoca
    toast.addEventListener('mouseenter', function () { clearTimeout(toast._timer); });
    toast.addEventListener('mouseleave', function () { startTimer(toast, duration); });
    toast.addEventListener('focusin', function () { clearTimeout(toast._timer); });
    toast.addEventListener('focusout', function () { startTimer(toast, duration); });

    region.appendChild(toast);
    const visible = region.querySelectorAll('.toast:not(.is-leaving)');
    if (visible.length > MAX_TOASTS) dismiss(visible[0]);

    startTimer(toast, duration);
    return toast;
  }

  window.Toast = { show: show, dismiss: dismiss };
})();

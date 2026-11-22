/**
 * Menú de navegación responsive (móvil: botón hamburguesa).
 * - Alterna el panel y actualiza aria-expanded.
 * - Se cierra con Esc (devolviendo el foco al botón), al hacer clic fuera
 *   o al pasar a escritorio.
 */
(function () {
  'use strict';

  const toggle = document.querySelector('[data-nav-toggle]');
  const menu = document.querySelector('[data-nav-menu]');
  if (!toggle || !menu) return;

  const desktop = window.matchMedia('(min-width: 768px)');

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
  }

  function isOpen() {
    return toggle.getAttribute('aria-expanded') === 'true';
  }

  toggle.addEventListener('click', function () {
    setOpen(!isOpen());
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener('click', function (event) {
    if (isOpen() && !menu.contains(event.target) && !toggle.contains(event.target)) {
      setOpen(false);
    }
  });

  desktop.addEventListener('change', function (event) {
    if (event.matches) setOpen(false);
  });
})();

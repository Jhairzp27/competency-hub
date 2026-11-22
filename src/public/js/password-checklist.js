/**
 * Checklist de requisitos de contraseña en vivo (ver partials/password-checklist.ejs).
 * Marca cada requisito como cumplido mientras el usuario escribe.
 */
(function () {
  'use strict';

  const CHECKS = {
    length: function (v) { return v.length >= 8 && v.length <= 64; },
    uppercase: function (v) { return /[A-ZÁÉÍÓÚÑ]/.test(v); },
    digit: function (v) { return /[0-9]/.test(v); },
  };

  document.querySelectorAll('[data-password-checklist]').forEach(function (list) {
    const input = document.getElementById(list.dataset.passwordChecklist);
    if (!input) return;

    function update() {
      const value = input.value;
      list.querySelectorAll('[data-check]').forEach(function (item) {
        const met = CHECKS[item.dataset.check](value);
        item.classList.toggle('is-met', met);
        item.querySelector('.check-state').textContent = met ? '(cumplido)' : '(pendiente)';
      });
    }

    input.addEventListener('input', update);
    update();
  });
})();

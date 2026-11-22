/**
 * Interacciones de demostración de la página /ui-kit (solo desarrollo).
 */
(function () {
  'use strict';

  const demoToasts = {
    info: { title: 'Nueva skill', message: 'Ana Torres creó la skill «Docker».' },
    success: { title: 'Skill actualizada', message: 'Los cambios se guardaron correctamente.' },
    warning: { title: 'Conexión inestable', message: 'Reintentando conectar con el chat…' },
    error: { title: 'No se pudo enviar', message: 'El mensaje supera los 500 caracteres.' },
  };

  document.querySelectorAll('[data-demo-toast]').forEach(function (button) {
    button.addEventListener('click', function () {
      const type = button.dataset.demoToast;
      window.Toast.show(Object.assign({ type: type }, demoToasts[type]));
    });
  });

  const form = document.querySelector('[data-demo-chat-form]');
  if (!form || !window.ChatUI) return;

  const textarea = form.querySelector('textarea');
  const list = document.querySelector('[data-chat-messages]');
  window.ChatUI.bindCounter(textarea, form.querySelector('[data-chat-counter]'));

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const content = textarea.value.trim();
    if (!content) {
      textarea.focus();
      return;
    }
    window.ChatUI.appendMessage(list, { content: content, createdAt: new Date(), own: true });
    textarea.value = '';
    textarea.dispatchEvent(new Event('input'));
    textarea.focus();
  });

  // Enter envía; Shift+Enter hace salto de línea
  textarea.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
})();

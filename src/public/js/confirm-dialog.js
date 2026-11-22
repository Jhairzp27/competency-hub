/**
 * Modal de confirmación para acciones destructivas.
 * Abre el <dialog id="confirm-dialog"> al pulsar cualquier botón [data-confirm]
 * y envía un POST (con CSRF) a la URL indicada en data-confirm-action.
 * Ver views/partials/confirm-dialog.ejs para el uso.
 */
(function () {
  'use strict';

  const dialog = document.getElementById('confirm-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  const form = dialog.querySelector('[data-confirm-form]');
  const title = dialog.querySelector('.dialog-title');
  const message = dialog.querySelector('.dialog-message');
  const submit = dialog.querySelector('[data-confirm-submit]');
  const cancel = dialog.querySelector('[data-confirm-cancel]');
  let trigger = null;

  function setMethodField(method) {
    let field = form.querySelector('input[name="_method"]');
    if (!method) {
      if (field) field.remove();
      return;
    }
    if (!field) {
      field = document.createElement('input');
      field.type = 'hidden';
      field.name = '_method';
      form.appendChild(field);
    }
    field.value = method.toUpperCase();
  }

  function open(button) {
    trigger = button;
    form.action = button.dataset.confirmAction || '';
    title.textContent = button.dataset.confirmTitle || '¿Confirmar acción?';
    message.textContent = button.dataset.confirmMessage || 'Esta acción no se puede deshacer.';
    submit.textContent = button.dataset.confirmLabel || 'Eliminar';
    setMethodField(button.dataset.confirmMethod);
    submit.disabled = false;
    submit.classList.remove('is-loading');
    dialog.showModal();
    cancel.focus(); // foco inicial en la opción segura
  }

  document.addEventListener('click', function (event) {
    const button = event.target.closest('[data-confirm]');
    if (!button) return;
    event.preventDefault();
    open(button);
  });

  cancel.addEventListener('click', function () {
    dialog.close();
  });

  // Clic en el fondo (fuera del contenido) cierra el modal
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) dialog.close();
  });

  // Devuelve el foco al botón que abrió el modal
  dialog.addEventListener('close', function () {
    if (trigger) trigger.focus();
  });

  // Evita doble envío y muestra estado de carga
  form.addEventListener('submit', function () {
    submit.disabled = true;
    submit.classList.add('is-loading');
  });
})();

/**
 * Cliente del chat en tiempo real (pantalla /chat).
 *
 * Se conecta al servidor Socket.IO del mismo proyecto. La cookie de sesión viaja
 * en el handshake, así que el servidor sabe quién es el usuario sin pedir nada más.
 * Contrato de eventos: ver src/modules/chat/chat.socket.js.
 *
 * - Pinta los mensajes con ChatUI (textContent, sin HTML: evita XSS).
 * - Valida el mensaje antes de enviarlo con las mismas reglas que el servidor
 *   (requerido y máximo de caracteres), reutilizando FormValidation.getError().
 * - Enter envía; Shift+Enter hace un salto de línea.
 */
(function () {
  'use strict';

  const root = document.querySelector('[data-chat]');
  if (!root || typeof window.io !== 'function' || !window.ChatUI) return;

  const ChatUI = window.ChatUI;
  const currentUserId = Number(root.dataset.userId);
  const maxLength = parseInt(root.dataset.maxLength, 10) || 500;

  const list = root.querySelector('[data-chat-messages]');
  const usersList = root.querySelector('[data-online-users]');
  const form = root.querySelector('[data-chat-form]');
  const textarea = form.querySelector('textarea');
  const submit = form.querySelector('[type="submit"]');
  const errorEl = document.getElementById('chat-input-error');

  const PLACEHOLDER_READY = 'Escribe un mensaje…';
  const PLACEHOLDER_OFFLINE = 'Conectando al chat…';
  const SEND_TIMEOUT_MS = 5000;

  let connected = false;
  let sending = false;
  let wasConnected = false;

  ChatUI.bindCounter(textarea, form.querySelector('[data-chat-counter]'));

  // --- Utilidades de interfaz ---
  function notify(type, title, message) {
    if (window.Toast) window.Toast.show({ type: type, title: title, message: message });
  }

  function showError(message) {
    errorEl.textContent = message || '';
    if (message) {
      textarea.setAttribute('aria-invalid', 'true');
    } else {
      textarea.removeAttribute('aria-invalid');
    }
  }

  function updateControls() {
    textarea.disabled = !connected;
    textarea.placeholder = connected ? PLACEHOLDER_READY : PLACEHOLDER_OFFLINE;
    submit.disabled = !connected || sending;
    submit.classList.toggle('is-loading', sending);
  }

  function removeEmptyState() {
    const empty = list.querySelector('[data-chat-empty]');
    if (empty) empty.remove();
  }

  /** Misma regla que el servidor: requerido (sin contar espacios) y máximo de caracteres. */
  function clientError() {
    if (window.FormValidation) return window.FormValidation.getError(textarea);
    const value = textarea.value.trim();
    if (!value) return 'Escribe un mensaje antes de enviarlo.';
    if (value.length > maxLength) return 'El mensaje no puede superar los ' + maxLength + ' caracteres.';
    return '';
  }

  function goToLogin() {
    window.location.assign('/auth/login');
  }

  // --- Conexión (el cliente se reconecta solo si se cae la red o se reinicia el servidor) ---
  const socket = window.io();

  socket.on('connect', function () {
    connected = true;
    if (wasConnected) ChatUI.appendSystem(list, 'Conexión restablecida.');
    wasConnected = true;
    updateControls();
  });

  socket.on('disconnect', function (reason) {
    connected = false;
    sending = false;
    updateControls();
    // 'io server disconnect': el servidor cerró la conexión a propósito (p. ej. sesión expirada)
    if (reason !== 'io server disconnect' && reason !== 'io client disconnect') {
      ChatUI.appendSystem(list, 'Se perdió la conexión. Reintentando…');
    }
  });

  socket.on('connect_error', function (err) {
    connected = false;
    updateControls();
    if (err && err.message === 'No autorizado') {
      // La sesión ya no existe: no tiene sentido reintentar
      socket.disconnect();
      goToLogin();
    }
  });

  // --- Eventos del servidor ---
  socket.on('chat:message', function (message) {
    removeEmptyState();
    ChatUI.appendMessage(list, {
      author: message.author,
      content: message.content,
      createdAt: message.createdAt,
      own: message.userId === currentUserId,
    });
  });

  socket.on('chat:users', function (users) {
    ChatUI.renderUsers(usersList, users, currentUserId);
  });

  socket.on('chat:system', function (data) {
    if (data && data.text) ChatUI.appendSystem(list, data.text);
  });

  socket.on('chat:error', function (data) {
    notify('error', 'Chat desconectado', (data && data.error) || 'Ocurrió un error en el chat.');
    if (data && data.code === 'SESSION_EXPIRED') setTimeout(goToLogin, 2500);
  });

  // --- Envío ---
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!connected || sending) return;

    const error = clientError();
    showError(error);
    if (error) {
      textarea.focus();
      return;
    }

    sending = true;
    updateControls();

    socket.timeout(SEND_TIMEOUT_MS).emit('chat:send', { content: textarea.value }, function (err, response) {
      sending = false;
      updateControls();

      if (err) {
        notify('error', 'No se pudo enviar', 'El servidor no respondió. Revisa tu conexión e inténtalo de nuevo.');
      } else if (!response || !response.ok) {
        showError((response && response.error) || 'No se pudo enviar el mensaje.');
      } else {
        // El mensaje se pinta al llegar el evento chat:message (igual para todos los usuarios)
        textarea.value = '';
        textarea.dispatchEvent(new Event('input')); // actualiza el contador
        showError('');
      }
      textarea.focus();
    });
  });

  // Enter envía; Shift+Enter hace salto de línea (se respeta la composición de acentos/IME)
  textarea.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  // Si el campo tenía error, se vuelve a validar mientras se escribe
  textarea.addEventListener('input', function () {
    if (textarea.getAttribute('aria-invalid') === 'true') showError(clientError());
  });
})();

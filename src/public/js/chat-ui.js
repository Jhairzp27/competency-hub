/**
 * Utilidades de interfaz para el chat (solo presentación; la conexión
 * Socket.IO vive en el script del módulo de chat).
 *
 *   ChatUI.appendMessage(listEl, { author, content, createdAt, own })
 *   ChatUI.appendSystem(listEl, 'Ana se unió al chat')
 *   ChatUI.renderUsers(listEl, [{ id, name }], currentUserId)
 *   ChatUI.bindCounter(textareaEl, counterEl)
 *
 * Todo el texto se inserta con textContent para evitar XSS.
 * El marcado coincide con views/partials/chat-message.ejs.
 */
(function () {
  'use strict';

  function formatTime(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
  }

  function isNearBottom(listEl) {
    return listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight < 80;
  }

  function scrollToBottom(listEl) {
    listEl.scrollTop = listEl.scrollHeight;
  }

  function appendMessage(listEl, message) {
    const stick = message.own || isNearBottom(listEl);

    const item = document.createElement('li');
    item.className = 'chat-message' + (message.own ? ' is-own' : '');

    const meta = document.createElement('p');
    meta.className = 'chat-meta';
    const author = document.createElement('span');
    author.className = 'chat-author';
    author.textContent = message.own ? 'Tú' : String(message.author || 'Usuario');
    const time = document.createElement('time');
    time.className = 'chat-time';
    if (message.createdAt) time.dateTime = new Date(message.createdAt).toISOString();
    time.textContent = formatTime(message.createdAt);
    meta.append(author, time);

    const bubble = document.createElement('p');
    bubble.className = 'chat-bubble';
    bubble.textContent = String(message.content || '');

    item.append(meta, bubble);
    listEl.appendChild(item);
    if (stick) scrollToBottom(listEl);
    return item;
  }

  function appendSystem(listEl, text) {
    const item = document.createElement('li');
    item.className = 'chat-system';
    item.textContent = String(text);
    listEl.appendChild(item);
    if (isNearBottom(listEl)) scrollToBottom(listEl);
    return item;
  }

  function renderUsers(listEl, users, currentUserId) {
    listEl.replaceChildren();
    (users || []).forEach(function (user) {
      const item = document.createElement('li');
      item.className = 'online-user';
      const dot = document.createElement('span');
      dot.className = 'online-dot';
      dot.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.textContent = String(user.name) + (String(user.id) === String(currentUserId) ? ' (tú)' : '');
      item.append(dot, name);
      listEl.appendChild(item);
    });
    const counter = document.querySelector('[data-online-count]');
    if (counter) counter.textContent = String((users || []).length);
  }

  function bindCounter(textarea, counter) {
    if (!textarea || !counter) return;
    const max = parseInt(textarea.getAttribute('maxlength'), 10) || 500;
    function update() {
      const left = max - textarea.value.length;
      counter.textContent = textarea.value.length + '/' + max;
      counter.classList.toggle('is-near-limit', left <= Math.round(max * 0.1));
    }
    textarea.addEventListener('input', update);
    update();
  }

  // Al cargar: deja el historial al final
  document.querySelectorAll('[data-chat-messages]').forEach(scrollToBottom);

  window.ChatUI = {
    appendMessage: appendMessage,
    appendSystem: appendSystem,
    renderUsers: renderUsers,
    bindCounter: bindCounter,
    scrollToBottom: scrollToBottom,
    formatTime: formatTime,
  };
})();

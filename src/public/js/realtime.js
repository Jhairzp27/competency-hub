/**
 * Notificaciones en tiempo real en todas las páginas con sesión iniciada.
 * Se carga desde footer.ejs junto con el cliente de Socket.IO.
 *
 * Se conecta al namespace /notifications y muestra un toast cuando otra persona
 * crea o actualiza una skill del catálogo (contrato en
 * src/modules/notifications/notifications.socket.js).
 * Los textos se muestran con Toast.show(), que usa textContent (sin XSS).
 */
(function () {
  'use strict';

  if (typeof window.io !== 'function') return;

  const MESSAGES = {
    'skill:created': { title: 'Nueva skill', verb: 'creó' },
    'skill:updated': { title: 'Skill actualizada', verb: 'actualizó' },
  };

  const socket = window.io('/notifications');

  Object.keys(MESSAGES).forEach(function (event) {
    socket.on(event, function (data) {
      if (!data || !window.Toast) return;
      const text = MESSAGES[event];
      window.Toast.show({
        type: 'info',
        title: text.title,
        message: String(data.by || 'Alguien') + ' ' + text.verb + ' la skill «' + String(data.nombre || '') + '».',
      });
    });
  });

  // Sin sesión válida no tiene sentido reintentar la conexión
  socket.on('connect_error', function (err) {
    if (err && err.message === 'No autorizado') socket.disconnect();
  });

  window.Realtime = { socket: socket };
})();

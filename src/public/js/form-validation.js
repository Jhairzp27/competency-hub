/**
 * Validación en el cliente reutilizable para todos los formularios.
 *
 * Uso: agrega data-validate al <form> y carga este script en el footer:
 *   include('../partials/footer', { scripts: ['/js/form-validation.js'] })
 *
 * Reglas (se leen de los atributos del campo; deben coincidir con el servidor):
 *   required            campo obligatorio (se ignoran espacios)
 *   type="email"        formato de correo
 *   minlength/maxlength longitud de texto
 *   type="number"       solo números; min/max para el rango
 *   data-rule-integer   número entero
 *   pattern             expresión regular
 *   data-rule-uppercase al menos una mayúscula
 *   data-rule-digit     al menos un número
 *   data-rule-match="#id"  debe coincidir con otro campo
 *
 * Mensajes: por defecto en español; se personalizan con data-msg-<regla>
 *   (ej. data-msg-required="El nombre es obligatorio.").
 *
 * Comportamiento (MASTER.md §9): valida al salir del campo (blur) y, si ya
 * tenía error, mientras se escribe; al enviar valida todo, evita el envío si
 * hay errores y enfoca el primer campo inválido. El servidor SIEMPRE vuelve a
 * validar: esto solo mejora la experiencia.
 */
(function () {
  'use strict';

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const DEFAULT_MESSAGES = {
    required: 'Este campo es obligatorio.',
    email: 'Ingresa un correo electrónico válido.',
    length: 'Debe tener entre {min} y {max} caracteres.',
    minlength: 'Debe tener al menos {min} caracteres.',
    maxlength: 'Debe tener como máximo {max} caracteres.',
    number: 'Ingresa solo números.',
    integer: 'Ingresa un número entero.',
    range: 'Debe ser un número entre {min} y {max}.',
    min: 'Debe ser un número mayor o igual a {min}.',
    max: 'Debe ser un número menor o igual a {max}.',
    pattern: 'El formato no es válido.',
    uppercase: 'Debe incluir al menos una letra mayúscula.',
    digit: 'Debe incluir al menos un número.',
    match: 'Los valores no coinciden.',
  };

  const customRules = [];

  function format(text, values) {
    return text.replace(/\{(\w+)\}/g, function (_, key) {
      return values[key] !== undefined ? values[key] : '';
    });
  }

  function message(field, rule, values) {
    const key = 'msg' + rule.charAt(0).toUpperCase() + rule.slice(1);
    return format(field.dataset[key] || DEFAULT_MESSAGES[rule], values || {});
  }

  function intAttr(field, name) {
    const value = field.getAttribute(name);
    return value === null || value === '' ? null : Number(value);
  }

  /** Devuelve el primer mensaje de error del campo o '' si es válido. */
  function getError(field) {
    if (field.disabled || field.type === 'hidden' || field.type === 'submit') return '';

    const raw = field.value;
    const value = field.type === 'password' ? raw : raw.trim();

    if (field.required && value === '') return message(field, 'required');
    if (value === '') return ''; // opcional y vacío: válido

    if (field.type === 'email' && !EMAIL_RE.test(value)) return message(field, 'email');

    const minLen = intAttr(field, 'minlength');
    const maxLen = intAttr(field, 'maxlength');
    const len = value.length;
    if ((minLen !== null && len < minLen) || (maxLen !== null && len > maxLen)) {
      if (minLen !== null && maxLen !== null) return message(field, 'length', { min: minLen, max: maxLen });
      return minLen !== null && len < minLen
        ? message(field, 'minlength', { min: minLen })
        : message(field, 'maxlength', { max: maxLen });
    }

    if (field.type === 'number' || field.dataset.ruleInteger !== undefined) {
      if (!/^-?\d+(\.\d+)?$/.test(value)) return message(field, 'number');
      const num = Number(value);
      if (field.dataset.ruleInteger !== undefined && !Number.isInteger(num)) return message(field, 'integer');
      const min = intAttr(field, 'min');
      const max = intAttr(field, 'max');
      if ((min !== null && num < min) || (max !== null && num > max)) {
        if (min !== null && max !== null) return message(field, 'range', { min: min, max: max });
        return min !== null && num < min ? message(field, 'min', { min: min }) : message(field, 'max', { max: max });
      }
    }

    const pattern = field.getAttribute('pattern');
    if (pattern && !new RegExp('^(?:' + pattern + ')$').test(value)) return message(field, 'pattern');

    if (field.dataset.ruleUppercase !== undefined && !/[A-ZÁÉÍÓÚÑ]/.test(value)) return message(field, 'uppercase');
    if (field.dataset.ruleDigit !== undefined && !/[0-9]/.test(value)) return message(field, 'digit');

    if (field.dataset.ruleMatch) {
      const other = document.querySelector(field.dataset.ruleMatch);
      if (other && other.value !== raw) return message(field, 'match');
    }

    for (let i = 0; i < customRules.length; i++) {
      const result = customRules[i](field, value);
      if (result) return result;
    }
    return '';
  }

  /** Crea (una vez) el <span class="form-error"> del campo y lo enlaza con aria-describedby. */
  function getErrorElement(field) {
    const id = (field.id || field.name) + '-error';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('span');
      el.id = id;
      el.className = 'form-error';
      const group = field.closest('.form-group') || field.parentElement;
      group.appendChild(el);
    }
    const describedBy = (field.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
    if (describedBy.indexOf(id) === -1) {
      describedBy.push(id);
      field.setAttribute('aria-describedby', describedBy.join(' '));
    }
    return el;
  }

  /** Valida un campo y muestra u oculta su error. Devuelve true si es válido. */
  function validateField(field) {
    const error = getError(field);
    const el = getErrorElement(field);
    el.textContent = error;
    if (error) {
      field.setAttribute('aria-invalid', 'true');
    } else {
      field.removeAttribute('aria-invalid');
    }
    field.dispatchEvent(new CustomEvent('validation', { bubbles: true, detail: { valid: !error, error: error } }));
    return !error;
  }

  function fieldsOf(form) {
    return Array.prototype.filter.call(form.elements, function (el) {
      return /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && !el.disabled &&
        ['hidden', 'submit', 'button', 'reset'].indexOf(el.type) === -1;
    });
  }

  /** Valida todo el formulario. Devuelve la lista de campos inválidos. */
  function validateForm(form) {
    return fieldsOf(form).filter(function (field) {
      return !validateField(field);
    });
  }

  function setLoading(form) {
    const submit = form.querySelector('[type="submit"]');
    if (submit) {
      submit.classList.add('is-loading');
      submit.setAttribute('aria-disabled', 'true');
    }
  }

  function enhance(form) {
    form.noValidate = true; // usamos nuestros mensajes en lugar de los del navegador

    fieldsOf(form).forEach(function (field) {
      field.addEventListener('blur', function () {
        if (field.value !== '' || field.dataset.touched) validateField(field);
        field.dataset.touched = 'true';
      });
      const live = function () {
        if (field.getAttribute('aria-invalid') === 'true') validateField(field);
      };
      field.addEventListener('input', live);
      field.addEventListener('change', live);
    });

    form.addEventListener('submit', function (event) {
      if (form.dataset.submitting === 'true') {
        event.preventDefault(); // evita doble envío
        return;
      }
      const invalid = validateForm(form);
      if (invalid.length) {
        event.preventDefault();
        form.dispatchEvent(new CustomEvent('invalid-submit', { detail: { fields: invalid } }));
        if (!form.dataset.errorSummary) invalid[0].focus();
        return;
      }
      form.dataset.submitting = 'true';
      setLoading(form);
    });
  }

  document.querySelectorAll('form[data-validate]').forEach(enhance);

  // Si el usuario vuelve con «Atrás» (caché del navegador), reactiva los formularios
  window.addEventListener('pageshow', function (event) {
    if (!event.persisted) return;
    document.querySelectorAll('form[data-validate]').forEach(function (form) {
      delete form.dataset.submitting;
      const submit = form.querySelector('[type="submit"]');
      if (submit) {
        submit.classList.remove('is-loading');
        submit.removeAttribute('aria-disabled');
      }
    });
  });

  window.FormValidation = {
    validateField: validateField,
    validateForm: validateForm,
    getError: getError,
    enhance: enhance,
    /** Agrega una regla propia: fn(field, value) => 'mensaje de error' | '' */
    addRule: function (fn) { customRules.push(fn); },
  };
})();

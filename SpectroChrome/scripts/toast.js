//
// Toast popup notifier
//
// By: Stuart Rackham
// https://github.com/srackham/toast.js
//
// Inspired by: https://github.com/Srirangan/notifer.js
//              https://github.com/CodeSeven/toastr
//
// PAEz - removed need for jquery
// Needs to be latest version of browsers due to transitioned
//
// / <reference path="jquery.d.ts" />
var Toast;
(function(Toast) {
  // Modifiable defaults.
  Toast.defaults = {
    width: '',
    displayDuration: 2000,
    fadeOutDuration: 800
  };
  /* Popup functions */
  /**
   * Popup informational message.
   * @param message A message string.
   * @param title An optional title string.
   * @param options An optional map of {@link Options}.
   */
  function info(message, title, options) {
    _toast('info', message, title, options);
  }
  Toast.info = info;
  /**
   * Popup warning message.
   * @param message A message string.
   * @param title An optional title string.
   * @param options An optional map of {@link Options}.
   */
  function warning(message, title, options) {
    _toast('warning', message, title, options);
  }
  Toast.warning = warning;
  /**
   * Popup error message.
   * @param message A message string.
   * @param title An optional title string.
   * @param options An optional map of {@link Options}.
   */
  function error(message, title, options) {
    _toast('error', message, title, options);
  }
  Toast.error = error;
  /**
   * Popup success message.
   * @param message A message string.
   * @param title An optional title string.
   * @param options An optional map of {@link Options}.
   */
  function success(message, title, options) {
    _toast('success', message, title, options);
  }
  Toast.success = success;
  /* Private variables and functions */
  var _container; // Toast container DOM element.
  function _toast(type, // 'info', 'success', 'error', 'warning'
    message, title, options) {
    if (options === void 0) {
      options = {};
    }
    Object.keys(Toast.defaults).forEach(function(key) {
      if (options[key] === undefined) options[key] = Toast.defaults[key];
    });
    if (!_container) {
      _container = document.querySelector('#toast-container');
      if (!_container) {
        // Create container element if it is not in the static HTML.
        _container = document.createElement('DIV');
        _container.setAttribute('id', 'toast-container');
        document.body.appendChild(_container);
      }
    }
    if (options.width) {
      _container.style.width = options.width;
    }
    var toastElement = document.createElement('DIV');
    toastElement.classList.add('toast');
    toastElement.classList.add('toast-' + type);
    if (title) {
      var titleElement = document.createElement('DIV');
      titleElement.classList.add('toast-title');
      titleElement.textContent = title;
      toastElement.appendChild(titleElement);
    }
    if (message) {
      var messageElement = document.createElement('DIV');
      messageElement.classList.add('toast-message');
      messageElement.textContent = message;
      toastElement.appendChild(messageElement);
    }
    if (options.displayDuration > 0) {
      function fadeOut() {
        var fadeOut = function(e) {
          if (e.propertyName == 'opacity' && window.getComputedStyle(this, null).getPropertyValue('opacity') == 0) {
            toastElement.parentElement.removeChild(toastElement);
            // toastElement.removeEventListener('transitionend', fadeOut);
          }
        };
        toastElement.addEventListener('transitionend', fadeOut);
        toastElement.style.transition = 'opacity ' + options.fadeOutDuration + 'ms linear';
        toastElement.style.opacity = 0;
      }
      setTimeout(function() {
        fadeOut();
      }, options.displayDuration);
    }
    toastElement.addEventListener('click', function() {
      fadeOut();
    });
    _container.insertBefore(toastElement, _container.firstChild);
  }
})(Toast || (Toast = {}));
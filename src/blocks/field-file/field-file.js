/*
  Форма: работа стилизованного input[type="file"]
  Автор: Osvaldas Valutis, www.osvaldas.info (адаптировано под используемую разметку)
  Available for use under the MIT License
*/

/*;( function ()
{
  function closest(el, selector) {
    var matchesFn;

    // find vendor prefix
    ['matches','webkitMatchesSelector','mozMatchesSelector','msMatchesSelector','oMatchesSelector'].some(function(fn) {
      if (typeof document.body[fn] == 'function') {
        matchesFn = fn;
        return true;
      }
      return false;
    })

    var parent;

    // traverse parents
    while (el) {
      parent = el.parentElement;
      if (parent && parent[matchesFn](selector)) {
        return parent;
      }
      el = parent;
    }

    return null;
  }

  var inputs = document.querySelectorAll( '.field-file__input' );
  Array.prototype.forEach.call( inputs, function( input )
  {
    const label  = closest(input, '.field-file').querySelector( '.field-file__name-text' ),
        labelVal = label.innerHTML;

    input.addEventListener( 'change', function( e ) {
      let fileName = '';
      if( this.files && this.files.length > 1 ) {
        fileName = ( this.getAttribute( 'data-multiple-caption' ) || '' ).replace( '{ count}', this.files.length );
      }
      else {
        fileName = e.target.value.split( '\\' ).pop();
      }

      if( fileName ) {
        label.innerHTML = `<span class="field-file__file-name">${fileName}</span>`;
      }
      else {
        label.innerHTML = `<span class="field-file__file-name">${labelVal}</span>`;
      }
    });
  });
}());*/

(function () {
  function closest(el, selector) {
    var matchesFn;
    ['matches','webkitMatchesSelector','mozMatchesSelector','msMatchesSelector','oMatchesSelector'].some(function(fn) {
      if (typeof document.body[fn] === 'function') {
        matchesFn = fn;
        return true;
      }
      return false;
    });

    var parent;
    while (el) {
      parent = el.parentElement;
      if (parent && parent[matchesFn](selector)) {
        return parent;
      }
      el = parent;
    }
    return null;
  }

  // Функция для сброса подписи конкретного input[type=file]
  function resetFileLabel(input) {
    var label = closest(input, '.field-file')?.querySelector('.field-file__name-text');
    if (!label) return;
    var defaultHtml = label.dataset.defaultHtml || '';
    if (defaultHtml) {
      label.innerHTML = defaultHtml;
    }
  }

  // Инициализация
  var inputs = document.querySelectorAll('.field-file__input');
  var initializedForms = new WeakSet();

  Array.prototype.forEach.call(inputs, function (input) {
    var label = closest(input, '.field-file')?.querySelector('.field-file__name-text');
    if (!label) return;

    // Сохраняем "исходный" HTML подписи один раз
    if (!label.dataset.defaultHtml) {
      label.dataset.defaultHtml = label.innerHTML;
    }

    // Обновляем подпись на выбор файла
    input.addEventListener('change', function (e) {
      var fileName = '';
      if (this.files && this.files.length > 1) {
        fileName = (this.getAttribute('data-multiple-caption') || '').replace('{ count}', this.files.length);
      } else if (this.files && this.files.length === 1) {
        fileName = this.files[0].name;
      } else {
        fileName = e.target.value.split('\\').pop(); // на всякий случай для старых браузеров
      }

      if (fileName) {
        label.innerHTML = '<span class="field-file__file-name">' + fileName + '</span>';
      } else {
        label.innerHTML = label.dataset.defaultHtml;
      }
    });

    // Сбрасываем подпись при reset формы
    var form = input.form || closest(input, 'form');
    if (form && !initializedForms.has(form)) {
      form.addEventListener('reset', function () {
        this.querySelectorAll('.field-file__input').forEach(function (inp) {
          resetFileLabel(inp);
        });
      });
      initializedForms.add(form);
    }
  });

  // Если используете AjaxForm (часто вместе с FormIt):
  // На успешную отправку делаем form.reset() — это вызовет обработчик reset выше
  document.addEventListener('af_success', function (e) {
    // e.detail.form — если AjaxForm прокидывает форму в detail
    var form = e.detail?.form || document.querySelector(e.detail?.formSelector || '');
    if (form) form.reset();
  });

  // Если у вас свой кастомный эвент успешной отправки (пример):
  document.addEventListener('formit:success', function (e) {
    var form = e.target.closest('form') || e.detail?.form;
    if (form) form.reset();
  });

  // Фолбэк: если успешная отправка очищает инпуты без reset и без событий —
  // можно экспонировать функцию для ручного вызова:
  window.resetAllFileLabels = function (formOrSelector) {
    var form = typeof formOrSelector === 'string'
      ? document.querySelector(formOrSelector)
      : formOrSelector;
    (form ? form.querySelectorAll('.field-file__input') : document.querySelectorAll('.field-file__input'))
      .forEach(resetFileLabel);
  };
})();

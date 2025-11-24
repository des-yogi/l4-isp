(function () {
  const CONTAINER_SELECTOR = '.payment__details';
  const BUTTON_SELECTOR = 'button.btn';
  const COPY_TIMEOUT_MS = 2000;
  const LIVE_ID = 'copy-live-region';

  // Use existing window.getCurrentLang if available; otherwise provide a copy
  function getCurrentLangWrapper() {
    if (typeof window.getCurrentLang === 'function') {
      try {
        return window.getCurrentLang();
      } catch (e) {
        // fallthrough to local impl
      }
    }
    // Local fallback implementation (same logic as provided)
    const supportedLangs = ['uk', 'ru', 'en'];
    const defaultLang = 'uk';
    let lang = document.documentElement.lang;
    if (lang) {
      lang = lang.toLowerCase().slice(0, 2);
      if (!supportedLangs.length || supportedLangs.includes(lang)) {
        return lang;
      }
    }
    const pathMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/i);
    if (pathMatch) {
      lang = pathMatch[1].toLowerCase();
      if (!supportedLangs.length || supportedLangs.includes(lang)) {
        return lang;
      }
    }
    return defaultLang;
  }

  // Localized messages
  const MSGS = {
    uk: {
      copied: 'Скопійовано',
      copiedWithValue: 'Скопійовано: {value}',
      notFound: 'Значення не знайдено',
      failed: 'Не вдалося скопіювати'
    },
    ru: {
      copied: 'Скопировано',
      copiedWithValue: 'Скопировано: {value}',
      notFound: 'Значение не найдено',
      failed: 'Не удалось скопировать'
    },
    en: {
      copied: 'Copied',
      copiedWithValue: 'Copied: {value}',
      notFound: 'Value not found',
      failed: 'Copy failed'
    }
  };

  function t(key, vars = {}) {
    const lang = getCurrentLangWrapper() || 'uk';
    const dict = MSGS[lang] || MSGS.uk;
    let str = dict[key] || '';
    Object.keys(vars).forEach(k => {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]);
    });
    return str;
  }

  // Create or get aria-live region for accessible announcements
  function ensureLiveRegion() {
    let live = document.getElementById(LIVE_ID);
    if (!live) {
      live = document.createElement('div');
      live.id = LIVE_ID;
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      live.className = 'visually-hidden';
      document.body.appendChild(live);
    }
    return live;
  }

  // Normalize value for copying: remove whitespace characters
  function normalizeValue(val) {
    if (!val) return '';
    return String(val).replace(/\s+/g, '').trim();
  }

  // Fallback copy (for older browsers)
  function fallbackCopyText(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  // Try navigator.clipboard, otherwise fallback
  async function writeTextToClipboard(text) {
    if (!text) return false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        // fall through to fallback
      }
    }
    return fallbackCopyText(text);
  }

  // Feedback: set temporary class and aria-label, announce in live region
  /*function giveFeedback(button, messageKey, value = '') {
    const live = ensureLiveRegion();
    // Save original aria-label if not saved
    if (!button.dataset._origAria) {
      button.dataset._origAria = button.getAttribute('aria-label') || '';
    }

    const message = value ? t(messageKey + 'WithValue'.replace('WithValue', 'WithValue')) : t(messageKey);
    // The above hack ensures we can call with 'copied' or 'copiedWithValue' easily.
    // Simpler: use explicit message selection:
    let finalMessage;
    if (messageKey === 'copied' && value) {
      finalMessage = t('copiedWithValue', { value });
    } else if (messageKey === 'notFound') {
      finalMessage = t('notFound');
    } else if (messageKey === 'failed') {
      finalMessage = t('failed');
    } else if (messageKey === 'copied') {
      finalMessage = t('copied');
    } else {
      finalMessage = t(messageKey) || message;
    }

    // Visual/aria feedback
    button.classList.add('copied');
    button.setAttribute('aria-label', finalMessage);
    live.textContent = finalMessage;

    // Clear after timeout
    clearTimeout(button._copyTimeout);
    button._copyTimeout = setTimeout(() => {
      button.classList.remove('copied');
      // restore aria-label
      if (button.dataset._origAria !== undefined) {
        button.setAttribute('aria-label', button.dataset._origAria);
        // optionally remove saved original
        // delete button.dataset._origAria;
      }
      // clear live region
      live.textContent = '';
    }, COPY_TIMEOUT_MS);
  }*/
    // Feedback: set temporary class and aria-label, announce in live region
  function giveFeedback(button, messageKey, value = '') {
    const live = ensureLiveRegion();
    // Сохраняем исходный aria-label
    if (!button.dataset._origAria) {
      button.dataset._origAria = button.getAttribute('aria-label') || '';
    }

    // Определяем финальное сообщение для aria/live region
    let finalMessage;
    if (messageKey === 'copied' && value) {
      finalMessage = t('copiedWithValue', { value });
    } else if (messageKey === 'notFound') {
      finalMessage = t('notFound');
    } else if (messageKey === 'failed') {
      finalMessage = t('failed');
    } else if (messageKey === 'copied') {
      finalMessage = t('copied');
    } else {
      finalMessage = t(messageKey);
    }

    // === Текущий фидбэк на кнопке (как было) ===
    button.classList.add('copied');
    button.setAttribute('aria-label', finalMessage);
    live.textContent = finalMessage;

    clearTimeout(button._copyTimeout);
    button._copyTimeout = setTimeout(() => {
      button.classList.remove('copied');
      if (button.dataset._origAria !== undefined) {
        button.setAttribute('aria-label', button.dataset._origAria);
      }
      live.textContent = '';
    }, COPY_TIMEOUT_MS);

    // === SweetAlert2 (без падений, если его нет) ===
    // Проверяем, что глобальный объект есть и у него есть метод fire
    if (!window.Swal || typeof window.Swal.fire !== 'function') {
      return; // SweetAlert2 недоступен – просто выходим
    }

    const lang = getCurrentLangWrapper() || 'uk';

    let title = '';
    let text = '';
    let icon = 'success';

    if (messageKey === 'copied') {
      // Без вывода конкретного значения
      if (lang === 'uk') {
        title = 'Скопійовано!';
        text = 'Дані скопійовано до буфера обміну.';
      } else if (lang === 'ru') {
        title = 'Скопировано!';
        text = 'Данные скопированы в буфер обмена.';
      } else {
        title = 'Copied!';
        text = 'Data has been copied to the clipboard.';
      }
      icon = 'success';
    } else if (messageKey === 'notFound') {
      if (lang === 'uk') {
        title = 'Помилка';
        text = 'Значення для копіювання не знайдено.';
      } else if (lang === 'ru') {
        title = 'Ошибка';
        text = 'Значение для копирования не найдено.';
      } else {
        title = 'Error';
        text = 'Value to copy was not found.';
      }
      icon = 'error';
    } else if (messageKey === 'failed') {
      if (lang === 'uk') {
        title = 'Не вдалося скопіювати';
        text = 'Спробуйте скопіювати дані вручну.';
      } else if (lang === 'ru') {
        title = 'Не удалось скопировать';
        text = 'Попробуйте скопировать данные вручную.';
      } else {
        title = 'Copy failed';
        text = 'Please try copying the data manually.';
      }
      icon = 'error';
    } else {
      // На всякий случай – если передадут что-то иное
      return;
    }

    window.Swal.fire({
      icon,
      title,
      text,
      toast: true,          // компактный тост
      position: 'top-end',  // можно поменять под дизайн
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
    });
  }

  // Main click handler (delegation)
  function onClickHandler(e) {
    const button = e.target.closest(BUTTON_SELECTOR);
    if (!button) return;
    // Only handle buttons inside container (safety)
    if (!button.closest(CONTAINER_SELECTOR)) return;

    // Prevent double processing
    if (button.dataset._copyBusy === '1') return;
    button.dataset._copyBusy = '1';

    // Priority: data-copy attribute
    let value = button.dataset.copy;
    // Fallback: find nearest <li> and then a <span> inside (existing markup)
    if (!value) {
      const li = button.closest('.payment__details-data');
      if (li) {
        const span = li.querySelector('span');
        if (span) value = span.textContent;
      }
    }

    value = normalizeValue(value);

    if (!value) {
      giveFeedback(button, 'notFound');
      button.dataset._copyBusy = '0';
      return;
    }

    writeTextToClipboard(value).then(success => {
      if (success) {
        // For visual users we show value; screen readers also get message via aria-live
        giveFeedback(button, 'copied', value);
      } else {
        giveFeedback(button, 'failed');
      }
      button.dataset._copyBusy = '0';
    });
  }

  // Initialize delegation
  function init() {
    const container = document.querySelector(CONTAINER_SELECTOR);
    if (!container) return;
    container.addEventListener('click', onClickHandler, false);
    // Create live region on init
    ensureLiveRegion();
  }

  // Auto init on DOMContentLoaded or immediately if ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

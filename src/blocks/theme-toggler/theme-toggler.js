(function () {
  const block = 'theme-toggler';
  const html = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  const STORAGE_KEY = 'site-theme';

  /**
   * Получить все переключатели темы
   * @returns {NodeListOf<Element>}
   */
  function getTogglers() {
    return document.querySelectorAll('.' + block);
  }

  /**
   * Получить сохранённую тему из localStorage
   * @returns {'light'|'dark'|null}
   */
  function getSavedTheme() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      if (value === 'light' || value === 'dark') return value;
    } catch {}
    return null;
  }

  /**
   * Сохранить выбранную тему в localStorage
   * @param {'light'|'dark'} theme
   */
  function saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }

  /**
   * Получить текущую системную тему
   * @returns {'light'|'dark'}
   */
  function getSystemTheme() {
    return prefersDark.matches ? 'dark' : 'light';
  }

  /**
   * Отключить анимацию при первой установке темы
   */
  function disableTransitionTemporarily() {
    html.classList.add('no-transition');
    void html.offsetWidth;
    setTimeout(function () {
      html.classList.remove('no-transition');
    }, 10);
  }

  /**
   * Включить плавный переход
   */
  function enableThemeTransition() {
    html.classList.add('theme-transition');
    setTimeout(function () {
      html.classList.remove('theme-transition');
    }, 350);
  }

  /**
   * Применить классы для элементов с data-theme-light/data-theme-dark
   * Работает даже если указан только один из вариантов
   * @param {'light'|'dark'} theme
   */
  function applyThemeClasses(theme) {
    document.querySelectorAll('[data-theme-light], [data-theme-dark]').forEach(function (el) {
      const lightClass = el.getAttribute('data-theme-light');
      const darkClass = el.getAttribute('data-theme-dark');

      if (lightClass) {
        el.classList.toggle(lightClass, theme === 'light');
      }

      if (darkClass) {
        el.classList.toggle(darkClass, theme === 'dark');
      }
    });
  }

  /**
   * Применить стиль для Google Maps через data-атрибуты на #map
   * @param {'light'|'dark'} theme
   */
  function applyMapStyle(theme) {
    const mapEl = document.getElementById('map');
    if (!mapEl || !window.myMap) return;

    const mapId = mapEl.getAttribute('data-map-' + theme);
    if (!mapId) return;

    window.myMap.setOptions({ mapId: mapId });
  }

  /**
   * Получить текущую активную тему
   * @returns {'light'|'dark'}
   */
  function getCurrentTheme() {
    return html.getAttribute('data-theme') || getSavedTheme() || getSystemTheme();
  }

  /**
   * Обновить состояние всех тогглеров
   * @param {'light'|'dark'} theme
   */
  function syncTogglers(theme) {
    getTogglers().forEach(function (btn) {
      btn.classList.toggle(block + '--dark', theme === 'dark');
      btn.classList.toggle(block + '--light', theme === 'light');

      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      btn.setAttribute(
        'aria-label',
        theme === 'dark'
          ? 'Переключити на світлу тему'
          : 'Переключити на темну тему'
      );
    });
  }

  /**
   * Применить тему
   * @param {'light'|'dark'} theme
   * @param {boolean} animate
   */
  function applyTheme(theme, animate) {
    if (animate) {
      enableThemeTransition();
    }

    html.setAttribute('data-theme', theme);
    applyThemeClasses(theme);
    applyMapStyle(theme);
    syncTogglers(theme);
  }

  /**
   * Повторно применить текущую тему
   */
  function reapplyCurrentTheme() {
    const currentTheme = getCurrentTheme();
    applyThemeClasses(currentTheme);
    applyMapStyle(currentTheme);
    syncTogglers(currentTheme);
    console.log('🎨 Тема применена к новым элементам:', currentTheme);
  }

  /**
   * Переключить тему
   */
  function toggleTheme() {
    const current = getCurrentTheme();
    const next = current === 'dark' ? 'light' : 'dark';

    saveTheme(next);
    applyTheme(next, true);
  }

  /**
   * Навесить обработчики на все тогглеры
   */
  function bindTogglers() {
    getTogglers().forEach(function (btn) {
      if (btn.dataset.themeTogglerBound === 'true') return;

      btn.addEventListener('click', toggleTheme);

      btn.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          toggleTheme();
        }
      });

      btn.dataset.themeTogglerBound = 'true';
    });
  }

  /**
   * Инициализация
   */
  window.addEventListener('DOMContentLoaded', function () {
    disableTransitionTemporarily();

    const savedTheme = getSavedTheme();
    if (savedTheme) {
      applyTheme(savedTheme, false);
    } else {
      applyTheme(getSystemTheme(), false);
    }

    bindTogglers();

    prefersDark.addEventListener('change', function (e) {
      if (!getSavedTheme()) {
        applyTheme(e.matches ? 'dark' : 'light', true);
      }
    });
  });

  window.applyCurrentTheme = reapplyCurrentTheme;
  window.getCurrentTheme = getCurrentTheme;
  window.bindThemeTogglers = bindTogglers;
})();

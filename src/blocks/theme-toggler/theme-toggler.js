(function() {
 /**
 * Theme toggler accessibility enhancer
 *
 * - НЕ переключает классы и темы!
 * - Обеспечивает корректные aria-label и aria-pressed для кнопки.
 * - Работает независимо от основного скрипта темизации.
 * - Использовать совместно с основным скриптом, который управляет классами.
 */

  const block = 'theme-toggler';
  const btn = document.querySelector(`.${block}`);
  if (!btn) return;

  // Утилита: Получить текущую тему по модификатору
  function getTheme() {
    if (btn.classList.contains(`${block}--dark`)) return 'dark';
    if (btn.classList.contains(`${block}--light`)) return 'light';
    return 'light'; // дефолт
  }

  // Установить aria-атрибуты
  function setA11yAttrs(theme) {
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    btn.setAttribute(
      'aria-label',
      theme === 'dark'
        ? 'Переключити на світлу тему'
        : 'Переключити на темну тему'
    );
  }

  // Обновлять aria при каждом изменении классов (например, после переключения темы)
  const observer = new MutationObserver(() => setA11yAttrs(getTheme()));
  observer.observe(btn, { attributes: true, attributeFilter: ['class'] });

  // Инициализация на старте
  setA11yAttrs(getTheme());

  // Доступность: space/enter
  btn.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      btn.click();
    }
  });
})();

(function () {
  const html = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  const btnId = 'toggle-theme';
  const STORAGE_KEY = 'site-theme';

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
   */
  function getSystemTheme() {
    return prefersDark.matches ? 'dark' : 'light';
  }

  /**
   * Отключить анимацию при первой установке темы (чтобы не было моргания)
   */
  function disableTransitionTemporarily() {
    html.classList.add('no-transition');
    void html.offsetWidth;
    setTimeout(() => {
      html.classList.remove('no-transition');
    }, 10);
  }

  /**
   * Включить плавный переход (используется при ручном переключении)
   */
  function enableThemeTransition() {
    html.classList.add('theme-transition');
    setTimeout(() => {
      html.classList.remove('theme-transition');
    }, 350);
  }

  /**
   * Применить классы для элементов с data-theme-light/data-theme-dark
   * Работает даже если указан только один из вариантов!
   */
  function applyThemeClasses(theme) {
    document.querySelectorAll('[data-theme-light], [data-theme-dark]').forEach(el => {
      const lightClass = el.getAttribute('data-theme-light');
      const darkClass = el.getAttribute('data-theme-dark');
      if (lightClass) el.classList.toggle(lightClass, theme === 'light');
      if (darkClass) el.classList.toggle(darkClass, theme === 'dark');
    });
  }

  /**
   * Применить стиль для Google Maps через data-атрибуты на #map
   */
  function applyMapStyle(theme) {
    const mapEl = document.getElementById('map');
    if (!mapEl || !window.myMap) return;
    const mapId = mapEl.getAttribute(`data-map-${theme}`);
    if (!mapId) return;
    window.myMap.setOptions({ mapId });
  }

  /**
   * Применить тему (основная функция)
   * @param {'light'|'dark'} theme
   * @param {boolean} animate
   */
  function applyTheme(theme, animate = false) {
    if (animate) enableThemeTransition();
    html.setAttribute('data-theme', theme);
    applyThemeClasses(theme);
    applyMapStyle(theme);
  }

  /**
   * Получить текущую активную тему
   * @returns {'light'|'dark'}
   */
  function getCurrentTheme() {
    return html.getAttribute('data-theme') || getSavedTheme() || getSystemTheme();
  }

  /**
   * Применить текущую тему (без анимации)
   * Используется после AJAX-загрузки новых элементов
   */
  function reapplyCurrentTheme() {
    const currentTheme = getCurrentTheme();
    applyThemeClasses(currentTheme);
    console.log('🎨 Тема применена к новым элементам:', currentTheme);
  }

  /**
   * Переключение темы по кнопке
   */
  function toggleTheme() {
    const current = getCurrentTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    saveTheme(next);
    applyTheme(next, true);
  }

  /**
   * Инициализация
   */
  window.addEventListener('DOMContentLoaded', () => {
    disableTransitionTemporarily();

    const savedTheme = getSavedTheme();
    if (savedTheme) {
      applyTheme(savedTheme, false);
    } else {
      applyTheme(getSystemTheme(), false);
    }

    const btn = document.getElementById(btnId);
    if (btn) btn.addEventListener('click', toggleTheme);

    prefersDark.addEventListener('change', (e) => {
      if (!getSavedTheme()) {
        applyTheme(e.matches ? 'dark' : 'light', true);
      }
    });
  });

  // ✅ ЭКСПОРТИРУЕМ ФУНКЦИИ В WINDOW
  window.applyCurrentTheme = reapplyCurrentTheme;
  window.getCurrentTheme = getCurrentTheme;

  console.log('📦 Функции темы экспортированы:', {
    applyCurrentTheme: typeof window.applyCurrentTheme,
    getCurrentTheme: typeof window.getCurrentTheme
  });
})();



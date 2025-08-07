document.documentElement.className = document.documentElement.className.replace('no-js', 'js');

// Добавление 1vh (использование: height: 100vh; height: calc(var(--vh, 1vh) * 100);) для фикса 100vh на мобилках
let vh = window.innerHeight * 0.01;
document.documentElement.style.setProperty('--vh', `${vh}px`);
window.addEventListener('resize', () => {
  let vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
});

(function () {
  function canUseWebp() {
    let elem = document.createElement('canvas');
    return !!(elem.getContext && elem.getContext('2d'))
      && elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  function loadBackgroundImage(element, fastScroll) {
    let isWebpSupported = canUseWebp();
    let bgImage = isWebpSupported
      ? element.getAttribute('data-bg-webp')
      : element.getAttribute('data-bg');

    if (bgImage) {
      element.style.backgroundImage = `url(${bgImage})`;
      element.removeAttribute('data-bg');
      element.removeAttribute('data-bg-webp');

      // Читаем скорость из атрибута (по умолчанию 1 сек)
      let speed = parseFloat(element.getAttribute('data-bg-speed')) || 1;
      if (fastScroll) speed *= 0.5; // Ускоряем при быстрой прокрутке

      // Плавное появление
      requestAnimationFrame(() => {
        element.style.transition = `opacity ${speed}s ease-out`;
        element.style.opacity = 1;
      });
    }
  }

  function observeLazyLoad() {
    let lazyElements = document.querySelectorAll('[data-bg], [data-bg-webp]');

    lazyElements.forEach(el => {
      el.style.opacity = '0';
      el.style.willChange = 'opacity';
    });

    let lastTime = performance.now();
    let lastScrollY = window.scrollY;

    if ('IntersectionObserver' in window) {
      let observer = new IntersectionObserver((entries, obs) => {
        let now = performance.now();
        let deltaY = Math.abs(window.scrollY - lastScrollY);
        let deltaT = now - lastTime;
        let speed = deltaY / (deltaT || 1);
        let fastScroll = speed > 1;

        entries.forEach(entry => {
          if (entry.isIntersecting) {
            loadBackgroundImage(entry.target, fastScroll);
            obs.unobserve(entry.target);
          }
        });

        lastTime = now;
        lastScrollY = window.scrollY;
      }, { rootMargin: '0px', threshold: 0.1 });

      lazyElements.forEach(el => observer.observe(el));
    } else {
      lazyElements.forEach(el => loadBackgroundImage(el, false));
    }
  }

  document.addEventListener('DOMContentLoaded', observeLazyLoad);

  /* Разметка:
    // Фон появится за 0.5 секунды
    <div data-bg="/images/image2.jpg" data-bg-webp="/images/image2.webp" data-bg-speed="0.5"></div>

    // Фон появится дефолтно за 1 сек
    <div data-bg="/img/image.jpg" data-bg-webp="/img/image.webp"></div>
  */

})();

(function () {
  const html = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  const btnId = 'toggle-theme';
  const STORAGE_KEY = 'site-theme'; // ключ для хранения выбранной темы

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
    }, 350); // время должно совпадать с CSS
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
  // function applyMapStyle(theme) {
  //   const mapEl = document.getElementById('map');
  //   if (!mapEl || !window.myMap || !window.google) return;
  //   const styleUrl = mapEl.getAttribute(`data-map-${theme}`);
  //   if (!styleUrl) return;
  //   fetch(styleUrl)
  //     .then(r => {
  //       if (!r.ok) throw new Error('Style JSON not found');
  //       return r.json();
  //     })
  //     .then(styleJson => {
  //       window.myMap.setOptions({ styles: styleJson });
  //     })
  //     .catch(() => {});
  // }

  function applyMapStyle(theme) {
    const mapEl = document.getElementById('map');
    if (!mapEl || !window.myMap) return;
    const mapId = mapEl.getAttribute(`data-map-${theme}`);
    if (!mapId) return;
    window.myMap.setOptions({ mapId });
    //window.location.reload(); // принудительная перезарузка
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
   * Переключение темы по кнопке
   */
  function toggleTheme() {
    const current = html.getAttribute('data-theme') || getSystemTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    saveTheme(next); // сохраняем выбор пользователя!
    applyTheme(next, true);
  }

  /**
   * Инициализация
   */
  window.addEventListener('DOMContentLoaded', () => {
    disableTransitionTemporarily();

    // 1. Смотрим, есть ли сохранённая тема
    const savedTheme = getSavedTheme();
    if (savedTheme) {
      applyTheme(savedTheme, false);
    } else {
      // 2. Если нет, берём system theme
      applyTheme(getSystemTheme(), false);
    }

    const btn = document.getElementById(btnId);
    if (btn) btn.addEventListener('click', toggleTheme);

    // Автоматическая смена темы при изменении системной настройки (только если пользователь не выбрал вручную)
    prefersDark.addEventListener('change', (e) => {
      if (!getSavedTheme()) {
        applyTheme(e.matches ? 'dark' : 'light', true);
      }
    });
  });
})();

(function () {
  const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
  const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl, {
      container: 'body',
      popperConfig: function (defaultConfig) {
        return {
          ...defaultConfig,
          modifiers: [
            ...defaultConfig.modifiers,
            {
              name: 'offset',
              options: {
                offset: [8, 8], // Сдвиг окна относительно элемента-триггера [x, y]
              }
            }
          ]
        };
      }
    }))
})();

(function(){
  const phoneElems = document.getElementsByClassName('phone-mask');
  Array.prototype.forEach.call(phoneElems, function (item) {
    const phoneMask = IMask(
      item, {
        mask: '+{38} (\\000) 000 00 00',
        lazy: true, // make placeholder always visible
    });
  });
}());

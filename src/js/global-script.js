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

// $(document).ready(function(){
//   if(window.matchMedia('(min-width: 1366px)').matches){
//   // do functionality on screens bigger than 1366px
//     $("#sticker").sticky({
//       topSpacing: 100
//     });
//   }
//   return false;
// });

/*(function () {
  //const agreementElems = document.querySelectorAll('.contacts__agreement');
  const agreementElems = document.querySelectorAll('[class$="__agreement"]');

  for (let i = 0; i < agreementElems.length; i++) {
    let agreementElem = agreementElems[i];
    if (!agreementElem) return;
    //const submitBtn = agreementElem.querySelector('.contacts__submit');
    const submitBtn = agreementElem.querySelector('button[type=submit]');
    const agreementCheckbox = agreementElem.querySelector('.agreement-field');

    if (agreementCheckbox) {
      agreementCheckbox.addEventListener('change', function (e) {
        if (!e.target.checked) {
          submitBtn.disabled = true;
        } else {
          submitBtn.disabled = false;
        }
      });
    }
  }

})();*/

/**
   * Theme Switcher Script
   *
   * Автоматически определяет и применяет светлую или тёмную тему на основе системных настроек пользователя.
   * Позволяет вручную переключать тему с плавной анимацией перехода.
   * Сохраняет выбор пользователя в localStorage и синхронизирует тему между всеми открытыми вкладками.
   * При удалении значения из localStorage возвращается к системной теме.
   *
   * Основные возможности:
   * - Автоматический выбор темы при первой загрузке (по system preference).
   * - Переключение темы по кнопке с id="toggle-theme" с плавным переходом.
   * - Реакция на изменение системной темы (если пользователь не выбрал вручную).
   * - Синхронизация темы между вкладками через событие storage.
   * - Отключение анимации при первой установке темы (через класс no-transition).
   *
   * Для корректной работы требуется:
   * - Кнопка с id="toggle-theme" для ручного переключения.
   * - Класс "no-transition" на <html> для предотвращения анимации при первой загрузке.
   * - CSS для .theme-transition с нужными transition-свойствами:
   * - html.no-transition *,
   * - html.no-transition {
   * -   transition: none !important;
   * - }
   * - html.theme-transition * {
   * -  transition:
   * -    background-color 0.3s ease,
   * -     color 0.3s ease,
   * -     border-color 0.3s ease;
   * - }
   */

/**
 * Theme Switcher Script (универсальный, расширяемый)
 *
 * Основные возможности:
 * - Автоматический выбор темы при первой загрузке (по system preference)
 * - Переключение темы по кнопке с id="toggle-theme" с плавным переходом
 * - Переключение классов для элементов через data-атрибуты (data-theme-light, data-theme-dark)
 * - Переключение стилей Google Maps через data-атрибуты на #map (data-map-light, data-map-dark)
 * - Не ломается, если часть data-атрибутов отсутствует
 *
 * Для корректной работы требуется::
 * - Класс no-transition должен быть на <html> при первой загрузке (или устанавливаться скриптом на долю секунды).
 * - Класс theme-transition добавляется скриптом на время анимации.
 * - CSS должен содержать правила для .theme-transition с нужными transition-свойствами..
 * - html.no-transition *,
 * - html.no-transition {
 * -   transition: none !important;
 * - }
 * - html.theme-transition * {
 * -  transition:
 * -    background-color 0.3s ease,
 * -     color 0.3s ease,
 * -     border-color 0.3s ease;
 * - }
 * - Элементы, которые должны менять класс при смене темы, должны содержать соответствующие data-атрибуты data-theme-light="" и data-theme-dark="" внтури их классы-модификаторы для своего варианта темы
 * - Контейнер карты должен быть с id="map" и data-map-light/data-map-dark (по желанию)
 * - Кнопка с id="toggle-theme" для ручного переключения темы
 * - myMap — глобальный экземпляр карты Google Maps (если нужно динамически менять стиль)
 */

(function () {
  const html = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  const btnId = 'toggle-theme';

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
    void html.offsetWidth; // reflow для применения класса
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
      // Проверяем наличие классов и применяем только те, которые указаны
      if (lightClass) el.classList.toggle(lightClass, theme === 'light');
      if (darkClass) el.classList.toggle(darkClass, theme === 'dark');
    });
  }

  /**
   * Применить стиль для Google Maps через data-атрибуты на #map
   * - Если карта не инициализирована — ничего не произойдет
   * - Если нужный data-map-... не указан, стиль карты не будет меняться
   */
  function applyMapStyle(theme) {
    const mapEl = document.getElementById('map');
    if (!mapEl || !window.myMap || !window.google) return;

    const styleUrl = mapEl.getAttribute(`data-map-${theme}`);
    if (!styleUrl) return; // стиль для темы не задан

    // Загружаем JSON файл и применяем стиль
    fetch(styleUrl)
      .then(r => {
        if (!r.ok) throw new Error('Style JSON not found');
        return r.json();
      })
      .then(styleJson => {
        window.myMap.setOptions({ styles: styleJson });
      })
      .catch(() => {
        // Не падаем если файл не найден или формат неверный
      });
  }

  /**
   * Применить тему (основная функция)
   * @param {'light'|'dark'} theme
   * @param {boolean} animate
   */
  function applyTheme(theme, animate = false) {
    if (animate) enableThemeTransition();
    html.setAttribute('data-theme', theme);

    applyThemeClasses(theme);   // Переключаем классы на элементах
    applyMapStyle(theme);       // Переключаем стиль карты, если нужно
  }

  /**
   * Переключение темы по кнопке
   */
  function toggleTheme() {
    const current = html.getAttribute('data-theme') || getSystemTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next, true);
  }

  /**
   * Инициализация
   */
  window.addEventListener('DOMContentLoaded', () => {
    disableTransitionTemporarily();
    applyTheme(getSystemTheme(), false);

    const btn = document.getElementById(btnId);
    if (btn) btn.addEventListener('click', toggleTheme);

    // Автоматическая смена темы при изменении системной настройки (по желанию)
    // prefersDark.addEventListener('change', (e) => {
    //   applyTheme(e.matches ? 'dark' : 'light', true);
    // });
  });

})();

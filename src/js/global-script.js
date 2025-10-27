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

/*(function () {
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
})();*/

(function () {
  const selector = '[data-bs-toggle="popover"]';

  function isVisible(el) {
    return !!el && (el.offsetParent !== null || el.getClientRects().length > 0);
  }

  function createPopover(el) {
    if (!el || el.__bs_popover_inited) return;
    el.__bs_popover_inited = true;

    new bootstrap.Popover(el, {
      container: 'body',
      trigger: el.getAttribute('data-bs-trigger') || 'click focus',
      popperConfig(defaultConfig) {
        return {
          ...defaultConfig,
          modifiers: [
            ...defaultConfig.modifiers,
            { name: 'offset', options: { offset: [8, 8] } }
          ]
        };
      }
    });
  }

  // Инициализировать видимые сразу
  function initVisible() {
    document.querySelectorAll(selector).forEach(el => {
      if (isVisible(el)) createPopover(el);
    });
  }

  // Вспомогательная функция: получить первый Element из события (без ошибок)
  function eventTargetElement(e) {
    // Попытка использовать composedPath (работает в Shadow DOM и для некоторых сложных случаев)
    if (typeof e.composedPath === 'function') {
      const path = e.composedPath();
      for (const node of path) {
        if (node instanceof Element) return node;
      }
    }

    // fallback: если target — элемент, возвращаем; если текстовый узел — возвращаем parentElement
    let t = e.target;
    if (t instanceof Element) return t;
    if (t && t.nodeType === 3) { // текстовый узел
      return t.parentElement;
    }
    // поднимаемся по parentNode, пока не найдём Element или не дойдём до корня
    while (t && t.parentNode) {
      t = t.parentNode;
      if (t instanceof Element) return t;
    }
    return null;
  }

  // Делегированная инициализация: безопасно ищем элемент и вызываем createPopover
  ['click', 'focusin'].forEach(evt =>
    document.addEventListener(evt, function (e) {
      const targetEl = eventTargetElement(e);
      if (!targetEl) return;
      // Вызов closest только если функция доступна
      const el = (typeof targetEl.closest === 'function') ? targetEl.closest(selector) : null;
      if (!el) return;
      if (!el.__bs_popover_inited) createPopover(el);
      // Не вызываем .show() вручную — даём Bootstrap'у обработать событие штатно
    }, true)
  );

  // Наблюдатель за динамическим добавлением/изменением
  const mo = new MutationObserver(mutations => {
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches(selector) && isVisible(node)) createPopover(node);
          if (node.querySelectorAll) {
            node.querySelectorAll(selector).forEach(el => { if (isVisible(el)) createPopover(el); });
          }
        });
      } else if (m.type === 'attributes') {
        const t = m.target;
        if (t.matches && t.matches(selector) && isVisible(t)) createPopover(t);
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });

  // Запуск при загрузке
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVisible);
  } else {
    initVisible();
  }
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

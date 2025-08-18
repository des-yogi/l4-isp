  // Ленивый инициализатор для DotLottie (импорт модуля откладывается до реальной необходимости)
  // Поддерживает:
  // - data-src на плейсхолдерах (.lottie-player или div.canvas)
  // - .lottie-player.lazy — будет инициализировано при вхождении в viewport
  // - .lottie-player:not(.lazy) — инициализируется как можно раньше (после загрузки модуля)
  // Для CDN-модулей используется dynamic import(/* webpackIgnore: true */), с fallback на вставку <script type="module">.
  //
  // Примечание: путь MODULE_URL можно заменить на локальный бандл при сборке/CI.

  const MODULE_URL = 'https://esm.sh/@lottiefiles/dotlottie-web';
  const SELECTOR = '.lottie-player';
  const LAZY_CLASS = 'lazy';
  let moduleLoadPromise = null;

  function loadModuleOnce() {
    if (moduleLoadPromise) return moduleLoadPromise;

    // Попытка dynamic import. webpackIgnore нужен если у вас сборщик, чтобы не резолвить на сборке.
    try {
      moduleLoadPromise = import(/* webpackIgnore: true */ MODULE_URL)
        .then(mod => mod)
        .catch(err => {
          // Если import не сработал (CORS/сервер/бандл не ESM), пробуем fallback — вставка <script type="module">
          // Этот fallback вернёт промис, который резолвится когда скрипт загрузится.
          moduleLoadPromise = new Promise((resolve, reject) => {
            if (document.querySelector(`script[type="module"][data-lazy-dotlottie]`)) {
              // уже вставлен — ждём его загрузки
              const existing = document.querySelector(`script[type="module"][data-lazy-dotlottie]`);
              existing.addEventListener('load', () => resolve(window.__DotLottieModuleFallback || {}), { once: true });
              existing.addEventListener('error', () => reject(new Error('Failed to load dotlottie module (fallback)')), { once: true });
              return;
            }
            const s = document.createElement('script');
            s.type = 'module';
            s.setAttribute('data-lazy-dotlottie', '1');
            s.src = MODULE_URL;
            s.onload = () => {
              // Библиотека должна выставить что-то в глобал при подключении через script-tag,
              // но это зависит от конкретного бандла. Мы пробуем вернуть window.DotLottie или window.__DotLottieModuleFallback
              resolve(window.DotLottie ? { DotLottie: window.DotLottie } : (window.__DotLottieModuleFallback || {}));
            };
            s.onerror = () => reject(new Error('Failed to load dotlottie module (fallback script)'));
            document.head.appendChild(s);
          });
          return moduleLoadPromise;
        });
    } catch (e) {
      // В очень старых окружениях dynamic import бросит синхронно
      moduleLoadPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.type = 'module';
        s.setAttribute('data-lazy-dotlottie', '1');
        s.src = MODULE_URL;
        s.onload = () => resolve(window.DotLottie ? { DotLottie: window.DotLottie } : (window.__DotLottieModuleFallback || {}));
        s.onerror = () => reject(new Error('Failed to load dotlottie module (sync fallback)'));
        document.head.appendChild(s);
      });
    }

    return moduleLoadPromise;
  }

  function parseAlign(raw = '0.5,0.5') {
    const parts = String(raw).split(',').map(s => parseFloat(s.trim()));
    const a0 = Number.isFinite(parts[0]) ? parts[0] : 0.5;
    const a1 = Number.isFinite(parts[1]) ? parts[1] : 0.5;
    return [a0, a1];
  }

  function initLottieAnimation(el, mod) {
    try {
      // модуль может экспортировать DotLottie как named export или default; это покрываем
      const DotLottieConstructor = (mod && (mod.DotLottie || mod.default || mod)) || window.DotLottie || null;
      if (!DotLottieConstructor) {
        console.warn('DotLottie constructor not found after module load.');
        return;
      }

      const src = el.dataset.src || el.getAttribute('data-src') || el.getAttribute('src');
      if (!src) return;

      const fit = el.dataset.fit || 'cover';
      const alignRaw = el.dataset.align || '0.5,0.5';
      const align = parseAlign(alignRaw);

      // Если элемент уже был инициализирован — пропускаем
      if (el.__dotlottie_inited) return;

      // Некоторые реализации ожидают canvas, другие — контейнер. Мы передаём el как canvas/container.
      // Создаём экземпляр
      try {
        new DotLottieConstructor({
          canvas: el,
          src,
          loop: el.dataset.loop !== 'false', // по умолчанию true — можно переопределить data-loop="false"
          autoplay: el.dataset.autoplay !== 'false',
          layout: {
            fit,
            align
          }
        });
        el.__dotlottie_inited = true;
        el.classList.remove(LAZY_CLASS);
      } catch (err) {
        console.warn('Failed to instantiate DotLottie:', err);
      }
    } catch (err) {
      console.warn('Error in initLottieAnimation:', err);
    }
  }

  // Инициализация: наблюдение за ленивыми элементами и обработка non-lazy
  function initAll() {
    const lazyEls = Array.from(document.querySelectorAll(`${SELECTOR}.${LAZY_CLASS}`));
    const eagerEls = Array.from(document.querySelectorAll(`${SELECTOR}:not(.${LAZY_CLASS})`));

    // Если нет lazy и нет eager — ничего не делать
    if (!lazyEls.length && !eagerEls.length) return;

    // Если нет IntersectionObserver — загружаем модуль и инициализируем все сразу
    if (!('IntersectionObserver' in window)) {
      loadModuleOnce()
        .then(mod => {
          eagerEls.forEach(el => initLottieAnimation(el, mod));
          lazyEls.forEach(el => initLottieAnimation(el, mod));
        })
        .catch(err => {
          console.warn('Failed to load dotlottie module:', err);
        });
      return;
    }

    // Обсервер для ленивых: подгружаем модуль только при первом пересечении
    let moduleLoaded = false;
    let observer = new IntersectionObserver((entries, obs) => {
      const toInit = [];
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          toInit.push(entry.target);
          obs.unobserve(entry.target);
        }
      });
      if (toInit.length) {
        // загрузим модуль один раз и инициализируем найденные элементы
        if (!moduleLoaded) {
          moduleLoaded = true;
          loadModuleOnce()
            .then(mod => {
              toInit.forEach(el => initLottieAnimation(el, mod));
            })
            .catch(err => {
              console.warn('Failed to load dotlottie module:', err);
            });
        } else {
          // модуль уже загружается/загружен — дождёмся и инитим
          loadModuleOnce().then(mod => toInit.forEach(el => initLottieAnimation(el, mod)));
        }
      }
    }, {
      root: null,
      rootMargin: '300px', // подгрузка заранее, чтобы анимация была готова при входе в экран
      threshold: 0.01
    });

    lazyEls.forEach(el => observer.observe(el));

    // Для eager элементов — загружаем модуль параллельно и инициализируем их как можно раньше
    if (eagerEls.length) {
      loadModuleOnce()
        .then(mod => {
          eagerEls.forEach(el => initLottieAnimation(el, mod));
        })
        .catch(err => {
          console.warn('Failed to load dotlottie module for eager elements:', err);
        });
    }
  }

  // Ждём DOM (наиболее универсально)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    // already ready
    initAll();
  }

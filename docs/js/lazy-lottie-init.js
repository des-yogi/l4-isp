// lazy-lottie-init.js
// Ленивый загрузчик и инициализатор для https://esm.sh/@lottiefiles/dotlottie-web
(function () {
  'use strict';

  const MODULE_URL = 'https://esm.sh/@lottiefiles/dotlottie-web';
  const SELECTOR = '.lottie-player';
  const LAZY_CLASS = 'lazy';
  const MODULE_LOAD_TIMEOUT = 15000; // ms
  const OBSERVER_ROOT_MARGIN = '300px';
  const INIT_CONCURRENCY = 3;

  let moduleLoadPromise = null;
  let moduleLoadStarted = false;
  const initQueue = [];
  let initRunning = 0;

  function loadModuleOnce() {
    if (moduleLoadPromise) return moduleLoadPromise;
    moduleLoadStarted = true;

    moduleLoadPromise = (async function () {
      // 1) Попытка dynamic import
      try {
        const mod = await import(/* webpackIgnore: true */ MODULE_URL);
        if (mod) {
          //console.info('lazy-dotlottie: dynamic import succeeded');
          return mod;
        }
      } catch (e) {
        console.warn('lazy-dotlottie: dynamic import failed:', e && e.message ? e.message : e);
      }

      // 2) Fallback: вставить inline <script type="module"> который делает import и выставляет window.__dotlottie_module
      try {
        const mod = await loadModuleViaInlineImport(MODULE_URL, MODULE_LOAD_TIMEOUT);
        if (mod) {
          console.info('lazy-dotlottie: inline module import succeeded');
          return mod;
        }
      } catch (e) {
        console.warn('lazy-dotlottie: inline import failed:', e && e.message ? e.message : e);
      }

      console.warn('lazy-dotlottie: module load failed — animations will be skipped.');
      return null;
    })();

    // В случае неожиданных ошибок, не оставляем uncaught rejection — резолвим в null и позволяем последующую ретри попытку
    moduleLoadPromise = moduleLoadPromise.catch(function (err) {
      console.warn('lazy-dotlottie: loadModuleOnce unexpected error:', err);
      moduleLoadPromise = null;
      moduleLoadStarted = false;
      return null;
    });

    return moduleLoadPromise;
  }

  function loadModuleViaInlineImport(url, timeoutMs) {
    return new Promise(function (resolve) {
      try {
        if (!url) return resolve(null);

        // Если глобаль уже выставлена
        if (window.__dotlottie_module) return resolve(window.__dotlottie_module);

        // Если helper уже вставлен ранее — подождём глобаль с таймаутом
        if (document.querySelector('script[data-lazy-dotlottie-inline="1"]')) {
          var checks = 0;
          var interval = setInterval(function () {
            checks++;
            if (window.__dotlottie_module) {
              clearInterval(interval);
              return resolve(window.__dotlottie_module);
            }
            if (checks * 100 >= timeoutMs) {
              clearInterval(interval);
              return resolve(null);
            }
          }, 100);
          return;
        }

        var s = document.createElement('script');
        s.setAttribute('type', 'module');
        s.setAttribute('data-lazy-dotlottie-inline', '1');

        // Используем конкатенацию строк (без шаблонных литералов) чтобы исключить проблемы при транспиляции/копировании.
        s.textContent = "import * as __m from '" + url + "';\n" +
                        "window.__dotlottie_module = (__m && Object.keys(__m).length) ? __m : (__m && __m.default ? { default: __m.default } : __m);\n";

        var timeoutId = setTimeout(function () {
          try { s.remove(); } catch (e) { /* ignore */ }
          resolve(null);
        }, timeoutMs);

        document.head.appendChild(s);

        // Ожидаем global
        var checks2 = 0;
        var iv = setInterval(function () {
          checks2++;
          if (window.__dotlottie_module) {
            clearInterval(iv);
            clearTimeout(timeoutId);
            resolve(window.__dotlottie_module);
            return;
          }
          if (checks2 * 100 >= timeoutMs) {
            clearInterval(iv);
            clearTimeout(timeoutId);
            resolve(null);
            return;
          }
        }, 100);
      } catch (err) {
        console.warn('lazy-dotlottie: loadModuleViaInlineImport exception:', err);
        resolve(null);
      }
    });
  }

  function isElementRenderable(el) {
    if (!el) return false;
    try {
      var cs = window.getComputedStyle(el);
      if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return false;
      var r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return false;
      return true;
    } catch (e) {
      return true;
    }
  }

  function enqueueInit(el, mod) {
    initQueue.push({ el: el, mod: mod });
    processQueue();
  }
  function processQueue() {
    if (!initQueue.length) return;
    if (initRunning >= INIT_CONCURRENCY) return;
    var item = initQueue.shift();
    initRunning++;
    Promise.resolve().then(function () {
      try {
        initLottieAnimation(item.el, item.mod);
      } catch (e) {
        console.warn('lazy-dotlottie: init error', e);
      } finally {
        initRunning--;
        setTimeout(processQueue, 10);
      }
    });
  }

  function initLottieAnimation(el, mod) {
    try {
      if (!el || el.__dotlottie_inited) return;
      if (!isElementRenderable(el)) {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(function () {
            if (isElementRenderable(el) && !el.__dotlottie_inited) enqueueInit(el, mod);
          }, { timeout: 1000 });
        }
        return;
      }

      if (!mod && !window.__dotlottie_module) {
        el.__dotlottie_failed = true;
        return;
      }

      var m = mod || window.__dotlottie_module;
      var DotLottieConstructor = (m && (m.DotLottie || m.default || m)) || null;
      if (!DotLottieConstructor) {
        console.warn('lazy-dotlottie: DotLottie constructor not found in loaded module');
        el.__dotlottie_failed = true;
        return;
      }

      var src = el.dataset.src || el.getAttribute('data-src') || el.getAttribute('src');
      if (!src) return;

      var fit = el.dataset.fit || 'cover';
      var alignRaw = el.dataset.align || '0.5,0.5';
      var parts = String(alignRaw).split(',').map(function (s) { return parseFloat(s.trim()); });
      var ax = Number.isFinite(parts[0]) ? parts[0] : 0.5;
      var ay = Number.isFinite(parts[1]) ? parts[1] : 0.5;

      var autoplay = ('autoplay' in el.dataset) ? (el.dataset.autoplay !== 'false') : true;
      var loop = ('loop' in el.dataset) ? (el.dataset.loop !== 'false') : true;

      try {
        new DotLottieConstructor({
          canvas: el,
          src: src,
          loop: loop,
          autoplay: autoplay,
          layout: { fit: fit, align: [ax, ay] }
        });
        el.__dotlottie_inited = true;
        el.classList.remove(LAZY_CLASS);
      } catch (err) {
        console.warn('lazy-dotlottie: failed to instantiate DotLottie:', err);
        el.__dotlottie_failed = true;
      }
    } catch (err) {
      console.warn('lazy-dotlottie: unexpected error in initLottieAnimation:', err);
    }
  }

  function initAll() {
    var lazyEls = Array.prototype.slice.call(document.querySelectorAll(SELECTOR + '.' + LAZY_CLASS));
    var eagerEls = Array.prototype.slice.call(document.querySelectorAll(SELECTOR + ':not(.' + LAZY_CLASS + ')'));
    if (!lazyEls.length && !eagerEls.length) return;

    if (!('IntersectionObserver' in window)) {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(function () {
          loadModuleOnce().then(function (mod) {
            if (!mod && !window.__dotlottie_module) return;
            eagerEls.forEach(function (el) { enqueueInit(el, mod); });
            lazyEls.forEach(function (el) { enqueueInit(el, mod); });
          });
        }, { timeout: 1000 });
      } else {
        loadModuleOnce().then(function (mod) {
          if (!mod && !window.__dotlottie_module) return;
          eagerEls.forEach(function (el) { enqueueInit(el, mod); });
          lazyEls.forEach(function (el) { enqueueInit(el, mod); });
        });
      }
      return;
    }

    var moduleRequested = false;
    var observer = new IntersectionObserver(function (entries, obs) {
      var toInit = [];
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          obs.unobserve(entry.target);
          if (isElementRenderable(entry.target)) toInit.push(entry.target);
        }
      });
      if (!toInit.length) return;
      if (!moduleRequested) {
        moduleRequested = true;
        loadModuleOnce().then(function (mod) {
          if (!mod && !window.__dotlottie_module) return;
          toInit.forEach(function (el) { enqueueInit(el, mod); });
        });
      } else {
        loadModuleOnce().then(function (mod) {
          if (!mod && !window.__dotlottie_module) return;
          toInit.forEach(function (el) { enqueueInit(el, mod); });
        });
      }
    }, { root: null, rootMargin: OBSERVER_ROOT_MARGIN, threshold: 0.01 });

    lazyEls.forEach(function (el) {
      if (!el.__dotlottie_inited) observer.observe(el);
    });

    if (eagerEls.length) {
      var doEager = function () {
        loadModuleOnce().then(function (mod) {
          if (!mod && !window.__dotlottie_module) return;
          eagerEls.forEach(function (el) {
            if (!el.__dotlottie_inited && isElementRenderable(el)) enqueueInit(el, mod);
          });
        });
      };
      if ('requestIdleCallback' in window) requestIdleCallback(doEager, { timeout: 2000 });
      else setTimeout(doEager, 200);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // отладочный экспорт
  window.__lazyDotLottie = {
    loadModuleOnce: loadModuleOnce,
    initAll: initAll,
    get moduleStarted() { return moduleLoadStarted; }
  };
})();

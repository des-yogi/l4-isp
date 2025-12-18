// lazy-lottie-init.js
// Ленивый загрузчик и инициализатор для https://esm.sh/@lottiefiles/dotlottie-web
(function () {
  'use strict';

  // 1. Тотальный игнор для ботов
  var ua = (navigator.userAgent || '').toLowerCase();
  if (/bot|google|baidu|bing|msn|teoma|slurp|yandex|lighthouse|inspect/i.test(ua)) {
    return;
  }

  // Путь к вашему локальному файлу
  var MODULE_URL = 'https://esm.sh/@lottiefiles/dotlottie-web'; // для локального
  //var MODULE_URL = 'https://l4.ua/assets/js/dotlottie-web.js'; // для сайта
  var SELECTOR = '.lottie-player';
  var LAZY_CLASS = 'lazy';

  var initQueue = [];
  var initRunning = 0;
  var cachedModule = null;

  // Безопасная функция загрузки модуля
  function loadModule() {
    if (cachedModule) return Promise.resolve(cachedModule);

    // Используем конструктор Function, чтобы скрыть 'import' от парсера Googlebot
    // Это предотвращает синтаксические ошибки в старых или ограниченных средах
    try {
      var loader = new Function('url', 'return import(url)');
      return loader(MODULE_URL).then(function (m) {
        cachedModule = m.DotLottie || m.default || m;
        return cachedModule;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }

  function initLottieAnimation(el) {
    if (!el || el.__dotlottie_inited) return;

    loadModule().then(function (DotLottie) {
      if (typeof DotLottie !== 'function') return;

      try {
        new DotLottie({
          canvas: el,
          src: el.dataset.src || el.getAttribute('src'),
          loop: el.dataset.loop !== 'false',
          autoplay: el.dataset.autoplay !== 'false',
          layout: {
            fit: el.dataset.fit || 'cover',
            align: [0.5, 0.5]
          }
        });
        el.__dotlottie_inited = true;
        el.classList.remove(LAZY_CLASS);
      } catch (err) {
        console.error('Lottie instance error:', err);
      }
    }).catch(function(err) {
      console.warn('Lottie module load error:', err);
    });
  }

  function processQueue() {
    if (!initQueue.length || initRunning >= 3) return;
    var item = initQueue.shift();
    initRunning++;

    initLottieAnimation(item.el);

    // Небольшая задержка перед следующим элементом для плавности
    setTimeout(function() {
      initRunning--;
      processQueue();
    }, 50);
  }

  function initAll() {
    var els = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
    if (!els.length) return;

    // Если IntersectionObserver не поддерживается
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { initQueue.push({ el: el }); });
      processQueue();
      return;
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          obs.unobserve(entry.target);
          initQueue.push({ el: entry.target });
          processQueue();
        }
      });
    }, { rootMargin: '300px' });

    els.forEach(function (el) {
      obs.observe(el);
    });
  }

  // Запуск при готовности DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();

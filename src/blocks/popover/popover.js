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
                offset: [8, 8],
              }
            }
          ]
        };
      }
    }))
})();*/

(function () {
  // Надёжный и компактный инициализатор Bootstrap 5 popover'ов.
  // Поведение:
  // - Удаляет data-bs-trigger из HTML (если есть) и задаёт trigger: 'click focus' при инициализации,
  //   чтобы избежать конфликтов с focus-only.
  // - Инициализирует видимые триггеры сразу, скрытые — при первом взаимодействии.
  // - При shown одного popover прячет остальные.
  // - Глобально закрывает popover'ы при клике/тапе вне.
  // - Поддержка динамического DOM через MutationObserver.
  // DEBUG: при необходимости включите для логов
  const DEBUG = false;
  const selector = '[data-bs-toggle="popover"]';
  const popovers = new Map(); // element -> { instance, popoverRoot }

  function log(...args) { if (DEBUG) console.log('[popovers]', ...args); }

  function isVisible(el) {
    return !!el && (el.offsetParent !== null || el.getClientRects().length > 0);
  }

  function getPopoverRoot(instance) {
    try {
      const id = instance && instance._element && instance._element.getAttribute && instance._element.getAttribute('aria-describedby');
      if (!id) return null;
      return document.getElementById(id);
    } catch (e) {
      return null;
    }
  }

  function hideAllExcept(exceptEl) {
    popovers.forEach(({ instance }, el) => {
      if (el !== exceptEl && instance) {
        try { instance.hide(); } catch (e) { /* ignore */ }
      }
    });
  }

  function createPopover(el) {
    if (!el || popovers.has(el)) return;

    log('createPopover for', el);

    // Удаляем data-bs-trigger из DOM, чтобы гарантировать единообразное поведение
    try { el.removeAttribute('data-bs-trigger'); } catch (e) { /* ignore */ }

    const instance = new bootstrap.Popover(el, {
      container: 'body',
      trigger: 'click focus', // принудительно click+focus
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

    popovers.set(el, { instance, popoverRoot: null });

    el.addEventListener('shown.bs.popover', () => {
      const data = popovers.get(el);
      if (data) data.popoverRoot = getPopoverRoot(instance);
      log('shown', el, data && data.popoverRoot);
      hideAllExcept(el);
    });

    el.addEventListener('hidden.bs.popover', () => {
      const data = popovers.get(el);
      if (data) data.popoverRoot = null;
      log('hidden', el);
    });

    // Локальный пост-click fallback: если popover "залип" после клика по тому же триггеру,
    // то закрываем его (в bubble-фазе, чтобы не мешать Bootstrap).
    el.addEventListener('click', function () {
      setTimeout(() => {
        try {
          const root = getPopoverRoot(instance);
          const isOpen = !!root;
          log('local post-click check for', el, 'isOpen=', isOpen);
          if (isOpen) {
            // если поповер остался открытым после повторного клика по тому же элементу — закрываем
            try { instance.hide(); } catch (err) { /* ignore */ }
          }
        } catch (e) {
          log('post-click exception', e);
        }
      }, 0);
    }, false);
  }

  // Инициализировать видимые сразу
  function initVisible() {
    document.querySelectorAll(selector).forEach(el => {
      if (isVisible(el)) createPopover(el);
    });
  }

  // Безопасно получить Element из события
  function eventTargetElement(e) {
    if (typeof e.composedPath === 'function') {
      const path = e.composedPath();
      for (const node of path) if (node instanceof Element) return node;
    }
    let t = e.target;
    if (t instanceof Element) return t;
    if (t && t.nodeType === 3) return t.parentElement;
    while (t && t.parentNode) {
      t = t.parentNode;
      if (t instanceof Element) return t;
    }
    return null;
  }

  // Делегированная инициализация (capture=true) — создаём instance до штатной обработки,
  // но не форсируем show/hide
  ['click', 'focusin'].forEach(evt =>
    document.addEventListener(evt, function (e) {
      const targetEl = eventTargetElement(e);
      if (!targetEl) return;
      const el = (typeof targetEl.closest === 'function') ? targetEl.closest(selector) : null;
      if (!el) return;
      if (!popovers.has(el)) {
        log('interaction: creating popover for', el, 'eventType=', evt);
        createPopover(el);
      }
    }, true)
  );

  // Глобальный обработчик: закрывать popover'ы по клику/тапу вне
  function onGlobalPointer(e) {
    const targetEl = eventTargetElement(e);

    // Если клик по триггеру — ничего не делаем (Bootstrap управит toggle)
    if (targetEl && (typeof targetEl.closest === 'function') && targetEl.closest(selector)) {
      return;
    }

    // Если клик внутри открытого popover — не закрываем
    for (const { popoverRoot } of popovers.values()) {
      if (popoverRoot && targetEl && popoverRoot.contains(targetEl)) return;
    }

    // Иначе — скрываем все popover'ы
    popovers.forEach(({ instance }) => {
      try { instance.hide(); } catch (err) { /* ignore */ }
    });
  }

  // Click в bubble-фазе (capture=false) — чтобы Bootstrap выполнил show/hide раньше нас
  document.addEventListener('click', onGlobalPointer, false);
  // Touchstart в capture — для мобильных
  document.addEventListener('touchstart', onGlobalPointer, { capture: true, passive: true });

  // MutationObserver: инициализация динамических элементов и отслеживание изменений
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
        if (t && t.matches && t.matches(selector) && isVisible(t)) createPopover(t);
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });

  // Старт
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVisible);
  } else {
    initVisible();
  }

  // Очистка при выгрузке страницы
  window.addEventListener('unload', () => {
    document.removeEventListener('click', onGlobalPointer, false);
    document.removeEventListener('touchstart', onGlobalPointer, true);
    mo.disconnect();
    popovers.forEach(({ instance }) => { try { instance.dispose(); } catch (e) {} });
    popovers.clear();
  });

  // Экспорт для отладки (опционально)
  window.__bootstrapPopovers = {
    createPopover,
    popoversMap: popovers
  };
})();

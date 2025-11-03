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

// Делегированная инициализация Bootstrap Popover для iOS/динамических контейнеров
(function () {
  if (!window.bootstrap || !bootstrap.Popover) {
    console.warn('[popover-delegate] bootstrap.Popover not found');
    return;
  }
  const defaultOptions = {
    container: 'body',
    trigger: 'manual',
    html: true,
    sanitize: false, // включи true и allowList, если контент не доверенный
    placement: 'auto',
    fallbackPlacements: ['top', 'bottom', 'right', 'left'],
    boundary: 'window',
  };
  function readDataOptions(el) {
    const ds = el.dataset || {};
    const o = {};
    if (ds.bsContainer) o.container = ds.bsContainer;
    if (ds.bsPlacement) o.placement = ds.bsPlacement;
    if (ds.bsBoundary) o.boundary = ds.bsBoundary;
    if (ds.bsHtml != null) o.html = ds.bsHtml === 'true';
    if (ds.bsSanitize != null) o.sanitize = ds.bsSanitize === 'true';
    if (ds.bsCustomClass) o.customClass = ds.bsCustomClass;
    return o;
  }
  function ensurePopover(el) {
    if (!el) return null;
    if (el.__bsPopover && typeof el.__bsPopover.show === 'function') return el.__bsPopover;
    try {
      const opts = Object.assign({}, defaultOptions, readDataOptions(el));
      el.__bsPopover = new bootstrap.Popover(el, opts);
      return el.__bsPopover;
    } catch (e) {
      console.warn('[popover-delegate] init failed', e, el);
      return null;
    }
  }
  const isShown = (el) => !!el.getAttribute('aria-describedby');
  const hideAllExcept = (exceptEl) => {
    document.querySelectorAll('[data-bs-toggle="popover"][aria-describedby]').forEach((t) => {
      if (exceptEl && t === exceptEl) return;
      if (t.__bsPopover) try { t.__bsPopover.hide(); } catch (e) {}
    });
  };
  const handler = function (ev) {
    const trigger = ev.target?.closest?.('[data-bs-toggle="popover"], [data-popover]');
    if (!trigger) { hideAllExcept(null); return; }
    try { ev.preventDefault(); } catch (e) {}
    try { ev.stopPropagation(); ev.stopImmediatePropagation?.(); } catch (e) {}
    const p = ensurePopover(trigger);
    if (!p) return;
    isShown(trigger) ? p.hide() : p.show();
    hideAllExcept(trigger);
  };
  document.addEventListener('click', handler, { capture: true });
  document.addEventListener('touchend', handler, { capture: true, passive: false });
  console.log('[popover-delegate] ready');
})();

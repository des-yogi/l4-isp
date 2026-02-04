(function () {
  const SELECTOR = '[data-bs-toggle="popover"]';

  function getTriggers() {
    return Array.from(document.querySelectorAll(SELECTOR));
  }

  function getInstance(el) {
    // не даём HTML-триггерам мешать
    try { el.removeAttribute('data-bs-trigger'); } catch (e) {}

    return bootstrap.Popover.getOrCreateInstance(el, {
      container: 'body',
      trigger: 'manual', // ВАЖНО: управляем сами
      popperConfig(defaultConfig) {
        return { ...defaultConfig, strategy: 'fixed' };
      }
    });
  }

  function hideAll(exceptEl = null) {
    for (const el of getTriggers()) {
      if (exceptEl && el === exceptEl) continue;
      const inst = bootstrap.Popover.getInstance(el);
      if (inst) {
        try { inst.hide(); } catch (e) {}
      }
    }
    // подчистка залипших DOM-узлов
    document.querySelectorAll('body > .popover').forEach(n => n.remove());
  }

  function isOpen(el) {
    const id = el.getAttribute('aria-describedby');
    return !!(id && document.getElementById(id));
  }

  // ОТКРЫТИЕ/ЗАКРЫТИЕ по тапу на триггер
  document.addEventListener('pointerdown', (e) => {
    const t = e.target && e.target.nodeType === 3 ? e.target.parentElement : e.target;
    if (!(t instanceof Element)) return;

    const trigger = t.closest(SELECTOR);
    if (!trigger) return;

    // чтобы не было “залипших” при быстром тапе/свайпе
    e.preventDefault();

    const inst = getInstance(trigger);

    // Закрыть остальные
    hideAll(trigger);

    // Toggle текущего
    if (isOpen(trigger)) {
      try { inst.hide(); } catch (e) {}
    } else {
      try { inst.show(); } catch (e) {}
    }
  }, true);

  // ТАП ВНЕ — закрыть всё
  document.addEventListener('pointerdown', (e) => {
    const t = e.target && e.target.nodeType === 3 ? e.target.parentElement : e.target;
    if (!(t instanceof Element)) return;

    // тап ��о триггеру обработан выше
    if (t.closest(SELECTOR)) return;

    // если хотите НЕ закрывать при тапе по самому поповеру — раскомментируйте:
    // if (t.closest('.popover')) return;

    hideAll();
  }, true);

  // Скролл/ресайз/уход вкладки
  window.addEventListener('scroll', () => hideAll(), true);
  window.addEventListener('resize', () => hideAll(), false);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hideAll(); });

  // Экспорт
  window.__hideAllPopovers = hideAll;
})();

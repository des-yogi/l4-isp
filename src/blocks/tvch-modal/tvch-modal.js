/*!
 tvch-search-scroll.js
 Поиск по .tvch-modal__card и прокрутка внутри .tvch-modal__body (search находится в header).
 Поддержка динамики: MutationObserver, modalEl.tvch.reindex(), modalEl.tvch.reindexFromJson(),
 и событие 'tvch:data-ready'. Подключать после bootstrap.bundle и после HTML.
*/

document.addEventListener('DOMContentLoaded', function () {
  const DEBOUNCE_MS = 120;
  const USER_SCROLL_BLOCK_MS = 350;
  const ROOT_BLOCK = '.tvch-modal';
  const CARD_SELECTOR = '.tvch-modal__card';
  const SCROLL_CONTAINER_SELECTOR = '.tvch-modal__body'; // modal-body скроллится (modal-dialog-scrollable)
  const CARDS_WRAPPER_SELECTOR = '.tvch-modal__cards-container';
  const SEARCH_INPUT_SELECTOR = '.tvch-modal__search-input';
  const CARD_NAME_SELECTOR = '.tvch-modal__card-name';

  function debounce(fn, wait) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const modals = Array.from(document.querySelectorAll(ROOT_BLOCK));
  if (!modals.length) return;

  modals.forEach(initModal);

  function initModal(modalEl) {
    const searchInput = modalEl.querySelector(SEARCH_INPUT_SELECTOR);
    const scrollContainer = modalEl.querySelector(SCROLL_CONTAINER_SELECTOR);
    const cardsWrapper = modalEl.querySelector(CARDS_WRAPPER_SELECTOR) || scrollContainer;

    if (!searchInput || !scrollContainer) return;

    let cards = [];
    let lastQuery = '';
    let lastMatchedEl = null;
    let userIsScrolling = false;
    let scrollTimer = null;
    let mo = null;

    // aria-live region (скрытый) — для скринридеров
    let liveRegion = modalEl.querySelector('.tvch-modal__live');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.className = 'tvch-modal__live';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      Object.assign(liveRegion.style, { position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' });
      modalEl.appendChild(liveRegion);
    }

    // --- Indexing ---
    function buildIndex() {
      const els = Array.from(modalEl.querySelectorAll(CARD_SELECTOR));
      cards = els.map(el => {
        const nameNode = el.querySelector(CARD_NAME_SELECTOR) || el;
        const raw = (el.dataset.name || nameNode.textContent || '').trim();
        return { el, nameNode, originalName: raw, nameLower: raw.toLowerCase() };
      });
      return cards.length;
    }

    function reindex() {
      const n = buildIndex();
      lastMatchedEl = null;
      lastQuery = '';
      liveRegion.textContent = '';
      return n;
    }

    // --- Highlighting ---
    function clearHighlights() {
      cards.forEach(({ el, nameNode, originalName }) => {
        el.classList.remove('tvch-modal__card--match');
        if (nameNode && nameNode.textContent !== undefined) nameNode.textContent = originalName;
      });
    }

    function highlightMatch(nameNode, query) {
      if (!query) return;
      const raw = nameNode.textContent || '';
      const qi = raw.toLowerCase().indexOf(query.toLowerCase());
      if (qi === -1) return;
      const before = raw.slice(0, qi);
      const match = raw.slice(qi, qi + query.length);
      const after = raw.slice(qi + query.length);
      nameNode.innerHTML = `${escapeHtml(before)}<mark>${escapeHtml(match)}</mark>${escapeHtml(after)}`;
    }

    // --- Scroll handling ---
    scrollContainer.addEventListener('scroll', () => {
      userIsScrolling = true;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => { userIsScrolling = false; }, USER_SCROLL_BLOCK_MS);
    }, { passive: true });

    const doSearch = debounce(() => {
      const q = (searchInput.value || '').trim();
      if (q === lastQuery) return;
      lastQuery = q;

      clearHighlights();
      lastMatchedEl = null;

      if (!q) {
        liveRegion.textContent = '';
        return;
      }

      const qLower = q.toLowerCase();
      const found = cards.find(c => c.nameLower.includes(qLower));

      if (!found) {
        liveRegion.textContent = 'Ничего не найдено';
        return;
      }

      found.el.classList.add('tvch-modal__card--match');
      highlightMatch(found.nameNode, q);
      lastMatchedEl = found.el;
      liveRegion.textContent = `Найдено: ${found.originalName}`;

      if (userIsScrolling) return;

      // Гарантированно проскроллить внутри modal-body:
      // Используем scrollIntoView; если не сработает корректно, делаем ручной расчет относительно scrollContainer.
      try {
        found.el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      } catch (err) {
        try {
          const parentRect = scrollContainer.getBoundingClientRect();
          const elRect = found.el.getBoundingClientRect();
          const offset = (elRect.top - parentRect.top) - (scrollContainer.clientHeight / 2) + (found.el.clientHeight / 2);
          scrollContainer.scrollTop += offset;
        } catch (_) { /* silent */ }
      }
    }, DEBOUNCE_MS);

    // input listeners
    searchInput.addEventListener('input', doSearch);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && lastMatchedEl) {
        lastMatchedEl.focus();
        lastMatchedEl.click();
      } else if (e.key === 'Escape') {
        searchInput.value = '';
        doSearch();
      }
    });

    // --- MutationObserver: авто-реиндексация при изменениях в wrapper ---
    function startObserver() {
      if (!cardsWrapper) return;
      if (mo) mo.disconnect();
      mo = new MutationObserver(debounce(() => { buildIndex(); }, 150));
      mo.observe(cardsWrapper, { childList: true, subtree: true });
    }

    // --- waitForCards: ждём карточки (если асинхронно рендерятся) ---
    function waitForCards(timeoutMs = 3000) {
      return new Promise(resolve => {
        const exist = modalEl.querySelectorAll(CARD_SELECTOR);
        if (exist && exist.length > 0) { buildIndex(); resolve(true); return; }

        let done = false;
        const onDataReady = () => { if (done) return; done = true; buildIndex(); cleanup(); resolve(true); };
        const timer = setTimeout(() => { if (done) return; done = true; buildIndex(); cleanup(); resolve(false); }, timeoutMs);
        function cleanup() { clearTimeout(timer); modalEl.removeEventListener('tvch:data-ready', onDataReady); }

        modalEl.addEventListener('tvch:data-ready', onDataReady);
        const tmp = new MutationObserver(() => {
          if (done) return;
          const now = modalEl.querySelectorAll(CARD_SELECTOR);
          if (now && now.length > 0) onDataReady();
        });
        tmp.observe(cardsWrapper, { childList: true, subtree: true });
      });
    }

    // Bootstrap hooks
    modalEl.addEventListener('shown.bs.modal', () => {
      startObserver();
      waitForCards(4000).then(found => {
        setTimeout(() => { try { searchInput.focus(); } catch (e) {} }, 30);
        if (found && searchInput && searchInput.value.trim()) doSearch();
      });
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
      clearHighlights();
      lastQuery = '';
      lastMatchedEl = null;
      liveRegion.textContent = '';
      if (mo) { mo.disconnect(); mo = null; }
    });

    // Public API
    modalEl.tvch = modalEl.tvch || {};
    modalEl.tvch.reindex = function () { return reindex(); };
    modalEl.tvch.reindexFromJson = function (jsonArray, renderFn) {
      if (typeof renderFn === 'function') {
        renderFn(jsonArray, cardsWrapper);
        const cnt = reindex();
        modalEl.dispatchEvent(new CustomEvent('tvch:data-ready', { detail: { count: cnt } }));
        return cnt;
      } else {
        modalEl.dispatchEvent(new CustomEvent('tvch:data-ready', { detail: { raw: jsonArray } }));
        return 'dispatched';
      }
    };

    // initial index
    buildIndex();
  } // initModal
});

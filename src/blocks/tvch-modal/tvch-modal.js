/*!
 tvch-filter-with-loader.js
 - Фильтрация карточек внутри .tvch-modal по подстроке (case-insensitive).
 - Анимация скрытия/появления карточек, подсветка <mark>, обновление счётчиков.
 - Авто-реиндексация через MutationObserver (ловит innerHTML/replaceChild).
 - Управление прелоадером: ищет .tvch-modal__loader в DOM и toggles класс .tvch-modal__loader--show
 - Устойчивая логика no-results: immediate при user-input, delayed для DOM/таймаутов.
 - Защита от циклических срабатываний observer <-> UI; минимизация DOM-мутаций при сортировке
 - При закрытии модалки очищается поле поиска и сбрасывается состояние.
*/
(function () {
  'use strict';

  // ============ SETTINGS ============
  const ROOT_BLOCK = '.tvch-modal';
  const SEARCH_INPUT_SELECTOR = '.tvch-modal__search-input';
  const CARD_SELECTOR = '.tvch-modal__card';
  const CARD_NAME_SELECTOR = '.tvch-modal__card-name';
  const SECTION_SELECTOR = '.tvch-modal__section';
  const SECTION_COUNT_SELECTOR = '.tvch-modal__count';
  const CARDS_WRAPPER_SELECTOR = '#cardsContainer, .tvch-modal__cards-container';
  const SCROLL_CONTAINER_SELECTOR = '.tvch-modal__body';
  const LOADER_SELECTOR = '.tvch-modal__loader';
  const LOADER_SHOW_CLASS = 'tvch-modal__loader--show';
  const NO_RESULTS_SHOW_CLASS = 'tvch-modal__no-results--show';

  const HIDE_ANIM_MS = 260;
  const DEBOUNCE_MS = 120;
  const SORT_ON_REINDEX = true;
  const LOADER_FALLBACK_MS = 8000;
  const NO_RESULTS_STABLE_MS = 260; // delay for DOM-driven no-results
  const USER_IMMEDIATE_MS = 800; // show immediate if user typed within this ms

  // ============ HELPERS ============
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

  // collapse/expand animations
  function collapse(el, ms) {
    if (!el || el._isHidden) return;
    el._isHidden = true;
    if (!el._origDisplay) el._origDisplay = getComputedStyle(el).display === 'none' ? 'block' : getComputedStyle(el).display;
    const style = el.style;
    style.boxSizing = 'border-box';
    const computed = getComputedStyle(el);
    const height = el.offsetHeight;
    const paddingTop = computed.paddingTop;
    const paddingBottom = computed.paddingBottom;
    const marginTop = computed.marginTop;
    const marginBottom = computed.marginBottom;
    style.height = height + 'px';
    style.paddingTop = paddingTop;
    style.paddingBottom = paddingBottom;
    style.marginTop = marginTop;
    style.marginBottom = marginBottom;
    style.opacity = '1';
    style.overflow = 'hidden';
    style.transition = `height ${ms}ms ease, padding ${ms}ms ease, margin ${ms}ms ease, opacity ${ms}ms ease`;
    requestAnimationFrame(() => {
      style.height = '0px';
      style.paddingTop = '0px';
      style.paddingBottom = '0px';
      style.marginTop = '0px';
      style.marginBottom = '0px';
      style.opacity = '0';
    });
    setTimeout(() => {
      style.display = 'none';
      style.removeProperty('height');
      style.removeProperty('padding-top');
      style.removeProperty('padding-bottom');
      style.removeProperty('margin-top');
      style.removeProperty('margin-bottom');
      style.removeProperty('opacity');
      style.removeProperty('overflow');
      style.removeProperty('transition');
    }, ms + 20);
  }
  function expand(el, ms) {
    if (!el || !el._isHidden) return;
    el._isHidden = false;
    const style = el.style;
    style.display = el._origDisplay || '';
    if (style.display === '' && getComputedStyle(el).display === 'none') {
      style.display = 'block';
    }
    style.boxSizing = 'border-box';
    style.overflow = 'hidden';
    style.height = '0px';
    style.paddingTop = '0px';
    style.paddingBottom = '0px';
    style.marginTop = '0px';
    style.marginBottom = '0px';
    style.opacity = '0';
    requestAnimationFrame(() => {
      style.removeProperty('height');
      style.removeProperty('padding-top');
      style.removeProperty('padding-bottom');
      style.removeProperty('margin-top');
      style.removeProperty('margin-bottom');
      style.removeProperty('opacity');
      const computed = getComputedStyle(el);
      const targetHeight = el.offsetHeight;
      const paddingTop = computed.paddingTop;
      const paddingBottom = computed.paddingBottom;
      const marginTop = computed.marginTop;
      const marginBottom = computed.marginBottom;
      style.height = '0px';
      style.paddingTop = '0px';
      style.paddingBottom = '0px';
      style.marginTop = '0px';
      style.marginBottom = '0px';
      style.opacity = '0';
      style.transition = `height ${ms}ms ease, padding ${ms}ms ease, margin ${ms}ms ease, opacity ${ms}ms ease`;
      requestAnimationFrame(() => {
        style.height = targetHeight + 'px';
        style.paddingTop = paddingTop;
        style.paddingBottom = paddingBottom;
        style.marginTop = marginTop;
        style.marginBottom = marginBottom;
        style.opacity = '1';
      });
      setTimeout(() => {
        style.removeProperty('height');
        style.removeProperty('padding-top');
        style.removeProperty('padding-bottom');
        style.removeProperty('margin-top');
        style.removeProperty('margin-bottom');
        style.removeProperty('opacity');
        style.removeProperty('overflow');
        style.removeProperty('transition');
      }, ms + 20);
    });
  }

  // ============ MAIN ============
  const modals = Array.from(document.querySelectorAll(ROOT_BLOCK));
  if (!modals.length) return;

  modals.forEach(modalEl => {
    let cardsWrapper = null;
    let sections = [];
    let moCards = null;
    let moParent = null;
    let loaderEl = modalEl.querySelector(LOADER_SELECTOR);
    let loaderFallbackTimer = null;
    let noResultsTimer = null;
    const noResultsEl = modalEl.querySelector('.tvch-modal__no-results');
    const searchInput = modalEl.querySelector(SEARCH_INPUT_SELECTOR);
    if (!searchInput) return;

    // state flags
    let suppressObserver = false;
    let lastUserInputTs = 0;

    const LOCALE = (navigator.languages && navigator.languages[0]) || navigator.language || 'uk';
    const collatorOpts = { sensitivity: 'base', numeric: true };

    // ============ Loader helpers ============
    function showLoader() {
      if (!loaderEl) return;
      loaderEl.classList.add(LOADER_SHOW_CLASS);
      loaderEl.setAttribute('aria-hidden', 'false');
      clearTimeout(loaderFallbackTimer);
      loaderFallbackTimer = setTimeout(() => {
        hideLoader();
        scheduleNoResults(true, { source: 'fallback' });
      }, LOADER_FALLBACK_MS);
    }
    function hideLoader() {
      if (!loaderEl) return;
      loaderEl.classList.remove(LOADER_SHOW_CLASS);
      loaderEl.setAttribute('aria-hidden', 'true');
      clearTimeout(loaderFallbackTimer);
      loaderFallbackTimer = null;
    }

    // ============ no-results control ============
    function toggleNoResultsImmediate(show) {
      if (!noResultsEl) return;
      const has = noResultsEl.classList.contains(NO_RESULTS_SHOW_CLASS);
      if (show && has) return;
      if (!show && !has) return;

      suppressObserver = true;
      try {
        if (show) {
          noResultsEl.classList.add(NO_RESULTS_SHOW_CLASS);
          noResultsEl.setAttribute('aria-hidden', 'false');
        } else {
          noResultsEl.classList.remove(NO_RESULTS_SHOW_CLASS);
          noResultsEl.setAttribute('aria-hidden', 'true');
        }
      } finally {
        setTimeout(() => { suppressObserver = false; }, Math.max(DEBOUNCE_MS, NO_RESULTS_STABLE_MS) + 80);
      }
    }

    function scheduleNoResults(show, meta = {}) {
      if (!noResultsEl) return;
      if (noResultsTimer) {
        clearTimeout(noResultsTimer);
        noResultsTimer = null;
      }
      const recentUser = (Date.now() - lastUserInputTs) < USER_IMMEDIATE_MS || (meta && meta.source === 'user');
      if (show) {
        if (recentUser) {
          toggleNoResultsImmediate(true);
          return;
        }
        if (noResultsEl.classList.contains(NO_RESULTS_SHOW_CLASS)) return;
        noResultsTimer = setTimeout(() => {
          toggleNoResultsImmediate(true);
          noResultsTimer = null;
        }, NO_RESULTS_STABLE_MS);
      } else {
        // hide immediately and cancel pending
        toggleNoResultsImmediate(false);
      }
    }

    // ============ Read cards and find wrapper ============
    function readCardsFromContainer(cardsEl) {
      const list = cardsEl.querySelectorAll(CARD_SELECTOR);
      return Array.from(list).map(cardEl => {
        const nameNode = cardEl.querySelector(CARD_NAME_SELECTOR) || cardEl;
        const raw = (cardEl.dataset.name || (nameNode.textContent || '')).trim();
        if (!cardEl._origName) cardEl._origName = raw;
        if (!cardEl._origDisplay) cardEl._origDisplay = getComputedStyle(cardEl).display === 'none' ? 'block' : getComputedStyle(cardEl).display;
        return {
          el: cardEl,
          nameNode,
          originalName: raw,
          nameLower: raw.toLowerCase()
        };
      });
    }
    function findCardsWrapper() {
      return modalEl.querySelector(CARDS_WRAPPER_SELECTOR) || modalEl.querySelector(SCROLL_CONTAINER_SELECTOR) || modalEl;
    }

    // ============ buildIndex (with safe reattach) ============
    function buildIndex() {
      sections.length = 0;
      cardsWrapper = findCardsWrapper();
      const sectionEls = Array.from(cardsWrapper.querySelectorAll(SECTION_SELECTOR));

      // helper: minimal-reorder attach using DocumentFragment and suppression
      function sortAndAttach(container, arr) {
        if (!SORT_ON_REINDEX) return;
        // quick check: if current order equals desired, skip heavy DOM ops
        let needsReorder = false;
        for (let i = 0; i < arr.length; i++) {
          if (container.children[i] !== arr[i].el) {
            needsReorder = true;
            break;
          }
        }
        if (!needsReorder) return;

        // perform one-fragment reattach under suppression
        suppressObserver = true;
        try {
          const frag = document.createDocumentFragment();
          arr.forEach(c => frag.appendChild(c.el));
          container.appendChild(frag);
        } finally {
          setTimeout(() => { suppressObserver = false; }, Math.max(DEBOUNCE_MS, 180));
        }
      }

      if (sectionEls.length === 0) {
        const directCardsContainer = cardsWrapper.querySelector('.tvch-modal__cards') || cardsWrapper;
        const arr = readCardsFromContainer(directCardsContainer);
        if (SORT_ON_REINDEX) {
          arr.sort((a, b) => a.originalName.localeCompare(b.originalName, LOCALE, collatorOpts));
          sortAndAttach(directCardsContainer, arr);
        }
        sections.push({
          el: null,
          cardsEl: directCardsContainer,
          cards: arr,
          countNode: null,
          _origCount: arr.length
        });
      } else {
        sectionEls.forEach(sec => {
          const cardsListContainer = sec.querySelector('.tvch-modal__cards') || sec;
          const arr = readCardsFromContainer(cardsListContainer);
          if (SORT_ON_REINDEX) {
            arr.sort((a, b) => a.originalName.localeCompare(b.originalName, LOCALE, collatorOpts));
            sortAndAttach(cardsListContainer, arr);
          }
          const countNode = sec.querySelector(SECTION_COUNT_SELECTOR);
          sections.push({
            el: sec,
            cardsEl: cardsListContainer,
            cards: arr,
            countNode,
            _origCount: arr.length
          });
        });
      }

      // If we have found cards, hide loader and ensure no-results hidden
      const totalCards = sections.reduce((s, sec) => s + sec.cards.length, 0);
      if (totalCards > 0) {
        hideLoader();
        scheduleNoResults(false);
      }
    }

    // ============ highlighting / restore ============
    function highlightName(nameNode, query) {
      if (!nameNode) return;
      const raw = nameNode.textContent || '';
      const qi = raw.toLowerCase().indexOf(query.toLowerCase());
      if (qi === -1) return;
      const before = raw.slice(0, qi);
      const match = raw.slice(qi, qi + query.length);
      const after = raw.slice(qi + query.length);
      nameNode.innerHTML = `${escapeHtml(before)}<mark>${escapeHtml(match)}</mark>${escapeHtml(after)}`;
    }
    function restoreName(nameNode, original) {
      if (!nameNode) return;
      nameNode.textContent = original;
    }

    function updateSectionCounts() {
      sections.forEach(sec => {
        const visibleCount = sec.cards.filter(c => !c.el._isHidden).length;
        if (sec.countNode) sec.countNode.textContent = `(${visibleCount})`;
        if (sec.el) {
          if (visibleCount === 0) {
            if (!sec.el._isHidden) collapse(sec.el, HIDE_ANIM_MS);
          } else {
            if (sec.el._isHidden) expand(sec.el, HIDE_ANIM_MS);
          }
        }
      });
    }

    // ============ filter logic ============
    function performFilter() {
      const q = (searchInput.value || '').trim();
      if (!q) {
        sections.forEach(sec => {
          sec.cards.forEach(c => {
            restoreName(c.nameNode, c.originalName);
            if (c.el._isHidden) expand(c.el, HIDE_ANIM_MS);
            c.el.removeAttribute('aria-hidden');
            c.el.tabIndex = 0;
          });
          if (!sec._origCount) sec._origCount = sec.cards.length;
          if (sec.countNode) sec.countNode.textContent = `(${sec._origCount})`;
          if (sec.el && sec.el._isHidden) expand(sec.el, HIDE_ANIM_MS);
        });
        scheduleNoResults(false);
        return;
      }

      const qLower = q.toLowerCase();
      let totalVisible = 0;
      sections.forEach(sec => {
        sec.cards.forEach(c => {
          const matches = c.nameLower.includes(qLower);
          if (matches) {
            restoreName(c.nameNode, c.originalName);
            highlightName(c.nameNode, q);
            if (c.el._isHidden) expand(c.el, HIDE_ANIM_MS);
            c.el.removeAttribute('aria-hidden');
            c.el.tabIndex = 0;
            totalVisible++;
          } else {
            if (!c.el._isHidden) collapse(c.el, HIDE_ANIM_MS);
            c.el.setAttribute('aria-hidden', 'true');
            c.el.tabIndex = -1;
          }
        });
      });

      updateSectionCounts();

      if (noResultsEl) {
        if (totalVisible === 0) {
          const recent = (Date.now() - lastUserInputTs) < USER_IMMEDIATE_MS;
          if (recent) {
            toggleNoResultsImmediate(true);
            try {
              const scrollContainer = modalEl.querySelector(SCROLL_CONTAINER_SELECTOR);
              if (scrollContainer) scrollContainer.scrollTop = 0;
            } catch (e) {}
          } else {
            scheduleNoResults(true);
          }
        } else {
          scheduleNoResults(false);
        }
      }
    }
    const doFilter = debounce(performFilter, DEBOUNCE_MS);

    // ============ MutationObservers ============
    function startObservers() {
      stopObservers();
      try {
        moCards = new MutationObserver(debounce((mutations) => {
          if (suppressObserver) return;
          // ignore mutations that only touch the loader/no-results subtree
          const purelyUi = mutations.every(m => {
            if (m.type === 'childList') {
              const nodes = Array.from(m.addedNodes).concat(Array.from(m.removedNodes));
              if (nodes.length === 0) return false;
              return nodes.every(n =>
                (noResultsEl && (n === noResultsEl || noResultsEl.contains(n))) ||
                (loaderEl && (n === loaderEl || loaderEl.contains(n)))
              );
            }
            return false;
          });
          if (purelyUi) return;

          buildIndex();
          sections.forEach(sec => { sec._origCount = sec.cards.length; });
          doFilter();
        }, 150));

        moParent = new MutationObserver(debounce((mutations) => {
          if (suppressObserver) return;
          const stillHasWrapper = modalEl.contains(cardsWrapper);
          if (!stillHasWrapper) {
            cardsWrapper = findCardsWrapper();
            buildIndex();
            sections.forEach(sec => { sec._origCount = sec.cards.length; });
            stopObservers();
            setTimeout(startObservers, 30);
            setTimeout(() => doFilter(), 40);
          }
        }, 160));
      } catch (e) {
        moCards = null;
        moParent = null;
      }

      if (moCards && cardsWrapper) {
        try { moCards.observe(cardsWrapper, { childList: true, subtree: true }); } catch (e) {}
      }
      if (moParent) {
        try { moParent.observe(modalEl, { childList: true, subtree: true }); } catch (e) {}
      }
    }
    function stopObservers() {
      try { if (moCards) { moCards.disconnect(); moCards = null; } } catch (e) {}
      try { if (moParent) { moParent.disconnect(); moParent = null; } } catch (e) {}
    }

    // ============ Init & events ============
    buildIndex();
    sections.forEach(sec => { sec._origCount = sec.cards.length; });

    startObservers();

    if (loaderEl) {
      loaderEl.setAttribute('aria-hidden', 'true');
      loaderEl.classList.remove(LOADER_SHOW_CLASS);
    }
    scheduleNoResults(false);

    // input wiring: record last user input time, then run debounced filter
    searchInput.addEventListener('input', (e) => {
      lastUserInputTs = Date.now();
      doFilter();
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        lastUserInputTs = Date.now();
        doFilter();
      }
    });

    // show/hide modal events
    modalEl.addEventListener('shown.bs.modal', () => {
      buildIndex();
      sections.forEach(sec => { sec._origCount = sec.cards.length; });
      startObservers();
      const totalCardsNow = sections.reduce((s, sec) => s + sec.cards.length, 0);
      if (totalCardsNow === 0) {
        showLoader();
      } else {
        hideLoader();
      }
      setTimeout(() => { try { searchInput.focus(); } catch (e) {} }, 30);
      setTimeout(() => doFilter(), 60);
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
      stopObservers();
      hideLoader();
      if (noResultsTimer) { clearTimeout(noResultsTimer); noResultsTimer = null; }
      // clear search field so reopened modal starts clean
      try { searchInput.value = ''; } catch (e) {}
      // reset last user input timestamp (prevents immediate no-results)
      lastUserInputTs = 0;
      // run immediate filter to restore full list & hide no-results
      try { performFilter(); } catch (e) {}
    });

    // Public API
    modalEl.tvch = modalEl.tvch || {};
    modalEl.tvch.reindex = function () {
      buildIndex();
      sections.forEach(sec => { sec._origCount = sec.cards.length; });
      scheduleNoResults(false);
      return sections.reduce((sum, s) => sum + s.cards.length, 0);
    };
    modalEl.tvch.showLoader = showLoader;
    modalEl.tvch.hideLoader = hideLoader;

    // ensure no-results hidden initially
    scheduleNoResults(false);
  });

})();

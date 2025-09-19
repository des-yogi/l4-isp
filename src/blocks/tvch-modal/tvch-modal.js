/*!
 tvch-filter.js (trimmed: no built-in "no-results" markup)
 Фильтрация карточек внутри .tvch-modal по подстроке (case-insensitive).
 - Скрывает несоответствующие карточки с анимацией "сжатия"
 - Подсвечивает совпадающую подстроку в .tvch-modal__card-name через <mark>
 - Обновляет счётчик в заголовке секции (.tvch-modal__count)
 - Показывает/скрывает внешний блок "ничего не найдено" .tvch-modal__no-results
 - Не создает никаких DOM-элементов для "no-results" — ожидает, что вы добавите и стилизуете его в шаблоне
*/
(function () {

  // Настройки
  const ROOT_BLOCK = '.tvch-modal';
  const SEARCH_INPUT_SELECTOR = '.tvch-modal__search-input';
  const CARD_SELECTOR = '.tvch-modal__card';
  const CARD_NAME_SELECTOR = '.tvch-modal__card-name';
  const SECTION_SELECTOR = '.tvch-modal__section';
  const SECTION_COUNT_SELECTOR = '.tvch-modal__count';
  const CARDS_WRAPPER_SELECTOR = '.tvch-modal__cards-container';
  const SCROLL_CONTAINER_SELECTOR = '.tvch-modal__body';
  const HIDE_ANIM_MS = 260; // длительность анимации скрытия/появления (ms)
  const DEBOUNCE_MS = 120;

  // Helpers
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

  // Collapse / expand animation for arbitrary element
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

  // MAIN
  const modals = Array.from(document.querySelectorAll(ROOT_BLOCK));
  if (!modals.length) return;

  modals.forEach(modalEl => {
    const searchInput = modalEl.querySelector(SEARCH_INPUT_SELECTOR);
    const cardsWrapper = modalEl.querySelector(CARDS_WRAPPER_SELECTOR) || modalEl.querySelector(SCROLL_CONTAINER_SELECTOR) || modalEl;
    if (!searchInput || !cardsWrapper) return;

    // find user-provided no-results block (do not create it)
    const noResultsEl = modalEl.querySelector('.tvch-modal__no-results');

    // Build index of cards grouped by section
    const sections = []; // { el: sectionEl, cardsEl: ul, cards: [cardObj], countNode }
    function buildIndex() {
      sections.length = 0;
      const sectionEls = Array.from(cardsWrapper.querySelectorAll(SECTION_SELECTOR));
      sectionEls.forEach(sec => {
        const cardsList = sec.querySelectorAll('.tvch-modal__cards > .tvch-modal__card, .tvch-modal__cards li.tvch-modal__card, .tvch-modal__cards .tvch-modal__card');
        const arr = Array.from(cardsList).map(cardEl => {
          const nameNode = cardEl.querySelector(CARD_NAME_SELECTOR) || cardEl;
          const raw = (cardEl.dataset.name || (nameNode.textContent || '')).trim();
          if (!cardEl._origName) cardEl._origName = raw;
          if (!cardEl._origDisplay) cardEl._origDisplay = getComputedStyle(cardEl).display === 'none' ? 'block' : getComputedStyle(cardEl).display;
          return {
            el: cardEl,
            nameNode: nameNode,
            originalName: raw,
            nameLower: raw.toLowerCase()
          };
        });
        const countNode = sec.querySelector(SECTION_COUNT_SELECTOR);
        sections.push({
          el: sec,
          cardsEl: sec.querySelector('.tvch-modal__cards'),
          cards: arr,
          countNode
        });
      });
    }

    buildIndex();

    // Apply highlight for a card's nameNode
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
        const visible = sec.cards.filter(c => !c.el._isHidden).length;
        if (sec.countNode) {
          sec.countNode.textContent = `(${visible})`;
        }
        if (visible === 0) {
          if (!sec.el._isHidden) collapse(sec.el, HIDE_ANIM_MS);
        } else {
          if (sec.el._isHidden) expand(sec.el, HIDE_ANIM_MS);
        }
      });
    }

    // Perform filtering (main)
    const doFilter = debounce(() => {
      const q = (searchInput.value || '').trim();
      if (!q) {
        sections.forEach(sec => {
          sec.cards.forEach(c => {
            restoreName(c.nameNode, c.originalName);
            if (c.el._isHidden) expand(c.el, HIDE_ANIM_MS);
            c.el.removeAttribute('aria-hidden');
            c.el.tabIndex = 0;
          });
        });
        sections.forEach(sec => {
          if (!sec._origCount) sec._origCount = sec.cards.length;
          if (sec.countNode) sec.countNode.textContent = `(${sec._origCount})`;
          if (sec.el._isHidden) expand(sec.el, HIDE_ANIM_MS);
        });
        // hide user-provided no-results (if present) by removing show-class
        if (noResultsEl) noResultsEl.classList.remove('tvch-modal__no-results--show');
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

      // toggle user-provided no-results element (toggle a class; you style it)
      if (noResultsEl) {
        if (totalVisible === 0) {
          noResultsEl.classList.add('tvch-modal__no-results--show');
          // optional: scroll modal-body to top so the no-results block is visible
          try {
            const scrollContainer = modalEl.querySelector(SCROLL_CONTAINER_SELECTOR);
            if (scrollContainer) scrollContainer.scrollTop = 0;
          } catch (e) { /* silent */ }
        } else {
          noResultsEl.classList.remove('tvch-modal__no-results--show');
        }
      }
    }, DEBOUNCE_MS);

    // Listen input
    searchInput.addEventListener('input', doFilter);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        doFilter();
      }
    });

    // Public API: reindex (in case server regenerates DOM)
    modalEl.tvch = modalEl.tvch || {};
    modalEl.tvch.reindex = function () {
      buildIndex();
      sections.forEach(sec => { sec._origCount = sec.cards.length; });
      // ensure user-provided no-results is hidden after reindex
      if (noResultsEl) noResultsEl.classList.remove('tvch-modal__no-results--show');
      return sections.reduce((sum, s) => sum + s.cards.length, 0);
    };

    // store original counts
    sections.forEach(sec => { sec._origCount = sec.cards.length; });

    // ensure user-provided no-results is hidden initially
    if (noResultsEl) noResultsEl.classList.remove('tvch-modal__no-results--show');

  }); // end modals.forEach

})();

// Инициализация карточек тарифов + логика IPTV + логика белого IP (optional)
function initTariffCards() {
  const cardsAll = document.querySelectorAll('.tariff-card');
  if (!cardsAll.length) { return; }

  for (let i = 0; i < cardsAll.length; i++) {
    const card = cardsAll[i];

    // Не трогаем уже инициализированные карточки
    if (card.dataset.initialized === 'true') continue;

    // === 1. Фиксируем базовую цену (basePrice) при инициализации ===
    if (!card.dataset.basePrice) {
      const priceEl = card.querySelector('.tariff-card__opt-item--price strong, .tariff-card__price strong, [data-role="price"]');
      if (priceEl) {
        const num = parseInt(priceEl.textContent.trim().replace(/\D+/g, ''));
        if (!Number.isNaN(num)) card.dataset.basePrice = String(num);
      }
    }

    // === 2. Переменные элементов карточки (существующая логика) ===
    const moreBtn = card.querySelector('.tariff-card__more-btn');
    const returnBtn = card.querySelector('.tariff-card__back-btn');
    const flipElem = card.querySelector('.tariff-card__inner');
    const addIptv = card.querySelector('.tariff-card__iptv-btn');
    const chanSelect = card.querySelector('.tariff-card__form-wrapper');
    const closeChanSelectBtn = card.querySelector('.faq-btn--close, .tariff-card__iptv-close, [data-role="iptv-remove"]');

    const moreBtnClickpriceHandler = () => {
      if (flipElem) flipElem.classList.toggle('tariff-card__inner--backfaced');
    };

    const setBtnText = (span) => {
      if (!span) return;
      const lang = (typeof getCurrentLang === 'function') ? getCurrentLang() : 'uk';
      const text = { uk: 'Oберіть пакет IPTV', en: 'Select an IPTV package', ru: 'Выберите пакет IPTV' };
      span.textContent = text[lang] || text['uk'];
    };

    // === 3. Общая функция пересчёта цены с учётом IPTV + белого IP ===
    function updateTariffPrice(cardInstance) {
      if (!cardInstance) return;

      const priceElement = cardInstance.querySelector('.tariff-card__opt-item--price strong, .tariff-card__price strong, [data-role="price"]');
      if (!priceElement) return;

      const base = parseInt(cardInstance.dataset.basePrice) || 0;
      const tvAdd = parseInt(cardInstance.dataset.currentTvPrice) || 0;
      const ipAdd = parseInt(cardInstance.dataset.ipPrice) || 0;

      const total = base + tvAdd + ipAdd;
      if (total > 0) {
        priceElement.textContent = `${total} грн`;
      }
    }

    // === 4. Логика IPTV (существующая) ===
    const addIptvHandler = () => {
      if (!addIptv || !chanSelect) return;
      addIptv.style.display = 'none';
      chanSelect.style.display = 'flex';

      // сохраняем базовую цену (если ещё не сохранена)
      if (!card.dataset.basePrice) {
        const priceElement = card.querySelector('.tariff-card__opt-item--price strong, .tariff-card__price strong, [data-role="price"]');
        if (priceElement) {
          const currentPrice = priceElement.textContent.trim().replace(/\D+/g, '');
          if (currentPrice) card.dataset.basePrice = currentPrice;
        }
      }

      // Помечаем, что модалка открыта для этой карточки
      card.dataset.modalOpened = 'true';

      // Кликаем по кнопке выбора пакета (она теперь видима)
      const selectBtn = chanSelect.querySelector('.tariff-card__sel-btn');
      if (selectBtn) { try { selectBtn.click(); } catch (e) {} }

      // Чтобы избежать дублей
      try { addIptv.removeEventListener('click', addIptvHandler); } catch (e) {}
    };

    const removeIptvHandler = () => {
      if (!addIptv || !chanSelect) return;
      addIptv.style.display = 'flex';
      chanSelect.style.display = 'none';
      setBtnText(chanSelect.querySelector('.tariff-card__sel-btn>span'));

      // Прямо здесь отправим сброс IPTV (делегированный слушатель подхватит)
      try { card.dispatchEvent(new CustomEvent('iptv-reset', { bubbles: true })); } catch (e) {}

      // Возвращаем обработчик клика безопасно
      try { addIptv.removeEventListener('click', addIptvHandler); } catch (e) {}
      addIptv.addEventListener('click', addIptvHandler);
    };

    // Слушаем событие восстановления UI IPTV
    card.addEventListener('iptv-ui-reset', () => {
      if (!addIptv || !chanSelect) return;
      addIptv.style.display = 'flex';
      chanSelect.style.display = 'none';
      setBtnText(chanSelect.querySelector('.tariff-card__sel-btn>span'));

      try {
        addIptv.removeEventListener('click', addIptvHandler);
      } catch (e) {}
      addIptv.addEventListener('click', addIptvHandler);
    });

    // === 5. Логика белого IP (только для data-ip-mode="optional") ===
    function initIpOption(cardInstance) {
      if (!cardInstance) return;

      const mode = (cardInstance.dataset.ipMode || '').toLowerCase();
      // Если режима нет или он "off"/"on" — ничего не делаем (по ТЗ обрабатываем только optional)
      if (mode !== 'optional') return;

      const ipCheckbox = cardInstance.querySelector('input.field-toggler__input[data-ip-cost]');
      if (!ipCheckbox) return;

      // Стоимость IP из data-ip-cost (по умолчанию 0)
      const ipCost = parseInt(ipCheckbox.dataset.ipCost, 10) || 0;

      // Инициализируем dataset для IP (по умолчанию IP выключен)
      if (!cardInstance.dataset.ipPrice) cardInstance.dataset.ipPrice = '0';
      if (!cardInstance.dataset.ipSelected) cardInstance.dataset.ipSelected = 'no';

      // При первом рендере, если чекбокс вдруг уже отмечен — синхронизируем состояние
      if (ipCheckbox.checked) {
        cardInstance.dataset.ipPrice = String(ipCost);
        cardInstance.dataset.ipSelected = 'yes';
      } else {
        cardInstance.dataset.ipPrice = '0';
        cardInstance.dataset.ipSelected = 'no';
      }

      // Пересчёт цены с учётом IP (на случай, если basePrice уже есть)
      updateTariffPrice(cardInstance);

      ipCheckbox.addEventListener('change', () => {
        if (ipCheckbox.checked) {
          cardInstance.dataset.ipPrice = String(ipCost);
          cardInstance.dataset.ipSelected = 'yes';
        } else {
          cardInstance.dataset.ipPrice = '0';
          cardInstance.dataset.ipSelected = 'no';
        }

        // IPTV и basePrice уже сидят в dataset,
        // поэтому просто пересчитываем итоговую цену
        updateTariffPrice(cardInstance);
      });
    }

    // === 6. Привязка обработчиков кнопок карточки ===
    if (moreBtn && returnBtn) {
      moreBtn.addEventListener('click', moreBtnClickpriceHandler);
      returnBtn.addEventListener('click', moreBtnClickpriceHandler);
    }

    if (addIptv) addIptv.addEventListener('click', addIptvHandler);
    if (closeChanSelectBtn) closeChanSelectBtn.addEventListener('click', removeIptvHandler);

    // Инициализация опции белого IP (не ломает карточки без data-ip-mode)
    try { initIpOption(card); } catch (e) { console.warn('initIpOption error', e); }

    // Помечаем карточку как инициализированную
    card.dataset.initialized = 'true';
  }

  // применяем текущую тему (если есть глобальная функция)
  if (window.applyCurrentTheme) {
    try { window.applyCurrentTheme(); } catch (e) { console.warn('applyCurrentTheme error', e); }
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initTariffCards);
// Экспорт в глобальную область
window.initTariffCards = initTariffCards;
window.reinitTariffCards = initTariffCards;

/*function initTariffCards() {
  const cardsAll = document.querySelectorAll('.tariff-card');
  if (!cardsAll.length) { return; }

  for (let i = 0; i < cardsAll.length; i++) {
    const card = cardsAll[i];

    // Проверяем, не инициализирована ли уже эта карточка
    if (card.dataset.initialized === 'true') {
      continue; // Пропускаем уже инициализированные
    }

    const moreBtn = card.querySelector('.tariff-card__more-btn');
    const returnBtn = card.querySelector('.tariff-card__back-btn');
    const flipElem = card.querySelector('.tariff-card__inner');
    const addIptv = card.querySelector('.tariff-card__iptv-btn');
    const chanSelect = card.querySelector('.tariff-card__form-wrapper');
    const closeChanSelectBtn = card.querySelector('.faq-btn--close');

    const moreBtnClickpriceHandler = () => {
      flipElem.classList.toggle('tariff-card__inner--backfaced');
    };

    const setBtnText = (button) => {
      const lang = getCurrentLang();
      const text = {
        uk: 'Oберить пакет IPTV',
        en: 'Select an IPTV package',
        ru: 'Выберите пакет IPTV',
      };
      button.textContent = text[lang] || text['uk'];
    }

    const addIptvHandler = () => {
      addIptv.style.display = 'none';
      chanSelect.style.display = 'flex';

      // Сохраняем базовую цену
      if (!card.dataset.basePrice) {
        const priceElement = card.querySelector('.tariff-card__opt-item--price strong');
        if (priceElement) {
          const currentPrice = priceElement.textContent.trim().replace(/\D+/g, '');
          card.dataset.basePrice = currentPrice;
        }
      }

      // Помечаем, что модалка открыта для этой карточки
      card.dataset.modalOpened = 'true';

      // Кликаем по кнопке (она теперь видима)
      const selectBtn = chanSelect.querySelector('.tariff-card__sel-btn');
      if (selectBtn) {
        selectBtn.click();
      }

      addIptv.removeEventListener('click', addIptvHandler);
    }

    const removeIptvHandler = () => {
      addIptv.style.display = 'flex';
      chanSelect.style.display = 'none';
      setBtnText(chanSelect.querySelector('.tariff-card__sel-btn>span'));
      addIptv.addEventListener('click', addIptvHandler);

      // ОТПРАВЛЯЕМ СОБЫТИЕ для сброса цены и данных
      card.dispatchEvent(new CustomEvent('iptv-reset'));
    }

    // Слушаем событие восстановления UI
    card.addEventListener('iptv-ui-reset', () => {
      addIptv.style.display = 'flex';
      chanSelect.style.display = 'none';
      setBtnText(chanSelect.querySelector('.tariff-card__sel-btn>span'));

      // Возвращаем обработчик клика
      addIptv.removeEventListener('click', addIptvHandler);
      addIptv.addEventListener('click', addIptvHandler);
    });

    if (moreBtn && returnBtn) {
      moreBtn.addEventListener('click', moreBtnClickpriceHandler);
      returnBtn.addEventListener('click', moreBtnClickpriceHandler);
    }

    if (addIptv) {
      addIptv.addEventListener('click', addIptvHandler);
    }

    if (closeChanSelectBtn) {
      closeChanSelectBtn.addEventListener('click', removeIptvHandler);
    }

    // ✅ ПОМЕЧАЕМ КАРТОЧКУ КАК ИНИЦИАЛИЗИРОВАННУЮ
    card.dataset.initialized = 'true';
    //console.log('✅ Карточка инициализирована:', card);
  }

  // ✅ ПРИМЕНЯЕМ ТЕКУЩУЮ ТЕМУ К НОВЫМ КАРТОЧКАМ
  if (window.applyCurrentTheme) {
    window.applyCurrentTheme();
  } else {
    console.warn('⚠️ Функция applyCurrentTheme не найдена');
  }
}

// ✅ Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initTariffCards);

// ✅ ЭКСПОРТИРУЕМ ФУНКЦИЮ в window для вызова извне
window.initTariffCards = initTariffCards;

//console.log('📦 Функция initTariffCards доступна глобально');
*/

function initTariffCards() {
  const cardsAll = document.querySelectorAll('.tariff-card');
  if (!cardsAll.length) { return; }

  for (let i = 0; i < cardsAll.length; i++) {
    const card = cardsAll[i];

    if (card.dataset.initialized === 'true') continue;

    // Зафиксируем basePrice при инициализации
    if (!card.dataset.basePrice) {
      const priceEl = card.querySelector('.tariff-card__opt-item--price strong, .tariff-card__price strong, [data-role="price"]');
      if (priceEl) {
        const num = parseInt(priceEl.textContent.trim().replace(/\D+/g, ''));
        if (!Number.isNaN(num)) card.dataset.basePrice = String(num);
      }
    }

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

    const addIptvHandler = () => {
      if (!addIptv || !chanSelect) return;
      addIptv.style.display = 'none';
      chanSelect.style.display = 'flex';

      // сохраняем базовую цену
      if (!card.dataset.basePrice) {
        const priceElement = card.querySelector('.tariff-card__opt-item--price strong, .tariff-card__price strong, [data-role="price"]');
        if (priceElement) {
          const currentPrice = priceElement.textContent.trim().replace(/\D+/g, '');
          if (currentPrice) card.dataset.basePrice = currentPrice;
        }
      }

      // Помечаем, что модалка открыта для этой карточки
      card.dataset.modalOpened = 'true';

      // Кликаем по кнопке (она теперь видима)
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

      // Прямо здесь отправим сброс с всплытием (делегированный слушатель подхватит)
      try { card.dispatchEvent(new CustomEvent('iptv-reset', { bubbles: true })); } catch (e) {}

      // Возвращаем обработчик клика безопасно
      try { addIptv.removeEventListener('click', addIptvHandler); } catch (e) {}
      addIptv.addEventListener('click', addIptvHandler);
    };

    // Слушаем событие восстановления UI
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

    if (moreBtn && returnBtn) {
      moreBtn.addEventListener('click', moreBtnClickpriceHandler);
      returnBtn.addEventListener('click', moreBtnClickpriceHandler);
    }

    if (addIptv) addIptv.addEventListener('click', addIptvHandler);
    if (closeChanSelectBtn) closeChanSelectBtn.addEventListener('click', removeIptvHandler);

    card.dataset.initialized = 'true';
  }

  // применяем текущую тему
  if (window.applyCurrentTheme) {
    try { window.applyCurrentTheme(); } catch (e) { console.warn('applyCurrentTheme error', e); }
  }
}

document.addEventListener('DOMContentLoaded', initTariffCards);
window.initTariffCards = initTariffCards;
window.reinitTariffCards = initTariffCards;

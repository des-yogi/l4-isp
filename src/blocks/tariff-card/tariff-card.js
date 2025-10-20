function initTariffCards() {
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

(function(){
  const cardsAll = document.querySelectorAll('.tariff-card');
  if (!cardsAll) { return; }

  for (let i = 0; i < cardsAll.length; i++) {
    const card = cardsAll[i];
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
      addIptv.removeEventListener('click', addIptvHandler);
    }

    const removeIptvHandler = () => {
      addIptv.style.display = 'flex';
      chanSelect.style.display = 'none';
      setBtnText(chanSelect.querySelector('.tariff-card__sel-btn>span'));
      addIptv.addEventListener('click', addIptvHandler);

      // ✅ ОТПРАВЛЯЕМ СОБЫТИЕ для сброса цены и данных
      console.log('🔄 Отправка события iptv-reset для карточки:', card);
      card.dispatchEvent(new CustomEvent('iptv-reset'));
    }

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
  }
}());

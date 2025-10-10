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

    const addIptvHandler = () => {
      addIptv.style.display = 'none';
      chanSelect.style.display = 'flex';
      addIptv.removeEventListener('click', addIptvHandler);
    }

    const removeIptvHandler = () => {
      addIptv.style.display = 'flex';
      chanSelect.style.display = 'none';
      addIptv.addEventListener('click', addIptvHandler);
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

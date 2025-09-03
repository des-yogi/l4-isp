(function(){
  const tvTariffAll = document.querySelectorAll('.tv-card');
  if (!tvTariffAll) { return; }

  for (let i = 0; i < tvTariffAll.length; i++) {
    const card = tvTariffAll[i];
    const moreBtn = card.querySelector('.tv-card__more-btn');
    const returnBtn = card.querySelector('.tv-card__back-btn');
    const flipElem = card.querySelector('.tv-card__inner');

    const moreBtnClickHandler = function (e) {
      flipElem.classList.toggle('tv-card__inner--backfaced');
    };

    if (moreBtn && returnBtn) {
      moreBtn.addEventListener('click', moreBtnClickHandler);
      returnBtn.addEventListener('click', moreBtnClickHandler);
    }
  }
}());

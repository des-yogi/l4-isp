(function(){
  const prodAll = document.querySelectorAll('.product-card');
  if (!prodAll) { return; }

  for (let i = 0; i < prodAll.length; i++) {
    const card = prodAll[i];
    const moreBtn = card.querySelector('.product-card__more-btn');
    const returnBtn = card.querySelector('.product-card__back-btn');
    const flipElem = card.querySelector('.product-card__inner');

    const moreBtnClickHandler = function (e) {
      flipElem.classList.toggle('product-card__inner--backfaced');
    };

    if (moreBtn && returnBtn) {
      moreBtn.addEventListener('click', moreBtnClickHandler);
      returnBtn.addEventListener('click', moreBtnClickHandler);
    }
  }
}());

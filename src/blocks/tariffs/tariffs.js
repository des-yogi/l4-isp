let tariffsSwiper = null; // Глобальная переменная
(function() {
  tariffsSwiper = new Swiper('.tariffs__slider-content', {
    speed: 400,
    spaceBetween: 0,
    slidesPerView: 'auto',
    navigation: {
      nextEl: '.tariffs__btn-next',
      prevEl: '.tariffs__btn-prev',
    },
    pagination: {
      el: '.tariffs__pagination',
      type: 'fraction',
    }
  });

  const close = () => window.__hideAllPopovers?.();

  tariffsSwiper.on('touchStart', close);
  tariffsSwiper.on('sliderMove', close);
  tariffsSwiper.on('touchMove', close);
  tariffsSwiper.on('slideChangeTransitionStart', close);
})();

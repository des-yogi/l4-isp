/*var tariffsSwiper = null; // Глобальная переменная
// проблема с инициализацией нескольких экземпляров !
(function() {
  'use strict';
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
*/

var tariffsSwiperInstances = []; // Store all slider instances if needed elsewhere

(function() {
  'use strict';

  const close = () => window.__hideAllPopovers?.();

  // Initialize every tariffs slider instance on the page individually
  document.querySelectorAll('.tariffs__slider-content').forEach((sliderEl) => {
    // Guard against double-initialization of the same DOM node
    if (sliderEl.classList.contains('swiper-initialized')) return;

    const instance = new Swiper(sliderEl, {
      speed: 400,
      spaceBetween: 0,
      slidesPerView: 'auto',
      navigation: {
        nextEl: sliderEl.closest('section').querySelector('.tariffs__btn-next'),
        prevEl: sliderEl.closest('section').querySelector('.tariffs__btn-prev'),
      },
      pagination: {
        el: sliderEl.closest('section').querySelector('.tariffs__pagination'),
        type: 'fraction',
      }
    });

    // Guard: bind events only if Swiper API is actually available
    if (instance && typeof instance.on === 'function') {
      instance.on('touchStart', close);
      instance.on('sliderMove', close);
      instance.on('touchMove', close);
      instance.on('slideChangeTransitionStart', close);
    }

    tariffsSwiperInstances.push(instance);
  });
})();

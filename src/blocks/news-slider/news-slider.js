document.addEventListener('DOMContentLoaded', function () {
  const news = new Swiper('.news-slider__container', {
    speed: 400,
    spaceBetween: 16,
    slidesPerView: 'auto',
    //initialSlide: 1,
    // autoplay: {
    //   delay: 4000,
    // },
    navigation: {
      nextEl: '.news-slider__btn-next',
      prevEl: '.news-slider__btn-prev',
    },
    pagination: {
      el: '.news-slider__pagination',
      type: 'fraction',
    },
    breakpoints: {
      768: {
        spaceBetween: 24
      }
    }
  });
});


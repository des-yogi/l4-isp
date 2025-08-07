document.addEventListener('DOMContentLoaded', function () {
  const spOffers = new Swiper('.sp-offers__slider', {
    speed: 400,
    spaceBetween: 16,
    slidesPerView: 'auto',
    initialSlide: 1,
    // autoplay: {
    //   delay: 4000,
    // },
    navigation: {
      nextEl: '.sp-offers__btn-next',
      prevEl: '.sp-offers__btn-prev',
    },
    pagination: {
      el: '.sp-offers__pagination',
      type: 'fraction',
    },
    breakpoints: {
      768: {
        spaceBetween: 24
      }
    }
  });
});


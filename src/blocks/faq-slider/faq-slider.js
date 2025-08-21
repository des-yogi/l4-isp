document.addEventListener('DOMContentLoaded', function () {
  const faqSlider = new Swiper('.faq-slider__container', {
    speed: 400,
    spaceBetween: 24,
    slidesPerView: 1,
    // autoplay: {
    //   delay: 4000,
    // },
    navigation: {
      nextEl: '.faq-slider__btn-next',
      prevEl: '.faq-slider__btn-prev',
    },
    pagination: {
      el: '.faq-slider__pagination',
      type: 'fraction',
    },
    breakpoints: {
      768: {
        //spaceBetween: 24,
        slidesPerView: 2
      },
      1280: {
        slidesPerView: 3
      }
    }
  });
});


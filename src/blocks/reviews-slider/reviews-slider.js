document.addEventListener('DOMContentLoaded', function () {
  const slideElements = document.querySelectorAll('.reviews-slider__content .swiper-slide');
  const slidesCount = slideElements.length;
  const initialSlide = Math.floor(slidesCount / 2);

  const review = new Swiper('.reviews-slider__content', {
    speed: 400,
    spaceBetween: 16,
    slidesPerView: 'auto',
    centeredSlides: true,
    //initialSlide: initialSlide,
    loop: true,
    // autoplay: {
    //   delay: 4000,
    // },
    navigation: {
      nextEl: '.reviews-slider__btn-next',
      prevEl: '.reviews-slider__btn-prev',
    },
    pagination: {
      el: '.reviews-slider__pagination',
      type: 'fraction',
    },
    breakpoints: {
      768: {
        spaceBetween: 24
      }
    }
  });
});


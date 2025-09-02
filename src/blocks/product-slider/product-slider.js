document.addEventListener('DOMContentLoaded', function () {
  const prodThumb = new Swiper(".product__slider-thumb", {
    spaceBetween: 8,
    slidesPerView: 'auto',
    freeMode: true,
    watchSlidesProgress: true,
  });

  const prodMain = new Swiper(".product__slider-main", {
    spaceBetween: 24,
    slidesPerView: 1,
    grabCursor: true,
    navigation: {
      nextEl: ".product__btn-next",
      prevEl: ".product__btn-prev",
    },
    thumbs: {
      swiper: prodThumb,
    },
  });
});

(function(){
  const hero = new Swiper('.hero__slider', {
    speed: 400,
    spaceBetween: 0,
    slidesPerView: 1,
    loop: true,
    // autoplay: {
    //   delay: 4000,
    // },
    navigation: {
      nextEl: '.hero__btn-next',
      prevEl: '.hero__btn-prev',
    },
    pagination: {
      el: '.hero__pagination',
      type: 'fraction',
    },
  });
})();

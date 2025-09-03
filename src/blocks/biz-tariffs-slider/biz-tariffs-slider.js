document.addEventListener('DOMContentLoaded', () => {
  const roots = document.querySelectorAll('.biz-tariffs-slider');
  if (!roots.length) return;

  roots.forEach((root) => {
    const el         = root.querySelector('.tariffs__slider-content');
    const nextBtn    = root.querySelector('.tariffs__btn-next');
    const prevBtn    = root.querySelector('.tariffs__btn-prev');
    const fractionEl = root.querySelector('.tariffs__pagination');
    if (!el) return;

    // Сносим прежний инстанс, если вдруг был
    if (el.swiper) { try { el.swiper.destroy(true, true); } catch(e) {} }

    const swiper = new Swiper(el, {
      slidesPerView: 'auto',
      spaceBetween: 0,
      speed: 400,

      // Листаем по ОДНОМУ слайду
      slidesPerGroup: 1,
      freeMode: false,
      centeredSlides: false,

      observer: true,
      observeParents: true,
      watchOverflow: true,
    });

    // Помощники для fraction
    const getCurrent = () => (typeof swiper.realIndex === 'number' ? swiper.realIndex : swiper.activeIndex) + 1;
    const getTotal = () => {
      const slides = Array.from(swiper.slides || []);
      // если когда-то включите loop — не считаем дубликаты
      const total = slides.filter(s => !s.classList.contains('swiper-slide-duplicate')).length;
      return total || slides.length || 0;
    };

    const updateUI = () => {
      // fraction по слайдам
      if (fractionEl) {
        fractionEl.textContent = `${getCurrent()} / ${getTotal()}`;
      }

      const lock = getTotal() <= 1;
      // классы как у встроенной Navigation
      prevBtn?.classList.toggle('swiper-button-disabled', swiper.isBeginning || lock);
      prevBtn?.classList.toggle('swiper-button-lock',      lock);
      nextBtn?.classList.toggle('swiper-button-disabled', swiper.isEnd || lock);
      nextBtn?.classList.toggle('swiper-button-lock',      lock);
    };

    // Свои клики, отрезаем возможные глобальные обработчики
    nextBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      swiper.slideNext();
    });
    prevBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      swiper.slidePrev();
    });

    // Обновления UI
    updateUI();
    swiper.on('slideChange', updateUI);
    swiper.on('transitionEnd', updateUI);
    swiper.on('slidesLengthChange', updateUI);
    swiper.on('resize', () => { swiper.update(); updateUI(); });
  });
});

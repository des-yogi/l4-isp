/*document.addEventListener('DOMContentLoaded', function () {
  const spOfferGrid = new Swiper('.sp-offers-grid-slider__container', {
    speed: 400,
    spaceBetween: 24,
    slidesPerView: 1,
    slidesPerGroup: 1,
    watchOverflow: true,
    observer: true,
    observeParents: true,
    grid: {
      rows: 4,
      fill: 'row',
    },
    navigation: {
      nextEl: '.sp-offers-grid-slider__btn-next',
      prevEl: '.sp-offers-grid-slider__btn-prev',
    },
    pagination: {
      el: '.sp-offers-grid-slider__pagination',
      type: 'fraction',
    },
    breakpoints: {
      768: {
        slidesPerView: 2,
        slidesPerGroup: 2,
        grid: {
          rows: 2,
          //fill: 'column'
        },
      }
    },

    // on: {
    //   afterInit(sw) { sw.update(); },
    //   resize(sw) { sw.update(); },
    //   breakpoint(sw) { sw.update(); },
    // }
  });
});

*/
/*
document.addEventListener('DOMContentLoaded', function () {
  const sliderSelector = '.sp-offers-grid-slider__container';
  const wrapper = document.querySelector(`${sliderSelector} .swiper-wrapper`);

  // 1) Источник истины: сохраняем исходные слайды и признак "новый"
  const allSlides = Array.from(wrapper.children).map((el) => ({
    html: el.outerHTML,
    isNew: el.dataset.new === 'true'
  }));

  // 2) Инициализация Swiper (твой исходный конфиг)
  const spOfferGrid = new Swiper(sliderSelector, {
    speed: 400,
    spaceBetween: 24,
    slidesPerView: 1,
    slidesPerGroup: 1,
    watchOverflow: true,
    observer: true,
    observeParents: true,
    grid: {
      rows: 4,
      fill: 'row',
    },
    navigation: {
      nextEl: '.sp-offers-grid-slider__btn-next',
      prevEl: '.sp-offers-grid-slider__btn-prev',
    },
    pagination: {
      el: '.sp-offers-grid-slider__pagination',
      type: 'fraction',
    },
    breakpoints: {
      768: {
        slidesPerView: 2,
        slidesPerGroup: 2,
        grid: {
          rows: 2,
          // fill: 'column'
        },
      }
    },
  });

  // 3) Утилиты для пересборки
  function rebuildSlides(list) {
    spOfferGrid.removeAllSlides();
    // appendSlide принимает массив строк с HTML или элементы
    spOfferGrid.appendSlide(list.map(item => item.html));
    spOfferGrid.update();
    spOfferGrid.slideTo(0);
  }

  function applyFilter(value) {
    let filtered;
    switch (value) {
      case 'new':
        filtered = allSlides.filter(s => s.isNew);
        break;
      case 'existing':
        // "Все кроме новых"
        filtered = allSlides.filter(s => !s.isNew);
        break;
      case 'all':
      default:
        filtered = allSlides;
        break;
    }
    rebuildSlides(filtered);
  }

  // 4) Обработчики радиокнопок
  const inputs = document.querySelectorAll('.field-filter .field-filter__input[name="offers"]');
  inputs.forEach(input => {
    input.addEventListener('change', (e) => {
      applyFilter(e.target.value);
    });
  });

  // На всякий: если по умолчанию выбран не "all", применим стартовый фильтр
  const checked = document.querySelector('.field-filter .field-filter__input[name="offers"]:checked');
  if (checked && checked.value !== 'all') {
    applyFilter(checked.value);
  }
});*/

document.addEventListener('DOMContentLoaded', () => {
  const sliderSelector = '.sp-offers-grid-slider__container';
  const wrapper = document.querySelector(`${sliderSelector} .swiper-wrapper`);

  // Сохраняем исходные слайды и признак "новый"
  const allSlides = Array.from(wrapper.children).map(el => ({
    html: el.outerHTML,
    isNew: el.dataset.new === 'true'
  }));

  let spOfferGrid;

  const swiperConfig = {
    speed: 400,
    spaceBetween: 24,
    slidesPerView: 1,
    slidesPerGroup: 1,
    watchOverflow: true,
    observer: true,
    observeParents: true,
    grid: {
      rows: 4,
      fill: 'row',
    },
    navigation: {
      nextEl: '.sp-offers-grid-slider__btn-next',
      prevEl: '.sp-offers-grid-slider__btn-prev',
    },
    pagination: {
      el: '.sp-offers-grid-slider__pagination',
      type: 'fraction',
    },
    breakpoints: {
      768: {
        slidesPerView: 2,
        slidesPerGroup: 2,
        grid: { rows: 2 },
      }
    }
  };

  function initSwiper() {
    spOfferGrid = new Swiper(sliderSelector, swiperConfig);
  }

  function mountSlides(list) {
    // Вставляем нужные слайды (HTML уже содержит классы swiper-slide)
    wrapper.innerHTML = list.map(s => s.html).join('');
  }

  function rebuild(list) {
    // Чисто уничтожаем инстанс, затем пересоздаём
    if (spOfferGrid) {
      spOfferGrid.destroy(true, true);
      spOfferGrid = null;
    }
    mountSlides(list);
    // Форсируем reflow, чтобы браузер применил DOM перед инициализацией
    // (иногда помогает против редких гонок расчёта высоты)
    // eslint-disable-next-line no-unused-expressions
    wrapper.offsetHeight;
    initSwiper();
  }

  function applyFilter(value) {
    let filtered = allSlides;
    if (value === 'new') filtered = allSlides.filter(s => s.isNew);
    else if (value === 'existing') filtered = allSlides.filter(s => !s.isNew);
    rebuild(filtered);
  }

  // Инициализация
  initSwiper();

  // Обработчики фильтров
  document.querySelectorAll('.field-filter .field-filter__input[name="offers"]')
    .forEach(input => {
      input.addEventListener('change', (e) => applyFilter(e.target.value));
    });

  // Если дефолт выбран не "all" — применим сразу
  const checked = document.querySelector('.field-filter .field-filter__input[name="offers"]:checked');
  if (checked && checked.value !== 'all') {
    applyFilter(checked.value);
  }
});

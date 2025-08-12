document.addEventListener('DOMContentLoaded', function () {
  const header = document.getElementById('header');
  const mobNavMenu = document.getElementById('mobNav');
  const burger = document.getElementById('menuToggler');
  if (!mobNavMenu || !burger) return;

  function getVisibleHeaderHeight() {
    if (header.classList.contains('page-header--slideUp')) {
      // Возьмите только ту часть, которая остаётся видимой
      const mainPart = header.querySelector('.page-header__main');
      return mainPart ? mainPart.offsetHeight : header.offsetHeight;
    } else {
      // Когда header полностью видим
      return header.offsetHeight;
    }
  }

  function updateMobNavTop() {
    const viewportWidth = window.innerWidth;
    //const topMenuOffset = 10;
    // Получаем значение CSS-переменной
    const topMenuOffset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--mob-menu-offset'), 10) || 0;

    if (viewportWidth >= 768 && viewportWidth < 1280) {
      if (header.classList.contains('page-header--slideUp')) {
        mobNavMenu.style.top = getVisibleHeaderHeight() + topMenuOffset + 'px';
      } else {
       mobNavMenu.style.top = getVisibleHeaderHeight() + topMenuOffset + 'px';
      }
    } else {
      mobNavMenu.style.top = '';
    }
  }

  mobNavMenu.addEventListener('show.bs.offcanvas', event => {
    burger.classList.add('burger--close');
    updateMobNavTop();
  });

  mobNavMenu.addEventListener('hide.bs.offcanvas', event => {
    burger.classList.remove('burger--close');
  });

  // При изменении размера окна, если меню открыто — обновляем top
  window.addEventListener('resize', function() {
    // Bootstrap offcanvas добавляет класс "show" при открытии
    if (mobNavMenu.classList.contains('show')) {
      updateMobNavTop();
    }
  });
});

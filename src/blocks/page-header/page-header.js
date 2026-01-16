(function () {
  const HIDE_HEADER_SCROLL = 120;
  let new_scroll_position = 0;
  let last_scroll_position;
  const header = document.getElementById('header');
  if (!header) return;

  function clearHeaderClasses() {
    header.classList.remove('page-header--slideUp', 'page-header--slideDown');
  }

  function scrollHandler() {
    last_scroll_position = window.scrollY;

    if (last_scroll_position === 0) {
      clearHeaderClasses();
    } else if (new_scroll_position < last_scroll_position && last_scroll_position > HIDE_HEADER_SCROLL) {
      header.classList.remove('page-header--slideDown');
      header.classList.add('page-header--slideUp');
    } else if (new_scroll_position > last_scroll_position) {
      header.classList.remove('page-header--slideUp');
      header.classList.add('page-header--slideDown');
    }

    new_scroll_position = last_scroll_position;
  }

  // requestAnimationFrame-throttle
  let ticking = false;
  window.addEventListener('scroll', function() {
    if (!ticking) {
      window.requestAnimationFrame(function() {
        scrollHandler();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();

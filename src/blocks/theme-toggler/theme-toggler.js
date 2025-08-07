document.addEventListener('DOMContentLoaded', function () {
 /**
 * Theme toggler accessibility enhancer
 *
 * - НЕ переключает классы и темы!
 * - Обеспечивает корректные aria-label и aria-pressed для кнопки.
 * - Работает независимо от основного скрипта темизации.
 * - Использовать совместно с основным скриптом, который управляет классами.
 */

  const block = 'theme-toggler';
  const btn = document.querySelector(`.${block}`);
  if (!btn) return;

  // Утилита: Получить текущую тему по модификатору
  function getTheme() {
    if (btn.classList.contains(`${block}--dark`)) return 'dark';
    if (btn.classList.contains(`${block}--light`)) return 'light';
    return 'light'; // дефолт
  }

  // Установить aria-атрибуты
  function setA11yAttrs(theme) {
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    btn.setAttribute(
      'aria-label',
      theme === 'dark'
        ? 'Переключити на світлу тему'
        : 'Переключити на темну тему'
    );
  }

  // Обновлять aria при каждом изменении классов (например, после переключения темы)
  const observer = new MutationObserver(() => setA11yAttrs(getTheme()));
  observer.observe(btn, { attributes: true, attributeFilter: ['class'] });

  // Инициализация на старте
  setA11yAttrs(getTheme());

  // Доступность: space/enter
  btn.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      btn.click();
    }
  });
});


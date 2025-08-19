(function() {
  // CSS-класс .visually-hidden должен быть в CSS
  const VISUALLY_HIDDEN_CLASS = 'visually-hidden';

  document.querySelectorAll('select.choices, input.choices').forEach(function(element) {
    // Надёжно получаем текст имени поля
    const ariaLabel = element.getAttribute('aria-label') || element.getAttribute('placeholder') || 'Select a value';

    // Убедимся, что у select есть id (нужен для связывания label[for])
    if (!element.id) {
      element.id = 'choices-select-' + Math.random().toString(36).slice(2,9);
    }

    // Ищем реальный <label for="..."> (если есть)
    let labelEl = document.querySelector('label[for="' + CSS.escape(element.id) + '"]');

    // Если label отсутствует — создаём скрытый, но корректный label с текстом
    if (!labelEl) {
      labelEl = document.createElement('label');
      labelEl.className = 'visually-hidden';
      labelEl.id = 'choices-label-' + Math.random().toString(36).slice(2,9);
      labelEl.setAttribute('for', element.id);
      labelEl.textContent = ariaLabel;
      labelEl.dataset.choicesLabel = 'true'; // пометка
      element.parentNode.insertBefore(labelEl, element);
    } else {
      // если label найден — убедимся, что у него есть id и текст
      if (!labelEl.id) labelEl.id = 'choices-label-' + Math.random().toString(36).slice(2,9);
      if (!labelEl.textContent || !labelEl.textContent.trim()) labelEl.textContent = ariaLabel;
      labelEl.removeAttribute('aria-hidden');
    }

    // Формируем опции для Choices и передаём labelId (официальная опция)
    const options = {
      placeholderValue: element.getAttribute('placeholder') || '',
      shouldSort: false,
      itemSelectText: '',
      searchEnabled: element.tagName === 'SELECT',
      removeItemButton: element.tagName === 'INPUT',
      labelId: labelEl.id
    };

    // допускаем доп. опции из data-атрибутов
    if (element.dataset && element.dataset.choicesOptions) {
      try { Object.assign(options, JSON.parse(element.dataset.choicesOptions)); } catch (e) { /* ignore */ }
    }

    // Инициализируем Choices
    new Choices(element, options);
  });
})();

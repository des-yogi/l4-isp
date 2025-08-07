/*(function(){
  document.querySelectorAll('.choices').forEach(function(element) {
    new Choices(element, {
      searchEnabled: element.tagName === 'SELECT',  // По желанию, разные опции для input/select
      placeholder: true,
      shouldSort: false,
      itemSelectText: ''
      // Другие настройки
    });
  });
}());*/

(function() {
  document.querySelectorAll('.choices').forEach(function(element) {
    // Базовые опции для всех элементов
    let options = {
      placeholder: true,
      shouldSort: false,
      itemSelectText: '',
      // Другие настройки
    };

    // Уточняем опции для select
    if(element.tagName === 'SELECT') {
      options.searchEnabled = false; // или true, если нужен поиск
      // Можно добавить другие опции для select
    }

    // Уточняем опции для input[type="text"]
    if(element.tagName === 'INPUT') {
      options.searchEnabled = false; // Обычно не нужен для input
      options.removeItemButton = true; // Например, чтобы можно было удалять введённые значения (для тегов)
      // Можно добавить другие опции для input
    }

    // Дополнительно: кастомные опции через data-атрибуты
    if(element.dataset.choicesOptions) {
      Object.assign(options, JSON.parse(element.dataset.choicesOptions));
    }

    new Choices(element, options);
  });
})();

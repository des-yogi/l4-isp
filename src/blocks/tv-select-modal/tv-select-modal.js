document.addEventListener('DOMContentLoaded', function () {
  const tvSelectModal = document.getElementById('tvSelectModal');
  const modalInstance = new bootstrap.Modal(tvSelectModal);
  const setChannelBtn = tvSelectModal.querySelector('.tv-select-modal__set-btn');

  let currentTriggerButton = null;

  // === ОТКРЫТИЕ МОДАЛКИ ВЫБОРА IPTV ===
  tvSelectModal.addEventListener('shown.bs.modal', event => {
    currentTriggerButton = event.relatedTarget;
  });

  // === ВЫБОР IPTV-ПАКЕТА ===
  if (setChannelBtn) {
    setChannelBtn.addEventListener('click', () => {
      const radioInputs = tvSelectModal.querySelectorAll('.field-radio__input');

      radioInputs.forEach((input) => {
        if (input.checked) {
          const inputText = input.nextElementSibling.textContent;
          let packageName = input.value.split('-')[0].toUpperCase();
          const tvPrice = parseInt(input.dataset.price) || 0;

          if (currentTriggerButton) {
            const buttonSpan = currentTriggerButton.querySelector('span');
            if (buttonSpan) {
              buttonSpan.textContent = `${packageName}: ${inputText}`;
            }

            let tariffCard = currentTriggerButton.closest('.tariff-card');

            if (tariffCard) {
              const priceElement = tariffCard.querySelector('.tariff-card__opt-item--price strong');

              if (priceElement) {
                // Базовая цена ДОЛЖНА быть уже сохранена
                if (!tariffCard.dataset.basePrice) {
                  const currentPrice = priceElement.textContent.trim().replace(/\D+/g, '');
                  tariffCard.dataset.basePrice = currentPrice;
                  console.log('⚠️ Базова ціна НЕ була збережена раніше, зберігаємо зараз:', currentPrice);
                }

                const basePrice = parseInt(tariffCard.dataset.basePrice) || 0;
                const totalPrice = basePrice + tvPrice;

                priceElement.textContent = `${totalPrice} грн`;
                tariffCard.dataset.currentTvPrice = tvPrice;

                // Сохраняем данные об IPTV
                tariffCard.dataset.selectedIptv = `${packageName}: ${inputText}`;
                tariffCard.dataset.iptvValue = input.value;

                console.log('✅ IPTV вибрано:', {
                  пакет: tariffCard.dataset.selectedIptv,
                  базова_ціна: basePrice,
                  ціна_IPTV: tvPrice,
                  загальна_ціна: totalPrice
                });

                // ✅ НОВОЕ: Обновляем форму подключения, если она открыта
                updateVaryModalIfOpen(tariffCard);
              }
            }
          }

          modalInstance.hide();
        }
      });
    });
  }

  // === СЛУШАЕМ СОБЫТИЕ СБРОСА ===
  document.querySelectorAll('.tariff-card').forEach(card => {
    card.addEventListener('iptv-reset', () => {
      const priceElement = card.querySelector('.tariff-card__opt-item--price strong');

      if (priceElement && card.dataset.basePrice) {
        const basePrice = parseInt(card.dataset.basePrice);
        priceElement.textContent = `${basePrice} грн`;

        card.dataset.currentTvPrice = '0';

        // Удаляем данные об IPTV
        delete card.dataset.selectedIptv;
        delete card.dataset.iptvValue;

        console.log('🔄 IPTV скинуто, ціна повернута до базової:', basePrice);

        // ✅ НОВОЕ: Обновляем форму подключения, если она открыта
        updateVaryModalIfOpen(card);
      }
    });
  });

  // ✅ НОВАЯ ФУНКЦИЯ: Обновление формы, если она открыта
  function updateVaryModalIfOpen(tariffCard) {
    const varyModal = document.getElementById('varyModal');

    // Проверяем, открыта ли форма
    if (varyModal && varyModal.classList.contains('show')) {
      const modalSubtitle = varyModal.querySelector('.vary-modal__subtitle');
      const tvTariffInput = varyModal.querySelector('#tvTariff');
      const totalPriceInput = varyModal.querySelector('#totalPrice');
      const priceElement = tariffCard.querySelector('.tariff-card__opt-item--price strong');

      console.log('🔄 Оновлюємо форму підключення (вона відкрита)');

      // Обновляем IPTV
      if (tariffCard.dataset.selectedIptv) {
        tvTariffInput.value = tariffCard.dataset.selectedIptv;
        modalSubtitle.textContent = tariffCard.dataset.selectedIptv;
        modalSubtitle.style.display = '';
      } else {
        tvTariffInput.value = 'Без IPTV';
        modalSubtitle.textContent = '';
        modalSubtitle.style.display = 'none';
      }

      // Обновляем цену
      if (priceElement && totalPriceInput) {
        const price = priceElement.textContent.trim();
        totalPriceInput.value = price;
      }

      console.log('✅ Форма оновлена:', {
        iptv: tvTariffInput.value,
        ціна: totalPriceInput.value
      });
    }
  }

  // === ОБРАБОТКА ЗАКРЫТИЯ МОДАЛКИ БЕЗ ВЫБОРА ===
  const tvModal = document.getElementById('tvSelectModal');

  if (tvModal) {
    tvModal.addEventListener('hidden.bs.modal', function () {
      console.log('🚪 Модалка закрита');

      // Находим карточку, для которой открывали модалку
      const currentCard = document.querySelector('.tariff-card[data-modal-opened="true"]');

      if (!currentCard) {
        console.log('⚠️ Карточка не знайдена або модалка відкрита не з картки');
        return;
      }

      // Проверяем, был ли выбран пакет
      const packageSelected = currentCard.dataset.selectedIptv;

      if (!packageSelected) {
        console.log('❌ Пакет не обрано, повертаємо картку до початкового стану');

        // Отправляем событие сброса
        currentCard.dispatchEvent(new CustomEvent('iptv-reset'));

        // ✅ Отправляем событие восстановления UI
        currentCard.dispatchEvent(new CustomEvent('iptv-ui-reset'));

        // Скрываем блок контролов
        const formWrapper = currentCard.querySelector('.tariff-card__form-wrapper');
        if (formWrapper) {
          formWrapper.style.display = 'none';
        }

        // ✅ Показываем кнопку "Додати IPTV" обратно
        const addIptvBtn = currentCard.querySelector('.tariff-card__iptv-btn');
        if (addIptvBtn) {
          addIptvBtn.style.display = 'flex';
          console.log('👁️ Кнопка "Додати IPTV" знову видима');
        }

        console.log('✅ Картка повернута до початкового стану');
      } else {
        console.log('✅ Пакет обрано:', packageSelected);
      }

      // Убираем флаг "модалка была открыта"
      delete currentCard.dataset.modalOpened;
    });
  }
});

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
          //console.log('🔍 Проверяем выбранный инпут:', input);
          //console.log('🔍 Value:', input.value);
          //console.log('🔍 Price:', input.dataset.price);

          // Получаем название пакета
          const inputText = input.nextElementSibling.textContent.trim();
          let packageName = input.value.split('-')[0].toUpperCase();
          const tvPrice = parseInt(input.dataset.price) || 0;

          //console.log('📦 Пакет:', packageName, inputText);
          //console.log('💰 Цена:', tvPrice);

          // Ищем родительский блок .tv-select-modal__input-wrapper
          const inputWrapper = input.closest('.tv-select-modal__input-wrapper');
          //console.log('🔍 Родитель .tv-select-modal__input-wrapper:', inputWrapper);

          if (inputWrapper) {
            // Ищем ссылку "Перелік каналів" внутри этого блока
            const channelLink = inputWrapper.querySelector('.tv-select-modal__link[onclick]');
            //console.log('🔍 Ссылка с onclick:', channelLink);

            const onclickAttr = channelLink ? channelLink.getAttribute('onclick') : '';
            //console.log(onclickAttr ? '✅ onclick найден:' : '⚠️ onclick отсутствует:', onclickAttr);

            // Находим карточку тарифа
            if (currentTriggerButton) {
              const tariffCard = currentTriggerButton.closest('.tariff-card');
              //console.log('🔍 Карточка тарифа:', tariffCard);

              if (tariffCard) {
                // ✅ ВАЖНО: Сохраняем данные о выбранном пакете
                tariffCard.dataset.selectedIptv = `${packageName}: ${inputText}`;
                tariffCard.dataset.iptvValue = input.value;
                tariffCard.dataset.channelOnclick = onclickAttr; // Сохраняем onclick

                /*console.log('✅ Данные сохранены в dataset:', {
                  selectedIptv: tariffCard.dataset.selectedIptv,
                  iptvValue: tariffCard.dataset.iptvValue,
                  channelOnclick: tariffCard.dataset.channelOnclick
                });*/

                // Обновляем текст в кнопке селектора
                const buttonSpan = currentTriggerButton.querySelector('span');
                if (buttonSpan) {
                  buttonSpan.textContent = `${packageName}: ${inputText}`;
                  //console.log('✅ Текст кнопки обновлён:', buttonSpan.textContent);
                }

                // Обновляем цену
                const priceElement = tariffCard.querySelector('.tariff-card__opt-item--price strong');
                if (priceElement && tariffCard.dataset.basePrice) {
                  const basePrice = parseInt(tariffCard.dataset.basePrice);
                  const newPrice = basePrice + tvPrice;
                  priceElement.textContent = `${newPrice} грн`;
                  tariffCard.dataset.currentTvPrice = tvPrice.toString();

                  /*console.log('✅ Цена обновлена:', {
                    базовая: basePrice,
                    IPTV: tvPrice,
                    итого: newPrice
                  });*/
                }

                // Находим кнопку в карточке
                const tvListBtn = tariffCard.querySelector('.faq-btn--tv-list');
                //console.log('🔍 Кнопка .faq-btn--tv-list:', tvListBtn);

                if (tvListBtn) {
                  if (onclickAttr) {
                    // Копируем onclick
                    tvListBtn.setAttribute('onclick', onclickAttr);
                    tvListBtn.style.opacity = '1';
                    tvListBtn.style.pointerEvents = 'auto';
                    //console.log('✅ onclick скопирован на кнопку и кнопка активирована');
                  } else {
                    // Если onclick нет — деактивируем кнопку
                    tvListBtn.removeAttribute('onclick');
                    tvListBtn.style.opacity = '0.5';
                    tvListBtn.style.pointerEvents = 'none';
                    //console.log('⚠️ onclick отсутствует, кнопка деактивирована');
                  }
                } else {
                  console.error('❌ Кнопка .faq-btn--tv-list не найдена в карточке');
                }
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

        //console.log('🔄 IPTV скинуто, ціна повернута до базової:', basePrice);

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

      //console.log('🔄 Оновлюємо форму підключення (вона відкрита)');

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

      /*console.log('✅ Форма оновлена:', {
        iptv: tvTariffInput.value,
        ціна: totalPriceInput.value
      });*/
    }
  }

  // === ОБРАБОТКА ЗАКРЫТИЯ МОДАЛКИ БЕЗ ВЫБОРА ===
  const tvModal = document.getElementById('tvSelectModal');

  if (tvModal) {
    tvModal.addEventListener('hidden.bs.modal', function () {
      //console.log('🚪 Модалка закрита');

      // Находим карточку, для которой открывали модалку
      const currentCard = document.querySelector('.tariff-card[data-modal-opened="true"]');

      if (!currentCard) {
        //console.log('⚠️ Карточка не знайдена або модалка відкрита не з картки');
        return;
      }

      // Проверяем, был ли выбран пакет
      const packageSelected = currentCard.dataset.selectedIptv;

      if (!packageSelected) {
        //console.log('❌ Пакет не обрано, повертаємо картку до початкового стану');

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
          //console.log('👁️ Кнопка "Додати IPTV" знову видима');
        }

        //console.log('✅ Картка повернута до початкового стану');
      } else {
        //console.log('✅ Пакет обрано:', packageSelected);
      }

      // Убираем флаг "модалка была открыта"
      delete currentCard.dataset.modalOpened;
    });
  }
});

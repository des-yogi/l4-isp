(function(){
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
          // Получаем название пакета
          const inputText = input.nextElementSibling.textContent.trim();
          let packageName = input.value.split('-')[0].toUpperCase();
          const tvPrice = parseInt(input.dataset.price) || 0;

          // Ищем родительский блок .tv-select-modal__input-wrapper
          const inputWrapper = input.closest('.tv-select-modal__input-wrapper');

          if (inputWrapper) {
            // Ищем ссылку "Перелік каналів" внутри этого блока
            const channelLink = inputWrapper.querySelector('.tv-select-modal__link[onclick]');

            const onclickAttr = channelLink ? channelLink.getAttribute('onclick') : '';
            // NEW: получаем значение data-bs-whatever (если есть)
            const bsWhateverValue = channelLink
              ? (channelLink.getAttribute('data-bs-whatever') || channelLink.dataset.bsWhatever || '').toString().trim()
              : '';

            // Находим карточку тарифа
            if (currentTriggerButton) {
              const tariffCard = currentTriggerButton.closest('.tariff-card');

              if (tariffCard) {
                // ✅ Сохраняем данные о выбранном пакете
                tariffCard.dataset.selectedIptv = `${packageName}: ${inputText}`;
                tariffCard.dataset.iptvValue = input.value;
                tariffCard.dataset.channelOnclick = onclickAttr; // Сохраняем onclick

                // NEW: сохраняем value data-bs-whatever в dataset карточки (или удаляем если пусто)
                if (bsWhateverValue) {
                  tariffCard.dataset.channelWhatever = bsWhateverValue;
                } else {
                  delete tariffCard.dataset.channelWhatever;
                }

                // Обновляем текст в кнопке селектора
                const buttonSpan = currentTriggerButton.querySelector('span');
                if (buttonSpan) {
                  buttonSpan.textContent = `${packageName}: ${inputText}`;
                }

                // Обновляем цену
                const priceElement = tariffCard.querySelector('.tariff-card__opt-item--price strong');
                if (priceElement && tariffCard.dataset.basePrice) {
                  const basePrice = parseInt(tariffCard.dataset.basePrice);
                  const newPrice = basePrice + tvPrice;
                  priceElement.textContent = `${newPrice} грн`;
                  tariffCard.dataset.currentTvPrice = tvPrice.toString();
                }

                // Находим все элементы в карточке, которые могут открывать модалку каналов
                // (текстовая кнопка, иконка и т.д.)
                const channelTargets = tariffCard.querySelectorAll(
                  '[data-bs-toggle="modal"][data-bs-target="#channelsModal"], .faq-btn--tv-list'
                );

                if (channelTargets && channelTargets.length > 0) {
                  channelTargets.forEach((t) => {
                    // 1) onclick
                    if (onclickAttr) {
                      t.setAttribute('onclick', onclickAttr);
                      t.style.opacity = '1';
                      t.style.pointerEvents = 'auto';
                    } else {
                      // если onclick отсутствует — деактивируем
                      t.removeAttribute('onclick');
                      t.style.opacity = '0.5';
                      t.style.pointerEvents = 'none';
                    }

                    // 2) data-bs-whatever копируем (или удаляем если отсутствует/пустой)
                    if (bsWhateverValue) {
                      t.setAttribute('data-bs-whatever', bsWhateverValue);
                      try { t.dataset.bsWhatever = bsWhateverValue; } catch (e) {}
                    } else {
                      if (t.hasAttribute('data-bs-whatever')) {
                        t.removeAttribute('data-bs-whatever');
                        try { delete t.dataset.bsWhatever; } catch (e) {}
                      }
                    }

                    // 3) на всякий случай синхронизируем title/aria-label
                    const aria = channelLink ? channelLink.getAttribute('aria-label') : null;
                    if (aria) t.setAttribute('aria-label', aria);
                    const title = channelLink ? channelLink.getAttribute('title') : null;
                    if (title) t.setAttribute('title', title);
                  });
                } else {
                  console.error('❌ Кнопки открытия списка каналов не найдены в карточке');
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

        // НЕ удаляем channelOnclick автоматически (как раньше), но удалим значение channelWhatever, т.к. пакет сброшен
        delete card.dataset.channelWhatever;

        // Обновляем форму подключения, если она открыта
        updateVaryModalIfOpen(card);
      }
    });
  });

  // Функция обновления формы, если она открыта
  function updateVaryModalIfOpen(tariffCard) {
    const varyModal = document.getElementById('varyModal');

    // Проверяем, открыта ли форма
    if (varyModal && varyModal.classList.contains('show')) {
      const modalSubtitle = varyModal.querySelector('.vary-modal__subtitle');
      const tvTariffInput = varyModal.querySelector('#tvTariff');
      const totalPriceInput = varyModal.querySelector('#totalPrice');
      const priceElement = tariffCard.querySelector('.tariff-card__opt-item--price strong');

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
    }
  }

  // === ОБРАБОТКА ЗАКРЫТИЯ МОДАЛКИ БЕЗ ВЫБОРА ===
  const tvModal = document.getElementById('tvSelectModal');

  if (tvModal) {
    tvModal.addEventListener('hidden.bs.modal', function () {
      // Находим карточку, для которой открывали модалку
      const currentCard = document.querySelector('.tariff-card[data-modal-opened="true"]');

      if (!currentCard) {
        return;
      }

      // Проверяем, был ли выбран пакет
      const packageSelected = currentCard.dataset.selectedIptv;

      if (!packageSelected) {
        // Отправляем событие сброса
        currentCard.dispatchEvent(new CustomEvent('iptv-reset'));

        // Отправляем событие восстановления UI
        currentCard.dispatchEvent(new CustomEvent('iptv-ui-reset'));

        // Скрываем блок контролов
        const formWrapper = currentCard.querySelector('.tariff-card__form-wrapper');
        if (formWrapper) {
          formWrapper.style.display = 'none';
        }

        // Показываем кнопку "Додати IPTV" обратно
        const addIptvBtn = currentCard.querySelector('.tariff-card__iptv-btn');
        if (addIptvBtn) {
          addIptvBtn.style.display = 'flex';
        }
      }

      // Убираем флаг "модалка была открыта"
      delete currentCard.dataset.modalOpened;
    });
  }
}());

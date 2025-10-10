document.addEventListener('DOMContentLoaded', function () {
  const tvSelectModal = document.getElementById('tvSelectModal');
  const modalInstance = new bootstrap.Modal(tvSelectModal);
  const setChannelBtn = tvSelectModal.querySelector('.tv-select-modal__set-btn');

  let currentTriggerButton = null;

  // === ОТКРЫТИЕ МОДАЛКИ ===
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
              const priceElement = tariffCard.querySelector('.tariff-card__opt-list li:last-child strong');

              if (priceElement) {
                if (!tariffCard.dataset.basePrice) {
                  const currentPrice = priceElement.textContent.trim().replace(/\D+/g, '');
                  tariffCard.dataset.basePrice = currentPrice;
                }

                const basePrice = parseInt(tariffCard.dataset.basePrice) || 0;
                const totalPrice = basePrice + tvPrice;

                priceElement.textContent = `${totalPrice} грн`;
                tariffCard.dataset.currentTvPrice = tvPrice;

                // Сохраняем данные об IPTV
                tariffCard.dataset.selectedIptv = `${packageName}: ${inputText}`;
                tariffCard.dataset.iptvValue = input.value;

                console.log('Сохранены данные IPTV:', {
                  selectedIptv: tariffCard.dataset.selectedIptv,
                  iptvValue: tariffCard.dataset.iptvValue
                });
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
      const priceElement = card.querySelector('.tariff-card__opt-list li:last-child strong');

      if (priceElement && card.dataset.basePrice) {
        const basePrice = parseInt(card.dataset.basePrice);
        priceElement.textContent = `${basePrice} грн`;

        card.dataset.currentTvPrice = '0';

        // ✅ ВАЖНО: удаляем данные об IPTV полностью
        delete card.dataset.selectedIptv;
        delete card.dataset.iptvValue;

        console.log('✅ Цена и IPTV сброшены, dataset очищен:', card.dataset);
      }
    });
  });
});

/*(function(){
  const tvSelectModal = document.getElementById('tvSelectModal');
  const modalInstance = new bootstrap.Modal(tvSelectModal);
  const setChannelBtn = tvSelectModal.querySelector('.tv-select-modal__set-btn');

  let currentTriggerButton = null;

  // === ОТКРЫТИЕ МОДАЛКИ ВЫБОРА IPTV ===
  tvSelectModal.addEventListener('shown.bs.modal', event => {
    currentTriggerButton = event.relatedTarget;
  });

  // === Надёжная пометка карточки при открытии модалки ===
  tvSelectModal.addEventListener('show.bs.modal', function (e) {
    // relatedTarget — элемент, по которому открывают модалку (bootstrap передаёт его)
    const trigger = e.relatedTarget || currentTriggerButton || null;
    if (!trigger) return;

    const card = trigger.closest('.tariff-card');
    if (card) {
      card.dataset.modalOpened = 'true';
      // Для отладки временно:
      // console.log('🏷️ Помечена карточка как открытая modal:', card);
    }
  });

  // Обнуляем currentTriggerButton при закрытии (безопасность)
  tvSelectModal.addEventListener('hidden.bs.modal', function (e) {
    // existing hidden handler ниже удаляет флаг; оставим currentTriggerButton = null в конце
    currentTriggerButton = null;
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
      let currentCard = document.querySelector('.tariff-card[data-modal-opened="true"]');

      if (!currentCard && currentTriggerButton) {
        // fallback: если карточка не найдена по флагу — попробуем по currentTriggerButton
        currentCard = currentTriggerButton.closest ? currentTriggerButton.closest('.tariff-card') : null;
      }

      if (!currentCard) {
        // Лог для отладки, потом удалить
        console.warn('⚠️ hidden.bs.modal: не найдена карточка с data-modal-opened="true" и currentTriggerButton не дал результат.', {
          currentTriggerButton,
          cardsWithFlag: document.querySelectorAll('.tariff-card[data-modal-opened="true"]').length
        });
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
*/

(function(){
  const tvSelectModal = document.getElementById('tvSelectModal');
  if (!tvSelectModal) {
    console.warn('tv-select-modal.js: #tvSelectModal not found — скрипт пропущен');
    return;
  }

  const modalInstance = new bootstrap.Modal(tvSelectModal);
  const setChannelBtn = tvSelectModal.querySelector('.tv-select-modal__set-btn');

  let currentTriggerButton = null;

  // Делегат кликов — фиксируем последний триггер, открывший tvSelectModal
  document.addEventListener('click', function (ev) {
    try {
      const el = ev.target.closest && ev.target.closest('[data-bs-toggle="modal"], [data-bs-target]');
      if (!el) return;
      const target = el.getAttribute && (el.getAttribute('data-bs-target') || el.dataset.bsTarget || '');
      if (target.trim() === '#tvSelectModal') {
        tvSelectModal.__lastRelatedTarget__ = el;
        window.tvSelectModalLastTrigger = el;
      }
    } catch (e) {/* ignore */}
  }, { capture: true });

  // Открытие модалки выбора IPTV
  tvSelectModal.addEventListener('show.bs.modal', event => {
    const trigger = event.relatedTarget || tvSelectModal.__lastRelatedTarget__ || window.tvSelectModalLastTrigger || null;
    if (trigger && trigger.closest) {
      const card = trigger.closest('.tariff-card');
      if (card) {
        // помечаем карточку
        card.dataset.modalOpened = 'true';
        // гарантированно фиксируем базовую цену один раз
        if (!card.dataset.basePrice) {
          const priceEl = card.querySelector('.tariff-card__opt-item--price strong, .tariff-card__price strong, [data-role="price"]');
          if (priceEl) {
            const num = parseInt(priceEl.textContent.trim().replace(/\D+/g, ''));
            if (!Number.isNaN(num)) card.dataset.basePrice = String(num);
          }
        }
      }
    }
  });

  tvSelectModal.addEventListener('shown.bs.modal', event => {
    currentTriggerButton = event.relatedTarget || tvSelectModal.__lastRelatedTarget__ || window.tvSelectModalLastTrigger || currentTriggerButton || null;
  });

  // Выбор IPTV-пакета
  if (setChannelBtn) {
    setChannelBtn.addEventListener('click', () => {
      const radioInputs = tvSelectModal.querySelectorAll('.field-radio__input');

      radioInputs.forEach((input) => {
        if (!input.checked) return;

        const inputText = (input.nextElementSibling && input.nextElementSibling.textContent) ? input.nextElementSibling.textContent.trim() : '';
        let packageName = (input.value || '').split('-')[0].toUpperCase();
        const tvPrice = parseInt(input.dataset.price) || 0;

        const inputWrapper = input.closest('.tv-select-modal__input-wrapper');
        if (!inputWrapper) return;

        const channelLink = inputWrapper.querySelector('.tv-select-modal__link[onclick], .tv-select-modal__link[data-bs-whatever]');
        const onclickAttr = channelLink ? channelLink.getAttribute('onclick') : '';
        const bsWhateverValue = channelLink
          ? (channelLink.getAttribute('data-bs-whatever') || channelLink.dataset.bsWhatever || '').toString().trim()
          : '';

        const trigger = currentTriggerButton || tvSelectModal.__lastRelatedTarget__ || window.tvSelectModalLastTrigger || null;
        if (!trigger || !trigger.closest) {
          console.warn('setChannelBtn: не удалось определить триггер/карточку (currentTrigger/lastRelatedTarget отсутствуют)');
          return;
        }

        const tariffCard = trigger.closest('.tariff-card');
        if (!tariffCard) {
          console.warn('Не удалось найти .tariff-card по триггеру открытия модалки', trigger);
          return;
        }

        // Сохраняем данные о выбранном пакете
        tariffCard.dataset.selectedIptv = `${packageName}: ${inputText}`;
        tariffCard.dataset.iptvValue = input.value;
        tariffCard.dataset.channelOnclick = onclickAttr || '';

        if (bsWhateverValue) {
          tariffCard.dataset.channelWhatever = bsWhateverValue;
        } else {
          delete tariffCard.dataset.channelWhatever;
        }

        // Обновляем текст в кнопке селектора
        const buttonSpan = trigger.querySelector && trigger.querySelector('span');
        if (buttonSpan) buttonSpan.textContent = `${packageName}: ${inputText}`;

        // Обновляем цену (на видимом узле)
        const priceElement = tariffCard.querySelector('.tariff-card__opt-item--price strong, .tariff-card__price strong, [data-role="price"]');
        if (priceElement) {
          const baseFromDataset = tariffCard.dataset.basePrice ? parseInt(tariffCard.dataset.basePrice) : null;
          const basePrice = Number.isInteger(baseFromDataset) ? baseFromDataset : null;
          if (basePrice !== null) {
            const newPrice = basePrice + tvPrice;
            priceElement.textContent = `${newPrice} грн`;
            tariffCard.dataset.currentTvPrice = tvPrice.toString();
          } else {
            const maybe = priceElement.textContent.trim().replace(/\D+/g, '');
            const curr = maybe ? parseInt(maybe) : null;
            if (curr !== null) {
              tariffCard.dataset.basePrice = curr.toString();
              const newPrice = curr + tvPrice;
              priceElement.textContent = `${newPrice} грн`;
              tariffCard.dataset.currentTvPrice = tvPrice.toString();
            } else {
              tariffCard.dataset.currentTvPrice = tvPrice.toString();
            }
          }
        }

        // Дублируем атрибуты на кнопки списка каналов
        const channelTargets = tariffCard.querySelectorAll('[data-bs-toggle="modal"][data-bs-target="#channelsModal"], .faq-btn--tv-list');
        channelTargets.forEach((t) => {
          // onclick
          try {
            if (onclickAttr) {
              t.setAttribute('onclick', onclickAttr);
              t.style.opacity = '1';
              t.style.pointerEvents = 'auto';
            } else {
              t.removeAttribute('onclick');
              t.style.opacity = '0.5';
              t.style.pointerEvents = 'none';
            }
          } catch (err) {
            try { t.removeAttribute('onclick'); } catch (e) {}
          }
          // data-bs-whatever
          try {
            if (bsWhateverValue) {
              t.setAttribute('data-bs-whatever', bsWhateverValue);
              try { t.dataset.bsWhatever = bsWhateverValue; } catch (e) {}
            } else {
              if (t.hasAttribute('data-bs-whatever')) {
                t.removeAttribute('data-bs-whatever');
                try { delete t.dataset.bsWhatever; } catch (e) {}
              }
            }
          } catch (err) {}
          // title/aria-label
          if (channelLink) {
            const aria = channelLink.getAttribute('aria-label');
            if (aria) t.setAttribute('aria-label', aria);
            const title = channelLink.getAttribute('title');
            if (title) t.setAttribute('title', title);
          }
        });

        // Скрываем модалку выбора пакета
        try { modalInstance.hide(); } catch (e) { tvSelectModal.classList.remove('show'); }
      });
    });
  }

  // Обновление формы, если она открыта
  function updateVaryModalIfOpen(tariffCard) {
    const varyModal = document.getElementById('varyModal');
    if (varyModal && varyModal.classList.contains('show')) {
      const modalSubtitle = varyModal.querySelector('.vary-modal__subtitle');
      const tvTariffInput = varyModal.querySelector('#tvTariff');
      const totalPriceInput = varyModal.querySelector('#totalPrice');
      const priceElement = tariffCard.querySelector('.tariff-card__opt-item--price strong, .tariff-card__price strong, [data-role="price"]');

      if (tariffCard.dataset.selectedIptv) {
        if (tvTariffInput) tvTariffInput.value = tariffCard.dataset.selectedIptv;
        if (modalSubtitle) { modalSubtitle.textContent = tariffCard.dataset.selectedIptv; modalSubtitle.style.display = ''; }
      } else {
        if (tvTariffInput) tvTariffInput.value = 'Без IPTV';
        if (modalSubtitle) { modalSubtitle.textContent = ''; modalSubtitle.style.display = 'none'; }
      }

      if (priceElement && totalPriceInput) {
        const price = priceElement.textContent.trim();
        totalPriceInput.value = price;
      }
    }
  }

  // ОБРАБОТКА ЗАКРЫТИЯ tvSelectModal (без выбора)
  const tvModal = tvSelectModal;
  if (tvModal) {
    tvModal.addEventListener('hidden.bs.modal', function () {
      // Находим карточку, для которой открывали модалку
      let currentCard = document.querySelector('.tariff-card[data-modal-opened="true"]');

      if (!currentCard && currentTriggerButton && currentTriggerButton.closest) {
        currentCard = currentTriggerButton.closest('.tariff-card') || null;
      }
      if (!currentCard) {
        const last = tvSelectModal.__lastRelatedTarget__ || window.tvSelectModalLastTrigger || null;
        if (last && last.closest) {
          try { currentCard = last.closest('.tariff-card'); } catch (err) { currentCard = null; }
        }
      }

      if (!currentCard) {
        try { delete tvSelectModal.__lastRelatedTarget__; } catch (e) {}
        try { window.tvSelectModalLastTrigger = null; } catch (e) {}
        currentTriggerButton = null;
        return;
      }

      const packageSelected = currentCard.dataset.selectedIptv;

      if (!packageSelected) {
        // Сброс данных и UI
        try { currentCard.dispatchEvent(new CustomEvent('iptv-reset', { bubbles: true })); } catch (e) {}
        try { currentCard.dispatchEvent(new CustomEvent('iptv-ui-reset', { bubbles: true })); } catch (e) {}
        // Скрываем блок контролов
        const formWrapper = currentCard.querySelector('.tariff-card__form-wrapper');
        if (formWrapper) formWrapper.style.display = 'none';
        // Показываем кнопку "Додати IPTV" обратно
        const addIptvBtn = currentCard.querySelector('.tariff-card__iptv-btn');
        if (addIptvBtn) addIptvBtn.style.display = 'flex';
      }

      // Убираем флаг и очищаем указатели
      try { delete currentCard.dataset.modalOpened; } catch (e) {}
      try { delete tvSelectModal.__lastRelatedTarget__; } catch (e) {}
      try { window.tvSelectModalLastTrigger = null; } catch (e) {}
      currentTriggerButton = null;
    });
  }

  // ДЕЛЕГИРОВАННЫЙ СЛУШАТЕЛЬ СБРОСА — работает для любых карточек (в т.ч. добавленных позже)
  document.addEventListener('iptv-reset', (ev) => {
    const card = ev.target?.closest ? ev.target.closest('.tariff-card') : ev.target;
    if (!card || !card.classList || !card.classList.contains('tariff-card')) return;

    const getNumber = (s) => {
      const m = String(s || '').trim().replace(/\D+/g, '');
      return m ? parseInt(m) : NaN;
    };
    const pickPriceNodes = (root) =>
      root.querySelectorAll('.tariff-card__opt-item--price strong, .tariff-card__price strong, [data-role="price"]');

    // 1) Надежно определяем basePrice
    let basePrice = getNumber(card.dataset.basePrice);
    if (!Number.isFinite(basePrice)) {
      const anyNode = pickPriceNodes(card)[0];
      const shown = anyNode ? getNumber(anyNode.textContent) : NaN;
      const tvAdd = getNumber(card.dataset.currentTvPrice);
      if (Number.isFinite(shown)) {
        basePrice = Number.isFinite(tvAdd) ? (shown - tvAdd) : shown;
      }
    }
    if (Number.isFinite(basePrice) && basePrice >= 0) {
      // фиксируем basePrice
      card.dataset.basePrice = String(basePrice);
      // 2) Обновляем ВСЕ “ценовые” узлы (сначала видимые, потом все)
      const nodes = Array.from(pickPriceNodes(card));
      let updated = 0;
      nodes.forEach(el => {
        if (el.offsetParent !== null) {
          el.textContent = `${basePrice} грн`;
          updated++;
        }
      });
      if (updated === 0) nodes.forEach(el => { el.textContent = `${basePrice} грн`; });
    } else {
      console.warn('iptv-reset: basePrice не удалось вычислить', { dataset: { ...card.dataset } });
    }

    // 3) Очищаем dataset карточки
    card.dataset.currentTvPrice = '0';
    delete card.dataset.selectedIptv;
    delete card.dataset.iptvValue;
    delete card.dataset.channelWhatever;

    // 4) Обновляем форму подключения, если она открыта
    try { updateVaryModalIfOpen(card); } catch (e) { console.error('Ошибка updateVaryModalIfOpen', e); }
  }, { capture: true });

  // ===== Привязка к модалке заказа (varyModal): актуализируем данные при открытии =====
  document.addEventListener('click', function (ev) {
    const el = ev.target.closest && ev.target.closest('[data-bs-target="#varyModal"]');
    if (el) window.varyModalLastTrigger = el;
  }, { capture: true });

  const varyModal = document.getElementById('varyModal');
  if (varyModal) {
    varyModal.addEventListener('show.bs.modal', function (e) {
      const trigger = e.relatedTarget || window.varyModalLastTrigger || null;
      const card = trigger && trigger.closest ? trigger.closest('.tariff-card') : null;
      if (!card) return;

      const modalSubtitle = varyModal.querySelector('.vary-modal__subtitle');
      const tvTariffInput = varyModal.querySelector('#tvTariff');
      const totalPriceInput = varyModal.querySelector('#totalPrice');
      const priceElement = card.querySelector('.tariff-card__opt-item--price strong, .tariff-card__price strong, [data-role="price"]');

      if (card.dataset.selectedIptv) {
        if (tvTariffInput) tvTariffInput.value = card.dataset.selectedIptv;
        if (modalSubtitle) { modalSubtitle.textContent = card.dataset.selectedIptv; modalSubtitle.style.display = ''; }
      } else {
        if (tvTariffInput) tvTariffInput.value = 'Без IPTV';
        if (modalSubtitle) { modalSubtitle.textContent = ''; modalSubtitle.style.display = 'none'; }
      }

      if (totalPriceInput && priceElement) {
        totalPriceInput.value = priceElement.textContent.trim();
      }
    });
  }
}());

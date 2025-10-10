document.addEventListener('DOMContentLoaded', function () {
  const tvSelectModal = document.getElementById('tvSelectModal');
  //console.log('tvSelectModal');
  tvSelectModal.addEventListener('shown.bs.modal', event => {
    const radioList = tvSelectModal.querySelectorAll('.field-radio__input');
    const setChannelBtn = tvSelectModal.querySelector('.tv-select-modal__set-btn');
    //console.log(radioList);
    //console.log('modal fired');
  });
});

const optionBoxes = document.querySelectorAll('.option-box');

optionBoxes.forEach((box) => {
  box.addEventListener('click', () => {
    const isSelected = box.classList.contains('selected');

    if (isSelected) {
      box.classList.remove('selected');
      box.setAttribute('aria-pressed', 'false');
      return;
    }

    optionBoxes.forEach((item) => {
      item.classList.remove('selected');
      item.setAttribute('aria-pressed', 'false');
    });

    box.classList.add('selected');
    box.setAttribute('aria-pressed', 'true');
  });
});

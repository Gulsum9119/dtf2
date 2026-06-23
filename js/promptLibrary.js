const PROMPT_LIBRARY = {
  quality: [
    'Улучшить резкость и чёткость изображения',
    'Увеличить детализацию текстур',
    'Убрать шум и артефакты JPEG',
    'Усилить контрастность',
    'Восстановить потерянные детали',
  ],
  background: [
    'Удалить фон и сделать его прозрачным',
    'Точно выделить объект на сложном фоне',
    'Убрать белый фон вокруг объекта',
    'Удалить фон с сохранением полупрозрачных элементов',
    'Отделить объект от градиентного фона',
  ],
  dtf: [
    'Адаптировать изображение для DTF-печати на белой ткани',
    'Адаптировать для печати на чёрной ткани (добавить белую подложку)',
    'Усилить контуры для чёткой печати',
    'Увеличить насыщенность цветов для DTF',
    'Оптимизировать для малоформатной печати',
  ],
  special: [
    'Аниме-стиль: сохранить чёткие контуры и плоские цвета',
    'Цифровой арт: сохранить художественные детали',
    'Фотография людей: аккуратное выделение волос',
    'Логотип: сделать края максимально чёткими',
    'Объект с прозрачными элементами (стекло, дым)',
  ],
};

function loadPrompts() {
  const category = document.getElementById('promptCategory').value;
  const prompts = PROMPT_LIBRARY[category] || [];
  const list = document.getElementById('promptList');
  list.innerHTML = prompts.map(p =>
    `<div class="prompt-item" onclick="selectPrompt(this)">${p}</div>`
  ).join('');
}

function selectPrompt(el) {
  document.getElementById('promptInput').value = el.textContent;
  document.querySelectorAll('.prompt-item').forEach(i => i.style.background = '');
  el.style.background = 'rgba(255,77,109,0.1)';
}

function copyPrompt() {
  const text = document.getElementById('promptInput').value;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    btn.textContent = 'Скопировано!';
    setTimeout(() => btn.textContent = 'Скопировать', 1500);
  });
}
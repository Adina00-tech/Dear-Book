// The atmosphere interview is independent of the compose form and storage.
const AtmosphereQuiz = (() => {
  const select = (key, title, choices) => ({
    key, title, kind: 'select',
    choices: choices.map(([id, label]) => ({ id, label }))
  });
  const questions = [
    select('place', 'Если бы сегодняшний день был местом, где бы ты оказался?', [
      ['night-city', 'Пустой город ночью.'],
      ['warm-room', 'Тёплая комната с открытым окном.'],
      ['crowded-station', 'Переполненный вокзал.'],
      ['seaside-city', 'Незнакомый город у моря.'],
      ['country-house', 'Тихий дом за городом.'],
      ['indescribable', 'Место, которое сложно описать.']
    ]),
    select('weather', 'Если бы атмосфера дня была погодой, какой?', [
      ['warm-rain', 'Тёплый дождь.'],
      ['bright-sun', 'Яркое солнце.'],
      ['heavy-clouds', 'Тяжёлые облака.'],
      ['cold-air', 'Холодный чистый воздух.'],
      ['fog', 'Туман.'],
      ['changing-weather', 'Постоянно меняющаяся погода.']
    ]),
    select('rhythm', 'Какой ритм был у этого дня?', [
      ['slow-blurred', 'Медленный и размытый.'],
      ['fast-chaotic', 'Быстрый и хаотичный.'],
      ['calm-intense', 'Спокойный, но эмоционально насыщенный.'],
      ['montage', 'Как монтаж случайных моментов.'],
      ['monotone', 'Однообразный.'],
      ['unpredictable', 'Непредсказуемый.']
    ]),
    select('texture', 'Если бы чувства имели физическую текстуру, какой бы она была?', [
      ['soft-fabric', 'Мягкая ткань.'],
      ['cold-glass', 'Холодное стекло.'],
      ['crumpled-paper', 'Смятая бумага.'],
      ['sunlight', 'Тёплый солнечный свет.'],
      ['smooth-water', 'Гладкая вода.'],
      ['fragile', 'Что-то хрупкое.']
    ]),
    select('sound', 'Как бы звучал этот день?', [
      ['distant-talk', 'Далёкие разговоры.'],
      ['rain-window', 'Дождь за окном.'],
      ['quiet-music', 'Тихая музыка.'],
      ['wind-silence', 'Ветер и тишина.'],
      ['city-noise', 'Шум большого города.'],
      ['mixed-sounds', 'Смешение разных звуков.']
    ]),
    { key: 'colors', title: 'Какими цветами ты бы описал этот день?', kind: 'colors' },
    { key: 'memory', title: 'Какой момент ты хотел бы сохранить навсегда?', kind: 'text', placeholder: 'Деталь, фраза или сцена, которая осталась с тобой…' },
    { key: 'unspoken', title: 'Было ли что-то, что ты не смог выразить словами?', kind: 'text', placeholder: 'Можно записать обрывок мысли или пропустить…' },
    select('scene', 'Если бы день был сценой из фильма, как бы она выглядела?', [
      ['silent-scene', 'Тихая сцена без диалогов.'],
      ['nostalgic-montage', 'Ностальгический монтаж.'],
      ['through-window', 'Сцена через окно.'],
      ['long-walk', 'Долгая прогулка без цели.'],
      ['chaotic-sequence', 'Хаотичная последовательность событий.'],
      ['unfinished-scene', 'Незавершённая сцена.']
    ]),
    select('chapter', 'Этот день ощущается как начало, продолжение или конец чего-то?', [
      ['beginning', 'Начало.'],
      ['continuing', 'Продолжение.'],
      ['ending', 'Конец.']
    ])
  ];

  const suggestedColors = [
    ['#293957', 'Тёмно-синий'],
    ['#7292A7', 'Дымчато-голубой'],
    ['#91A58B', 'Шалфейный'],
    ['#D0A363', 'Янтарный'],
    ['#B44C44', 'Кирпично-красный'],
    ['#BB8094', 'Пыльно-розовый'],
    ['#796B9C', 'Черничный'],
    ['#E7E1D5', 'Молочный'],
    ['#535B61', 'Графитовый'],
    ['#8B6553', 'Кофейный']
  ].map(([hex, label]) => ({ hex, label }));
  const colorMin = 2;
  const colorMax = 4;
  let instance = 0;

  const html = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const string = (value, max = 500) => typeof value === 'string' ? value.slice(0, max) : '';
  const clean = (value, max) => string(value, max).trim();
  const asHex = (value) => /^#[\da-f]{6}$/i.test(value) ? value.toUpperCase() : '';
  const defaultColorLabel = (hex) => suggestedColors.find((color) => color.hex === hex)?.label || 'Свой оттенок';

  function normalizeChoice(choice, question) {
    if (!choice || typeof choice !== 'object') return null;
    if (choice.id === 'custom') {
      const custom = clean(choice.custom ?? choice.label, 140);
      return { id: 'custom', label: custom, custom };
    }
    const known = question.choices.find(({ id }) => id === choice.id);
    return known ? { ...known } : null;
  }

  function normalizeColors(list) {
    if (!Array.isArray(list)) return [];
    const colors = [];
    for (const value of list) {
      if (colors.length === colorMax) break;
      const hex = asHex(value?.hex);
      if (!hex || colors.some((color) => color.hex === hex)) continue;
      const label = clean(value.label, 60) || defaultColorLabel(hex);
      const association = clean(value.association, 140);
      colors.push(association ? { hex, label, association } : { hex, label });
    }
    return colors;
  }

  function normalize(value) {
    const answers = {};
    for (const question of questions) {
      const raw = value?.answers?.[question.key];
      if (question.kind === 'select') answers[question.key] = normalizeChoice(raw, question);
      else if (question.kind === 'colors') answers.colors = normalizeColors(raw);
      else answers[question.key] = clean(raw, 1000);
    }
    const completed = value?.schemaVersion === 1 && value.completed === true &&
      questions.every((question) => question.kind === 'text' || !validate(question, answers));
    return { schemaVersion: 1, answers, completed };
  }

  function validate(question, answers) {
    const value = answers[question.key];
    if (question.kind === 'select' && !value) return 'Выбери вариант или напиши свой.';
    if (question.kind === 'select' && value.id === 'custom' && !value.custom?.trim()) {
      return 'Напиши свой вариант, чтобы продолжить.';
    }
    if (question.kind === 'colors' && value.length < colorMin) return 'Выбери хотя бы два цвета.';
    if (question.kind === 'text' && !value.trim()) return 'Напиши ответ или нажми «Пропустить».';
    return '';
  }

  function firstUnanswered(answers) {
    const index = questions.findIndex((question) => validate(question, answers));
    return index === -1 ? questions.length - 1 : index;
  }

  function format(value) {
    const { answers } = normalize(value);
    return questions.map((question) => {
      const answer = answers[question.key];
      let response = '';
      if (question.kind === 'colors') {
        response = answer.map(({ label, hex, association }) => association ? label + ' ' + hex + ' — ' + association : label + ' ' + hex).join(', ');
      } else if (question.kind === 'text') response = answer;
      else response = answer?.label || '';
      return response ? question.title + '\n' + response : '';
    }).filter(Boolean).join('\n\n');
  }

  function mount(host, { initial = null, onChange, onComplete, onClose } = {}) {
    if (!host || typeof host.querySelector !== 'function') throw new TypeError('AtmosphereQuiz.mount requires a host element');

    const prefix = 'atmosphere-quiz-' + ++instance;
    let state = normalize(initial);
    let step = state.completed ? 0 : firstUnanswered(state.answers);
    let draftColor = '#9A7770';
    const root = host.ownerDocument.createElement('div');
    root.className = 'quiz-root';
    host.replaceChildren(root);

    const getValue = () => normalize(state);
    const notify = () => onChange?.(getValue());
    const close = () => onClose?.(getValue());

    function choiceMarkup(question) {
      const current = state.answers[question.key];
      const marks = question.choices.concat({ id: 'custom', label: 'Свой вариант' }).map(({ id, label }) =>
        '<label class="quiz-option"><input type="radio" name="quiz-option" data-field="option" value="' + id + '"' +
        (current?.id === id ? ' checked' : '') + '><span class="quiz-option-name">' + html(label) + '</span></label>'
      );
      return '<div class="quiz-options">' + marks.join('') + '</div>' +
        '<div class="quiz-custom" data-custom-answer' + (current?.id === 'custom' ? '' : ' hidden') + '>' +
        '<label for="' + prefix + '-custom">Свой вариант</label>' +
        '<input class="quiz-input" id="' + prefix + '-custom" data-field="custom" type="text" maxlength="140"' +
        ' placeholder="Как это ощущалось для тебя?" value="' + html(current?.custom || '') + '"></div>';
    }

    function personalColorMarkup({ hex, label, association }) {
      return '<div class="quiz-color-row">' +
        '<span class="quiz-color-swatch" style="--quiz-swatch:' + hex + '" aria-hidden="true"></span>' +
        '<div class="quiz-color-edit">' +
        '<label><span>Название оттенка</span><input class="quiz-input" type="text" maxlength="60" data-field="color-label" data-hex="' +
        hex + '" value="' + html(label) + '" placeholder="' + html(defaultColorLabel(hex)) + '"></label>' +
        '<label><span>Твоя ассоциация · необязательно</span><input class="quiz-input" type="text" maxlength="140" data-field="color-association"' +
        ' data-hex="' + hex + '" value="' + html(association || '') + '" placeholder="С чем связан этот цвет?"></label></div>' +
        '<button class="quiz-secondary quiz-remove-color" type="button" data-action="remove-color" data-hex="' +
        hex + '" aria-label="Убрать ' + html(label) + '">Убрать</button></div>';
    }

    function colorsMarkup() {
      const selected = state.answers.colors;
      return '<div class="quiz-color-grid" aria-label="Предложенные цвета">' + suggestedColors.map(({ hex, label }) =>
        '<label class="quiz-color-option"><input type="checkbox" data-field="swatch" value="' +
        hex + '"' + (selected.some((color) => color.hex === hex) ? ' checked' : '') + '>' +
        '<span class="quiz-color-swatch" style="--quiz-swatch:' + hex + '" aria-hidden="true"></span><span>' + html(label) + '</span></label>'
      ).join('') + '</div>' +
      '<div class="quiz-custom quiz-color-custom"><label for="' + prefix + '-picker">Свой оттенок</label>' +
      '<input class="quiz-color-picker" id="' + prefix + '-picker" type="color" data-field="custom-color" value="' + draftColor + '">' +
      '<button class="quiz-secondary" type="button" data-action="add-color">Добавить цвет</button></div>' +
      '<div class="quiz-personal-colors" data-color-details' + (selected.length ? '' : ' hidden') + '>' +
      '<p class="quiz-hint">Назови цвета по-своему и добавь ассоциации, если хочешь.</p>' +
      selected.map(personalColorMarkup).join('') + '</div>';
    }

    function freeTextMarkup(question) {
      return '<textarea class="quiz-textarea" data-field="free" maxlength="1000" rows="5" aria-labelledby="' + prefix +
        '-title" placeholder="' + html(question.placeholder) + '">' + html(state.answers[question.key]) + '</textarea>';
    }

    function render(focus = false) {
      const question = questions[step];
      const last = step === questions.length - 1;
      const hint = question.kind === 'colors'
        ? '<p class="quiz-hint" id="' + prefix + '-hint"><span data-color-count aria-live="polite">' + state.answers.colors.length +
          ' из ' + colorMax + ' выбрано.</span> Добавь от двух до четырёх оттенков.</p>'
        : question.kind === 'text' ? '<p class="quiz-hint" id="' + prefix + '-hint">Можно оставить пустым и пропустить вопрос.</p>' : '';

      const body = question.kind === 'select' ? choiceMarkup(question) :
        question.kind === 'colors' ? colorsMarkup() : freeTextMarkup(question);
      root.innerHTML = '<form class="quiz-shell" novalidate aria-labelledby="' + prefix + '-title">' +
        '<div class="quiz-header"><span class="quiz-step">Вопрос ' + (step + 1) + ' из ' + questions.length + '</span>' +
        '<button class="quiz-close" type="button" data-action="close" aria-label="Закрыть вопросы">Закрыть</button></div>' +
        '<progress class="quiz-progress" value="' + (step + 1) + '" max="' + questions.length + '" aria-label="Прогресс опроса"></progress>' +
        '<h3 class="quiz-question" tabindex="-1" id="' + prefix + '-title">' + html(question.title) + '</h3>' +
        hint + '<div class="quiz-body" role="group" aria-labelledby="' + prefix + '-title"' +
        (hint ? ' aria-describedby="' + prefix + '-hint"' : '') + '>' + body + '</div>' +
        '<p class="quiz-error" data-quiz-error role="alert" hidden></p>' +
        '<div class="quiz-footer"><button class="quiz-secondary" type="button" data-action="back"' + (step === 0 ? ' disabled' : '') +
        '>Назад</button><div class="quiz-footer-actions">' +
        (question.kind === 'text' ? '<button class="quiz-secondary" type="button" data-action="skip">Пропустить</button>' : '') +
        '<button class="quiz-primary" type="submit">' + (last ? 'Завершить' : 'Дальше') + '</button></div></div></form>';
      if (focus) root.querySelector('.quiz-question').focus({ preventScroll: true });
    }

    function showError(message) {
      const error = root.querySelector('[data-quiz-error]');
      error.hidden = !message;
      error.textContent = message;
    }

    function updateAnswer(key, value) {
      if (JSON.stringify(state.answers[key]) === JSON.stringify(value)) return;
      state.answers[key] = value;
      state.completed = false;
      showError('');
      notify();
    }

    function moveNext(skip = false) {
      const question = questions[step];
      if (skip && question.kind === 'text') updateAnswer(question.key, '');
      const error = skip && question.kind === 'text' ? '' : validate(question, state.answers);
      if (error) {
        showError(error);
        return;
      }
      if (step < questions.length - 1) {
        step++;
        render(true);
        return;
      }
      const missing = questions.findIndex((item) => item.kind !== 'text' && validate(item, state.answers));
      if (missing !== -1) {
        step = missing;
        render(true);
        showError(validate(questions[step], state.answers));
        return;
      }
      state.completed = true;
      notify();
      onComplete?.(getValue());
    }

    function updateColorDetails() {
      const parent = root.querySelector('[data-color-details]');
      parent.hidden = state.answers.colors.length === 0;
      parent.innerHTML = '<p class="quiz-hint">Назови цвета по-своему и добавь ассоциации, если хочешь.</p>' +
        state.answers.colors.map(personalColorMarkup).join('');
      root.querySelector('[data-color-count]').textContent = state.answers.colors.length + ' из ' + colorMax + ' выбрано.';
      root.querySelectorAll('[data-field="swatch"]').forEach((input) => {
        input.checked = state.answers.colors.some((color) => color.hex === input.value);
      });
    }

    function selectColor(hex) {
      if (state.answers.colors.some((color) => color.hex === hex)) {
        showError('Этот оттенок уже есть в палитре.');
        return false;
      }
      if (state.answers.colors.length === colorMax) {
        showError('Можно выбрать до четырёх цветов. Убери один, чтобы добавить другой.');
        return false;
      }
      updateAnswer('colors', state.answers.colors.concat({ hex, label: defaultColorLabel(hex) }));
      updateColorDetails();
      return true;
    }

    function removeColor(hex) {
      updateAnswer('colors', state.answers.colors.filter((color) => color.hex !== hex));
      updateColorDetails();
    }

    function updateColorText(field, hex, value) {
      const prop = field === 'color-label' ? 'label' : 'association';
      updateAnswer('colors', state.answers.colors.map((color) => color.hex === hex ? { ...color, [prop]: value } : color));
      const button = root.querySelector('[data-action="remove-color"][data-hex="' + hex + '"]');
      if (prop === 'label' && button) button.setAttribute('aria-label', 'Убрать ' + (value.trim() || defaultColorLabel(hex)));
    }

    root.addEventListener('submit', (event) => {
      event.preventDefault();
      moveNext();
    });
    root.addEventListener('click', (event) => {
      const button = event.target.closest?.('button[data-action]');
      if (!button) return;
      const { action, hex } = button.dataset;
      if (action === 'close') close();
      else if (action === 'back' && step > 0) {
        step--;
        render(true);
      } else if (action === 'skip') moveNext(true);
      else if (action === 'add-color') {
        if (selectColor(draftColor)) root.querySelector('[data-field="color-association"][data-hex="' + draftColor + '"]')?.focus();
      } else if (action === 'remove-color') {
        removeColor(hex);
        const matchingSwatch = root.querySelector('[data-field="swatch"][value="' + hex + '"]');
        (matchingSwatch || root.querySelector('[data-action="add-color"]'))?.focus();
      }
    });
    root.addEventListener('change', (event) => {
      const input = event.target;
      const question = questions[step];
      const { field } = input.dataset;
      if (field === 'option') {
        const custom = input.value === 'custom';
        const editor = root.querySelector('[data-custom-answer]');
        editor.hidden = !custom;
        if (custom) {
          const textField = editor.querySelector('input');
          updateAnswer(question.key, { id: 'custom', label: textField.value, custom: textField.value });
          textField.focus();
        } else {
          updateAnswer(question.key, { ...question.choices.find(({ id }) => id === input.value) });
        }
      } else if (field === 'swatch') {
        if (input.checked && !selectColor(input.value)) input.checked = false;
        else if (!input.checked) removeColor(input.value);
      }
    });
    root.addEventListener('input', (event) => {
      const input = event.target;
      const { field, hex } = input.dataset;
      if (field === 'custom') updateAnswer(questions[step].key, { id: 'custom', label: input.value, custom: input.value });
      else if (field === 'free') updateAnswer(questions[step].key, input.value);
      else if (field === 'custom-color') draftColor = asHex(input.value) || draftColor;
      else if (field === 'color-label' || field === 'color-association') updateColorText(field, hex, input.value);
    });

    function setValue(value) {
      state = normalize(value);
      step = state.completed ? 0 : firstUnanswered(state.answers);
      render();
    }

    render();
    return { getValue, setValue, close };
  }

  return { mount, format };
})();

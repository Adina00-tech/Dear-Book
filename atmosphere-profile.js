/* An immediate, local reading of the answers, photos and song before model output. */
const AtmosphereProfile = (() => {
  const clamp = value => Math.max(0, Math.min(1, value));

  function copy(value, limit = 120) {
    if (typeof value !== 'string') return '';
    const clean = value.trim().replace(/\s+/gu, ' ');
    if (clean.length <= limit) return clean;
    const lastSpace = clean.lastIndexOf(' ', limit - 1);
    return clean.slice(0, lastSpace > limit * 0.65 ? lastSpace : limit - 1) + '…';
  }

  function answer(value, limit) {
    if (Array.isArray(value)) return copy(value.map(item => answer(item, 80)).filter(Boolean).join(', '), limit);
    if (value && typeof value === 'object') return copy(value.custom, limit) ||
      copy(value.label, limit) || copy(value.value, limit) || copy(value.text, limit);
    return copy(value, limit);
  }

  function clues(value) {
    if (Array.isArray(value)) return value.map(clues).join(' ');
    if (!value || typeof value !== 'object') return answer(value).toLowerCase();
    return [value.id, value.label, value.custom, value.value].filter(item => typeof item === 'string').join(' ').toLowerCase();
  }

  function quote(value) {
    return value ? '«' + value.replace(/^«|»$/gu, '').replace(/[.!?]+$/u, '') + '»' : '';
  }

  const upper = value => value.charAt(0).toUpperCase() + value.slice(1);
  const lower = value => value.charAt(0).toLowerCase() + value.slice(1);

  function rgb(hexValue) {
    const str = String(hexValue || '').trim().toLowerCase();
    if (!/^#?([\da-f]{3}|[\da-f]{6})$/u.test(str)) return null;
    const digits = str.replace(/^#/u, '');
    const six = digits.length === 3 ? [...digits].map(char => char.repeat(2)).join('') : digits;
    return {hex: '#' + six, channels: [0, 2, 4].map(i => Number.parseInt(six.slice(i, i + 2), 16))};
  }

  function colorFacts(parsed) {
    const [r, g, b] = parsed.channels.map(value => value / 255);
    const highest = Math.max(r, g, b);
    const lowest = Math.min(r, g, b);
    const difference = highest - lowest;
    const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    let raw = 0;
    if (difference) {
      if (r === highest) raw = (g - b) / difference;
      else if (g === highest) raw = (b - r) / difference + 2;
      else raw = (r - g) / difference + 4;
    }
    const hue = (60 * raw + 360) % 360;
    if (difference < 0.10) return {name: brightness < 0.42 ? 'Графитовый' : 'Светло-серый', temperature: null, role: 'нейтральное поле между цветовыми акцентами', brightness};
    if (hue < 21 || hue >= 345) return {name: 'Красноватый', temperature: 'warm', role: difference < 0.38 ? 'приглушённый акцент' : 'сильный цветовой акцент', brightness};
    if (hue < 70) return {name: brightness < 0.47 ? 'Медовый' : 'Янтарный', temperature: 'warm', role: 'тёплый участок света', brightness};
    if (hue < 167) return {name: brightness < 0.42 ? 'Лесной зелёный' : 'Мягкий зелёный', temperature: null, role: 'цветовая опора для природной фактуры', brightness};
    if (hue < 200) return {name: 'Бирюзовый', temperature: 'cool', role: 'прохладный световой акцент', brightness};
    if (hue < 258) return {name: brightness < 0.45 ? 'Глубокий синий' : 'Дымчато-синий', temperature: 'cool', role: brightness < 0.45 ? 'глубина цветового поля' : 'прохладное поле с воздухом', brightness};
    if (hue < 305) return {name: 'Фиолетовый', temperature: 'cool', role: 'связь между прохладным светом и цветными тенями', brightness};
    return {name: 'Розовато-лиловый', temperature: null, role: 'мягкий цветовой акцент', brightness};
  }

  function trait(value) {
    return {
      warm: /т[её]пл|cozy|warm|amber|янтар|огон[её]к|ламп|свеч|персик|солн|закат|золот|какао/u.test(value),
      cool: /прохлад|холод|cold|cool|синев|ледян|л[её]д|морозн|неон|glacier|тень|сумерк|снег/u.test(value),
      slow: /slow|calm|quiet|пауз|тишин|тихо|медлен|нетороп|размеренн|спокой|плавн|приглуш|засты|мягк/u.test(value),
      fast: /fast|rush|energ|chaos|сует|ускор|быстр|резк|рывк|рывок|суматох|хаос|едва успе|нес[её]т|толп|гул|гонк/u.test(value),
      soft: /soft|paper|linen|grain|мягк|бархат|бумаг|пл[её]н|матов|размыт|ворс|ткан|зерн/u.test(value),
      hard: /hard|glass|steel|metal|стекл|металл|бетон|резк|глянц|остр|отполир/u.test(value),
      open: /open|wide|air|простор|воздух|горизонт|поле|берег|под неб|безлюд/u.test(value),
      dense: /dense|crowd|толп|тесн|узк|густ|плотн|бардак|хаос|затор/u.test(value)
    };
  }

  function hasTrait(features, key, opposing) {
    return features[key] && !features[opposing];
  }

  function photoFacts(photos, result) {
    const measured = (Array.isArray(photos) ? photos : []).map(photo => photo?.signals || photo?.signal || photo)
      .filter(photo => photo && Array.isArray(photo.colors) && photo.colors.length > 0);
    const fromResult = result.palette?.[1];
    const indexed = /(?:из фото|снимка)\s+(\d+)/iu.exec(result.photoClue || fromResult?.evidence || '');
    if (!measured.length && !indexed) return null;
    const valid = measured.filter(photo => Number.isFinite(photo.brightness));
    const brightness = Number.isFinite(result.brightness) ? clamp(result.brightness)
      : valid.length ? clamp(valid.reduce((sum, photo) => sum + photo.brightness, 0) / valid.length) : null;
    const representative = measured[0]?.colors.slice().sort((a, b) => (b.weight || 0) - (a.weight || 0))[0];
    const parsed = rgb(fromResult?.hex) || rgb(representative?.hex);
    const light = brightness == null ? null : brightness < 0.34 ? 'снимки в среднем тёмные'
      : brightness > 0.66 ? 'снимки в среднем светлые' : 'средняя яркость снимков умеренная';
    const source = indexed ? 'Оттенок извлечён из снимка ' + indexed[1] + '.'
      : parsed ? 'Оттенок извлечён из палитры снимков.' : '';
    return {
      brightness, light, parsed, source,
      name: parsed ? fromResult?.name || colorFacts(parsed).name : '',
      temperature: parsed ? colorFacts(parsed).temperature : null
    };
  }

  function audioFacts(track, song) {
    const tempo = Number.isFinite(track?.tempo) ? track.tempo : Number.isFinite(song?.tempo) ? song.tempo : null;
    const energy = Number.isFinite(track?.energy) ? clamp(track.energy) : Number.isFinite(song?.energy) ? clamp(song.energy) : null;
    const tone = track?.tone || song?.tone;
    const silent = !!(track?.silent || song?.silent);
    const analyzed = !!(track?.analyzed || song?.analyzed || /анализ.*аудио/iu.test(track?.method || ''));
    if (silent) return {tempo: null, pace: 'slow', tone: 'neutral', evidence: 'В аудиофайле почти тишина.', silent};
    if (tempo == null && energy == null && !['warm', 'cool', 'neutral'].includes(tone)) return null;
    const pace = tempo != null
      ? tempo < 84 ? 'slow' : tempo >= 122 ? 'fast' : 'steady'
      : energy == null ? null : energy < 0.33 ? 'slow' : energy > 0.73 ? 'fast' : 'steady';
    const evidence = [];
    if (tempo != null && tempo > 0) evidence.push((analyzed ? 'около ' : '') + Math.round(tempo) + ' уд./мин');
    if (tone === 'warm') evidence.push('тёплая окраска звучания');
    if (tone === 'cool') evidence.push('прохладная окраска звучания');
    if (tone === 'neutral') evidence.push('ровная окраска звучания');
    if (energy != null) evidence.push(energy < 0.33 ? 'спокойная энергия' : energy > 0.73 ? 'сильные акценты' : 'умеренная энергия');
    return {
      tempo, energy, pace, tone,
      evidence: evidence.length ? (analyzed ? 'По аудиофайлу — ' : 'По параметрам трека — ') + evidence.join(', ') + '.' : '',
      silent: false
    };
  }

  function findPalette(answers, result, photo, audio, grounding) {
    const choices = Array.isArray(answers.colors) ? answers.colors : answers.colors ? [answers.colors] : [];
    const selected = [];
    const add = value => {
      if (value && !selected.some(item => item.hex === value.hex)) selected.push(value);
    };
    for (const [index, color] of choices.entries()) {
      if (selected.length >= 4) break;
      const parsed = rgb(color?.hex || color?.color || color?.value || color);
      if (!parsed) continue;
      const spec = colorFacts(parsed);
      const name = copy(color?.label, 36) || copy(color?.name, 36) || spec.name;
      const association = copy(color?.association, 112) || copy(color?.custom, 112);
      const source = association ? 'Ваша ассоциация ' + quote(association) + '.'
        : grounding.length ? 'Ваш выбор рядом с ' + grounding.map(quote).join(' и ') + '.' : 'Выбранная вами опора для палитры.';
      const meaning = association || (index === 0 ? 'Основной цвет воспоминания' : upper(spec.role));
      selected.push({hex: parsed.hex, name, meaning, evidence: source});
    }
    if (photo?.parsed) {
      const duplicate = selected.find(item => item.hex === photo.parsed.hex);
      if (duplicate) duplicate.evidence += ' Этот оттенок есть и в палитре фото.';
      else add({hex: photo.parsed.hex, name: photo.name, meaning: upper(colorFacts(photo.parsed).role), evidence: [photo.source, photo.light ? upper(photo.light) + '.' : ''].filter(Boolean).join(' ')});
    }
    if (audio) {
      const swatch = result.palette?.[2];
      const parsed = rgb(swatch?.hex);
      if (parsed) {
        const duplicate = selected.find(item => item.hex === parsed.hex);
        const evidence = audio.evidence || 'Цвет выбран по характеру звучания.';
        if (duplicate) duplicate.evidence += ' Этот же оттенок связывает палитру с песней. ' + evidence;
        else add({hex: parsed.hex, name: swatch.name || colorFacts(parsed).name, meaning: 'Цветовой акцент песни', evidence});
      }
    }
    for (const swatch of result.palette || []) {
      if (selected.length >= 3) break;
      const parsed = rgb(swatch?.hex);
      if (!parsed) continue;
      add({hex: parsed.hex, name: swatch.name || colorFacts(parsed).name, meaning: upper(colorFacts(parsed).role), evidence: 'Вспомогательный оттенок общей композиции.'});
    }
    return selected.slice(0, 6);
  }

  function build({quiz, text, result = {}, track, song, photos} = {}) {
    const answers = quiz?.answers || {};
    const view = {
      place: answer(answers.place, 70),
      weather: answer(answers.weather, 70),
      scene: answer(answers.scene, 80),
      rhythm: answer(answers.rhythm, 70),
      texture: answer(answers.texture, 70),
      sound: answer(answers.sound, 70),
      chapter: answer(answers.chapter, 85),
      memory: answer(answers.memory, 135),
      unspoken: answer(answers.unspoken, 125)
    };
    const spatial = [view.place, view.scene].filter((value, i, all) => value && all.indexOf(value) === i);
    const setting = spatial.length ? spatial.map(quote).join(' и ') : '';
    const photo = photoFacts(photos, result);
    const audio = audioFacts(track, song);
    const locus = trait([clues(answers.place), clues(answers.scene), clues(answers.weather)].join(' '));
    const pulse = trait(clues(answers.rhythm));
    const ambient = trait(clues(answers.sound));
    const surface = trait(clues(answers.texture));
    const palette = findPalette(answers, result, photo, audio, [view.scene || view.place, view.texture].filter(Boolean));
    const main = palette[0];
    const colorChoices = [answers.colors].flat().filter(Boolean);
    const picked = colorChoices.map(color => rgb(color?.hex || color?.color || color?.value || color)).find(Boolean);
    const pickedTemp = picked && colorFacts(picked).temperature;
    const connections = [];
    const tensions = [];

    if (setting || view.weather || photo?.light) {
      const frames = [];
      if (setting) frames.push((spatial.length > 1 ? 'Пространство складывается из образов ' : 'Пространство задаёт образ ') + setting + '.');
      if (view.weather) frames.push('Световой слой опирается на образ ' + quote(view.weather) + '.');
      if (photo?.light) frames.push(upper(photo.light) + '.');
      connections.push({title: 'Место и свет', detail: frames.join(' ')});
    }
    if (view.rhythm || view.sound || audio) {
      const flow = [];
      if (view.rhythm && view.sound) flow.push('Вы связали ритм ' + quote(view.rhythm) + ' со звуком ' + quote(view.sound) + '.');
      else if (view.rhythm || view.sound) flow.push('Слышимая опора дня — ' + quote(view.rhythm || view.sound) + '.');
      if (audio?.evidence) flow.push(audio.evidence);
      connections.push({title: 'Ритм и звук', detail: flow.join(' ')});
    }
    if (view.texture || main) {
      const material = [];
      if (view.texture) material.push('Фактура ' + quote(view.texture) + ' остаётся частью образа.');
      if (main && view.texture) material.push('Рядом с ней ' + lower(main.name) + ' работает как основное цветовое поле.');
      else if (main) material.push('Основное цветовое поле задаёт ' + lower(main.name) + '.');
      connections.push({title: 'Цвет и фактура', detail: material.join(' ')});
    }
    if (view.memory || view.unspoken || view.chapter) {
      const anchor = [];
      if (view.memory) anchor.push('Мудборд держится на детали ' + quote(view.memory) + '.');
      if (view.unspoken) anchor.push('Невысказанное вы назвали так — ' + quote(view.unspoken) + '.');
      if (!anchor.length && view.chapter) anchor.push('Вы озаглавили этот эпизод ' + quote(view.chapter) + '.');
      connections.push({title: 'Что остаётся в памяти', detail: anchor.join(' ')});
    }

    if (view.rhythm && audio?.pace === 'fast' && hasTrait(pulse, 'slow', 'fast')) {
      tensions.push({title: 'Размеренный день и быстрый трек', detail: 'Ритм дня ' + quote(view.rhythm) + ' оставляет место для пауз. ' + audio.evidence + ' Музыкальные акценты могут дать кадрам движение.'});
    } else if (view.rhythm && audio?.pace === 'slow' && hasTrait(pulse, 'fast', 'slow')) {
      tensions.push({title: 'Быстрый день и размеренная песня', detail: 'В ответе ' + quote(view.rhythm) + ' есть движение. ' + audio.evidence + ' Мудборд может удержать оба темпа, если кадры собраны плотно и сменяются размеренно.'});
    }
    const calmLight = (locus.warm && !locus.cool) || (locus.open && !locus.dense) || (locus.slow && !locus.fast);
    if (calmLight && hasTrait(pulse, 'fast', 'slow') && setting) {
      tensions.push({title: 'Место и ритм звучат по-разному', detail: 'Образ ' + quote(view.scene || view.place) + ' задаёт свет и пространство, а ритм ' + quote(view.rhythm) + ' добавляет движение. Можно дать кадру время раскрыться между короткими перебивками.'});
    }
    if (pickedTemp && photo?.temperature && pickedTemp !== photo.temperature) {
      tensions.push({title: 'Два цвета с разной температурой', detail: main.name + ' — ваш выбор. В снимках есть ' + lower(photo.name) + '. Соседство тёплого и прохладного помогает удержать в мудборде и личную ассоциацию, и цвет реального кадра.'});
    }
    if (view.texture && view.sound && hasTrait(surface, 'soft', 'hard') && hasTrait(ambient, 'fast', 'slow')) {
      tensions.push({title: 'Мягкая поверхность, резкий звук', detail: 'Фактура ' + quote(view.texture) + ' задаёт мягкий фон, а ' + quote(view.sound) + ' может стать коротким заметным акцентом.'});
    }

    const visualParts = [];
    if (view.scene) visualParts.push('Главный образ — ' + quote(view.scene) + '.');
    else if (view.place) visualParts.push('Главный образ — ' + quote(view.place) + '.');
    if (view.weather) visualParts.push('Свет дополняет образ ' + quote(view.weather) + '.');
    if (main && view.texture) visualParts.push('Цветовую опору ' + quote(main.name) + ' дополняет фактура ' + quote(view.texture) + '.');
    else if (main || view.texture) visualParts.push(main ? 'Цветовая опора — ' + lower(main.name) + '.' : 'Основная фактура — ' + quote(view.texture) + '.');
    if (photo?.light) visualParts.push(upper(photo.light) + '.');
    if (hasTrait(locus, 'open', 'dense')) visualParts.push('Между снимками есть место для широких полей.');
    if (hasTrait(locus, 'dense', 'open')) visualParts.push('Снимки можно собрать плотнее и разделить узкими промежутками.');
    const visual = visualParts.join(' ');

    const soundParts = [];
    if (view.sound) soundParts.push('Звук, который вы запомнили, — ' + quote(view.sound) + '.');
    if (view.rhythm) soundParts.push('Ритм дня вы назвали ' + quote(view.rhythm) + '.');
    if (audio?.evidence) soundParts.push(audio.evidence);
    const sound = soundParts.join(' ');

    const headline = view.chapter || result.title || (view.scene ? 'Воспоминание через ' + quote(view.scene) : 'Атмосфера вашего дня');
    const overview = [];
    if (view.memory) overview.push('В центре воспоминания — ' + quote(view.memory) + '.');
    else if (setting && view.weather) overview.push('Вместе работают образы ' + quote(view.scene || view.place) + ' и ' + quote(view.weather) + '.');
    else if (setting) overview.push('Воспоминание начинается с образа ' + setting + '.');
    else if (copy(text, 88)) overview.push('Запись держится на фразе ' + quote(copy(text, 88)) + '.');
    if (tensions[0]?.title === 'Размеренный день и быстрый трек') overview.push('Песня добавляет движение к вашему размеренному ритму.');
    else if (tensions[0]?.title === 'Быстрый день и размеренная песня') overview.push('Песня оставляет паузы внутри быстрого дня.');
    else if (setting && view.rhythm && main) overview.push('Ритм ' + quote(view.rhythm) + ' и ' + lower(main.name) + ' связывают эти детали.');
    else if (main && view.texture) overview.push('В палитре встречаются ' + quote(main.name) + ' и фактура ' + quote(view.texture) + '.');
    const summary = overview.join(' ') || copy(result.description, 250) || 'Свет, звук и цвет складываются из ваших ответов.';
    const searchText = [
      hasTrait(locus, 'warm', 'cool') ? 'warm available light' : hasTrait(locus, 'cool', 'warm') ? 'cool dusk light' : 'soft natural light',
      hasTrait(locus, 'open', 'dense') ? 'wide open space' : hasTrait(locus, 'dense', 'open') ? 'layered urban space' : 'intimate framing',
      hasTrait(surface, 'soft', 'hard') ? 'paper grain texture' : hasTrait(surface, 'hard', 'soft') ? 'glass surface reflections' : 'subtle texture'
    ].join(' ');
    return {headline, summary, connections, tensions: tensions.slice(0, 3), palette, visual, sound, searchText};
  }

  return {build};
})();

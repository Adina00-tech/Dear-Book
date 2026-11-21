/* ArtTech color diary: photo palette, sound signals, and visual rules. */
const Engine = (() => {
  const words = value => String(value || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const mix = (first, second, amount) => first.map((value, i) => value + (second[i] - value) * amount);
  const fromHex = value => [1, 3, 5].map(i => Number.parseInt(value.slice(i, i + 2), 16));
  const toHex = rgb => '#' + rgb.map(value => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0')).join('');
  const luminance = rgb => (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;

  const visualModes = {
    still: {image: 'Принцип пустого пространства в японской графике', technique: 'Широкие поля, глубокие полутона и длинные паузы'},
    active: {image: 'Контраст и диагонали абстрактной геометрической композиции', technique: 'Контрастные акценты и короткие переходы'},
    soft: {image: 'Плёночная фотография и рассеянный свет импрессионизма', technique: 'Мягкие границы светового пятна и ровный ритм'},
    natural: {image: 'Воздушная композиция пейзажной фотографии и природные фактуры', technique: 'Широкие поля и мягкие края снимков'},
    plain: {image: 'Многослойный бумажный коллаж и плёночная фотография', technique: 'Свободная композиция с цветами из выбранных материалов'}
  };

  function answerText(value) {
    return typeof value === 'string' ? value : String(value?.custom || value?.label || value?.value || '');
  }

  function userColors(quiz) {
    const list = Array.isArray(quiz?.answers?.colors) ? quiz.answers.colors : [];
    return list.map(entry => ({hex: typeof entry === 'string' ? entry : entry?.hex, label: entry?.label, association: entry?.association}))
      .filter(entry => /^#[0-9a-f]{6}$/i.test(entry.hex || ''));
  }

  const titleMotifs = [
    ['осен', 'лист', 'Осенние листья'],
    ['жёлт', 'лист', 'Жёлтые листья'],
    ['желт', 'лист', 'Жёлтые листья'],
    ['движ', 'дорог', 'Дорога дальше'],
    ['ноч', 'офис', 'Ночь в офисе'],
    ['осен', 'парк', 'Осенний парк'],
    ['утр', 'парк', 'Утро в парке'],
    ['дожд', 'окн', 'Дождь за окном'],
    ['дожд', 'город', 'Город под дождём'],
    ['сдач', 'проект', 'Сдача проекта'],
    ['вечер', 'перепис', 'Вечерняя переписка'],
    ['дн', 'рождени', 'День рождения'],
    ['туман', 'гор', 'Горы в тумане'],
    ['рассвет', '', 'Свет рассвета'],
    ['какао', '', 'Кружка какао'],
    ['кофе', '', 'Кофе в деталях'],
    ['разговар', '', 'Долгий разговор'],
    ['разговор', '', 'Долгий разговор'],
    ['дожд', '', 'День под дождём'],
    ['озер', '', 'У озера'],
    ['озёр', '', 'У озера'],
    ['пруд', '', 'Возле пруда'],
    ['мор', '', 'Шум моря'],
    ['парк', '', 'Прогулка в парке'],
    ['лес', '', 'Дорога через лес'],
    ['танц', '', 'Круг танца'],
    ['поезд', '', 'Окно поезда'],
    ['дедлайн', '', 'Близкий дедлайн'],
    ['отправ', '', 'Последняя отправка'],
    ['офис', '', 'Работа в офисе'],
    ['снег', '', 'Под снегом'],
    ['ветер', '', 'Линия ветра'],
    ['побед', '', 'Момент победы'],
    ['уех', '', 'Момент отъезда'],
    ['улыб', '', 'След улыбки'],
    ['тих', '', 'Минута тишины'],
    ['школ', '', 'После школы'],
    ['чаю', '', 'Кружка чая'],
    ['чай', '', 'Чашка чая'],
    ['кухн', '', 'Свет на кухне'],
    ['закат', '', 'Вечерний закат'],
    ['друг', '', 'Встреча с друзьями']
  ];

  function pickTitle(body, tokens, mood) {
    const match = term => tokens.some(word => word.startsWith(term));
    const candidates = titleMotifs
      .filter(([first, second]) => match(first) && (!second || match(second)))
      .sort((a, b) => Number(Boolean(b[1])) - Number(Boolean(a[1])));
    if (candidates.length) {
      const [head] = candidates;
      if (head[2] === 'Ночь в офисе' && match('дедлайн')) return 'Ночь в офисе перед дедлайном';
      const secondary = candidates.find(candidate => (
        candidate[0] !== head[0] && candidate[1] !== head[0] &&
        candidate[0] !== head[1] && (!head[1] || candidate[1] !== head[1])
      ));
      if (secondary && words(head[2] + ' и ' + secondary[2]).length <= 7) {
        const connector = /^(в|на|за|возле|у|под|после|через) /i.test(secondary[2]) ? ' ' : ' и ';
        return head[2] + connector + secondary[2].toLowerCase();
      }
      if (words(head[2]).length >= 3) return head[2];
      return (head[2] + ' этого дня');
    }
    const clauses = body.split(/[.!?…;\r\n]+/).map(clause => clause.trim()).filter(Boolean);
    const meaningful = clauses.find(clause => words(clause).length > 2) || clauses[0] || '';
    const excerpt = (meaningful.match(/[\p{L}\p{N}]+/gu) || []).slice(0, 6).join(' ');
    const normalized = words(excerpt).length >= 3 ? excerpt : [excerpt, mood.toLowerCase(), 'дня'].filter(Boolean).join(' · ');
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  function association(rgb) {
    const [r, g, b] = rgb.map(value => value / 255);
    const high = Math.max(r, g, b);
    const low = Math.min(r, g, b);
    const range = high - low;
    const level = (high + low) / 2;
    let hue = 0;
    if (range > 0) {
      if (high === r) hue = 60 * ((g - b) / range);
      if (high === g) hue = 60 * (2 + (b - r) / range);
      if (high === b) hue = 60 * (4 + (r - g) / range);
      if (hue < 0) hue += 360;
    }
    if (range < 0.12) {
      if (level > 0.69) return {name: 'Серебристый', meaning: 'воздух и мягкий свет'};
      if (level > 0.44 && b > r + 0.02) return {name: 'Голубовато-серый', meaning: 'прохладу и приглушённый свет'};
      return {name: 'Графитовый', meaning: 'сдержанность и глубину'};
    }
    if (hue < 17 || hue >= 340) {
      return {name: level < 0.42 ? 'Вишнёвый' : 'Коралловый', meaning: 'выразительный цветовой акцент'};
    }
    if (hue < 47) {
      return {name: level < 0.45 ? 'Медный' : level < 0.63 ? 'Янтарный' : 'Персиковый', meaning: 'тёплый свет и мягкость'};
    }
    if (hue < 72) return {name: 'Золотистый', meaning: 'солнечный свет и ясность'};
    if (hue < 158) {
      return {name: level < 0.43 ? 'Лесной зелёный' : 'Шалфейный', meaning: 'природную свежесть'};
    }
    if (hue < 194) return {name: 'Бирюзовый', meaning: 'прохладу и ясность'};
    if (hue < 234) {
      return level < 0.52
        ? {name: 'Глубокий синий', meaning: 'прохладу и глубину теней'}
        : {name: 'Дымчато-голубой', meaning: 'прохладный воздух и рассеянный свет'};
    }
    if (hue < 255) return {name: level < 0.50 ? 'Сине-фиолетовый' : 'Сумеречно-синий', meaning: 'прохладу и глубину'};
    if (hue >= 302) return {name: level < 0.48 ? 'Сливовый' : 'Розово-лиловый', meaning: 'тепло и мягкий акцент'};
    return {name: level < 0.52 ? 'Черничный' : 'Сиреневый', meaning: 'сумеречный полутон'};
  }

  function makeSwatch(rgb, evidence) {
    return {hex: toHex(rgb), ...association(rgb), evidence};
  }

  function photoColors(image) {
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!(width > 0 && height > 0)) return {colors: [], brightness: 0.5};
    const scale = 80 / Math.max(width, height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d', {willReadFrequently: true});
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const bytes = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const bins = new Map();
    let light = 0;
    let pixels = 0;
    for (let i = 0; i < bytes.length; i += 4) {
      if (bytes[i + 3] < 128) continue;
      const rgb = [bytes[i], bytes[i + 1], bytes[i + 2]];
      const key = rgb.map(value => Math.floor(value / 48)).join(',');
      const bucket = bins.get(key) || {total: [0, 0, 0], count: 0};
      bucket.total.forEach((value, channel) => { bucket.total[channel] = value + rgb[channel]; });
      bucket.count += 1;
      bins.set(key, bucket);
      light += luminance(rgb);
      pixels += 1;
    }
    const colors = [...bins.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 7)
      .map(bucket => ({hex: toHex(bucket.total.map(value => value / bucket.count)), weight: bucket.count / pixels}));
    return {colors, brightness: pixels > 0 ? light / pixels : 0.5};
  }

  async function inspectAudio(arrayBuffer) {
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) throw new Error('Этот браузер не может проанализировать аудиофайл.');
    const context = new Audio();
    try {
      const buffer = await context.decodeAudioData(arrayBuffer.slice(0));
      const samples = buffer.getChannelData(0);
      const max = Math.min(samples.length, buffer.sampleRate * 75);
      const stride = Math.max(1, Math.round(buffer.sampleRate / 11025));
      const step = Math.floor(buffer.sampleRate / 25);
      const windows = [];
      let power = 0;
      let highPower = 0;
      let sampleCount = 0;
      for (let start = 0; start + step <= max; start += step) {
        let sum = 0;
        for (let i = start + stride; i < start + step; i += stride) {
          const value = samples[i];
          sum += value * value;
          highPower += (value - samples[i - stride]) ** 2;
          sampleCount += 1;
        }
        power += sum;
        windows.push(Math.sqrt(sum * stride / step));
      }
      if (sampleCount === 0 || power / sampleCount < 1e-7) {
        return {energy: 0.18, tempo: null, tone: 'neutral', method: 'В файле почти нет слышимого сигнала'};
      }
      const changes = windows.slice(1).map((value, i) => Math.max(0, value - windows[i]));
      const mean = changes.reduce((sum, value) => sum + value, 0) / Math.max(1, changes.length);
      const centered = changes.map(value => value - mean);
      const strength = centered.reduce((sum, value) => sum + value * value, 0);
      let best = 0;
      let period = 0;
      if (centered.length > 125 && strength > 0) {
        for (let lag = 8; lag <= 27; lag += 1) {
          let score = 0;
          for (let i = lag; i < centered.length; i += 1) score += centered[i] * centered[i - lag];
          score /= strength;
          if (score > best + 0.005) {
            best = score;
            period = lag;
          }
        }
      }
      const tempo = best >= 0.24 ? Math.round(1500 / period) : null;
      const level = Math.sqrt(power / sampleCount);
      const motion = clamp(mean / Math.max(0.004, level) * 6);
      const loudness = clamp(level * 2.3);
      const rate = tempo == null ? motion : clamp((tempo - 55) / 95);
      const energy = clamp(0.09 + loudness * 0.40 + motion * 0.30 + rate * 0.22);
      const brightness = highPower / power;
      return {tempo, tone: brightness > 0.27 ? 'cool' : brightness < 0.09 ? 'warm' : 'neutral', energy, method: 'Анализ аудиофайла: динамика и яркость звучания'};
    } finally {
      if (context.state !== 'closed') await context.close();
    }
  }

  function analyze({text: rawText, photos = [], track: rawTrack, song: rawSong, quiz} = {}) {
    const text = String(rawText || '').trim();
    const tokens = words(text);
    const track = rawTrack || {};
    const song = rawSong || {};
    const tempo = Number.isFinite(track.tempo) && track.tempo > 0 ? track.tempo : Number.isFinite(song.tempo) && song.tempo > 0 ? song.tempo : null;
    const suppliedEnergy = Number.isFinite(track.energy) ? track.energy : Number.isFinite(song.energy) ? song.energy : null;
    const tone = ['warm', 'cool', 'neutral'].includes(track.tone) ? track.tone
      : ['warm', 'cool', 'neutral'].includes(song.tone) ? song.tone : null;
    const silent = Boolean(track.silent || song.silent);
    const hasTrack = Boolean(tempo != null || suppliedEnergy != null || tone || silent);
    const energy = clamp(suppliedEnergy ?? (tempo == null ? 0.44 : (tempo - 50) / 115));
    const fastest = clamp(tempo != null ? (tempo - 45) / 125 : energy);
    const photoList = Array.isArray(photos) ? photos : [];
    const photoSignals = photoList.flatMap((photo, index) => (Array.isArray(photo?.colors) ? photo.colors : [])
      .filter(color => /^#[0-9a-f]{6}$/i.test(color?.hex || ''))
      .map(color => ({index, weight: Number.isFinite(color.weight) && color.weight > 0 ? color.weight : 1, rgb: fromHex(color.hex)})));
    const values = [...new Set(photoSignals.map(color => color.index))]
      .map(index => photoList[index].brightness).filter(Number.isFinite);
    const sourcePhoto = photoSignals.map(color => ({...color, score: Math.sqrt(color.weight) *
      (0.68 + (Math.max(...color.rgb) - Math.min(...color.rgb)) / 300) *
      (1 - Math.abs(luminance(color.rgb) - 0.50) * 0.45)}))
      .sort((a, b) => b.score - a.score)[0];
    const brightness = values.length ? clamp(values.reduce((sum, value) => sum + value, 0) / values.length)
      : sourcePhoto ? luminance(sourcePhoto.rgb) : 0.5;
    const choices = userColors(quiz);
    const selected = choices[0];
    const answers = quiz?.answers || {};
    const rhythmWords = answerText(answers.rhythm).toLowerCase();
    const slowAnswer = /медлен|размерен|спокой|нетороп|длинн.{1,6}пауз/iu.test(rhythmWords) && !/быстр|хаот|резк/iu.test(rhythmWords);
    const fastAnswer = /быстр|хаот|резк|рывк|сует/iu.test(rhythmWords) && !slowAnswer;
    const quietText = /\bquiet\b|тишин|без диалог|молч|медлен|спокой/iu.test(text);
    const quickText = /\bfast\b|спеш|сроч|резк|рывк|хаос|быстр|галоп/iu.test(text);
    const nature = /лес|парк|пруд|оз[её]р|мор[еяю]|берег|луг|горы/iu.test(text + ' ' + answerText(answers.place));
    const softScene = /рассеян|мягк|туман|запот|приглуш/iu.test(text + ' ' + answerText(answers.texture));
    const warmMoment = /(?:^|[^\p{L}])(?:кофе|какао|кофейн\p{L}*|коричнев\p{L}*|медн\p{L}*|янтарн\p{L}*|охрист\p{L}*)(?=$|[^\p{L}])/iu.exec(text);
    const neutral = [125, 137, 151];
    const warm = [163, 112, 76];
    const base = selected ? fromHex(selected.hex) : sourcePhoto?.rgb || (warmMoment ? warm : neutral);
    const storyColor = selected ? base
      : sourcePhoto ? mix(base, warmMoment ? warm : [175, 187, 202], warmMoment ? 0.23 : 0.18)
        : base;
    const photoAccent = sourcePhoto?.rgb || mix(storyColor, [156, 165, 176], 0.26);
    const measuredTarget = tone === 'cool' ? [105, 146, 193]
      : tone === 'warm' ? [184, 172, 180] : [133, 145, 164];
    const sonic = hasTrack ? mix(storyColor, measuredTarget, tone === 'cool' ? 0.40 : 0.24 + 0.10 * energy)
      : mix(storyColor, [119, 139, 159], 0.22);
    const perceivedRhythm = slowAnswer ? Math.min(0.37, fastest * 0.63 + 0.10)
      : fastAnswer ? Math.max(0.60, fastest * 0.58 + 0.35) : fastest;
    const rhythm = Math.round((6.0 - 3.5 * perceivedRhythm - 0.55 * energy) * 10) / 10;
    const contrast = clamp(0.16 + 0.48 * energy + 0.20 * Math.abs(brightness - 0.5));
    const visibleMood = fastAnswer || quickText || (hasTrack && perceivedRhythm > 0.66) ? 'Быстрый ритм'
      : slowAnswer || quietText ? 'Размеренный ритм'
        : sourcePhoto && brightness > 0.66 ? 'Светлые кадры'
          : sourcePhoto && brightness < 0.40 ? 'Глубокие полутона'
            : softScene ? 'Рассеянный свет' : nature ? 'Простор и детали' : 'День в деталях';
    const profile = fastAnswer || quickText || (hasTrack && perceivedRhythm > 0.66) ? visualModes.active
      : slowAnswer || quietText ? visualModes.still : softScene ? visualModes.soft
        : nature ? visualModes.natural : visualModes.plain;
    const feelings = typeof FeelingNarrative !== 'undefined' ? FeelingNarrative.context({text, quiz}) : null;
    const mood = feelings?.label || visibleMood;
    const storyline = tokens.length ? pickTitle(text, tokens, visibleMood) : 'Новая страница дневника';
    const textClue = selected
      ? 'Оттенок выбран в анкете' + (selected.label ? ' — «' + selected.label + '»' : '') + '.'
      : warmMoment && !sourcePhoto ? 'В записи есть «' + warmMoment[0].trim().replace(/^[^\p{L}]+/u, '') + '».'
        : sourcePhoto ? 'Основной цвет связан с палитрой ваших снимков.'
          : 'Нейтральный цвет оставляет место деталям записи.';
    const photoLight = brightness < 0.35 ? 'Снимки в среднем тёмные.' : brightness > 0.67 ? 'Снимки в среднем светлые.' : 'Средняя яркость снимков умеренная.';
    const photoClue = sourcePhoto ? 'Оттенок выделен из фото ' + (sourcePhoto.index + 1) + '. ' + photoLight
      : photoList.length ? 'На фото нет непрозрачного цвета для анализа.' : 'Фотографии добавят оттенок света.';
    const musicPace = silent ? 'Почти тишина' : tempo != null ? 'Темп около ' + Math.round(tempo) + ' уд./мин'
      : suppliedEnergy != null ? (fastest > 0.62 ? 'Быстрое движение' : fastest < 0.32 ? 'Медленное движение' : 'Ровное движение')
        : null;
    const soundTone = tone === 'warm' ? 'мягкая окраска' : tone === 'cool' ? 'ясная окраска' : tone === 'neutral' ? 'ровная окраска' : null;
    const musicClue = hasTrack
      ? [musicPace, soundTone].filter(Boolean).join(' · ') + '.'
      : track.url ? 'У песни есть ссылка. Темп и окраска пока не заданы.' : 'Музыка добавит цветовой акцент и ритм.';
    const palette = [makeSwatch(storyColor, textClue), makeSwatch(photoAccent, photoClue), makeSwatch(sonic, musicClue)];
    if (selected?.label) palette[0].name = selected.label;
    if (selected?.association) palette[0].meaning = selected.association;
    else if (feelings?.label) palette[0].meaning = feelings.label.toLowerCase();
    const notes = [];
    if (feelings?.label && feelings.quote) notes.push('В словах «' + feelings.quote + '» звучит ' + feelings.label.toLowerCase() + '.');
    else if (tokens.length) notes.push('Воспоминание «' + storyline + '» собирается из деталей записи.');
    if (selected) notes.push('Начало палитре даёт выбранный вами оттенок.');
    if (sourcePhoto) notes.push('Оттенок из снимка добавляет ' + palette[1].meaning + '.');
    if (hasTrack) notes.push('Характер звучания влияет на ритм смены кадров и цветовой акцент.');
    return {
      title: storyline, description: notes.join(' ') || 'Здесь появится цветовая история вашего дня.',
      palette, paletteVersion: 2, mood, art: profile.image, technique: profile.technique,
      rhythm, brightness, energy, contrast, textClue, photoClue, musicClue,
      musicPace: musicPace || 'Ритм не задан', soundTone: soundTone || 'Окраска не задана',
      paper: toHex(mix([243, 246, 249], storyColor, 0.12 + (1 - brightness) * 0.09)),
      ink: toHex(mix([27, 36, 49], storyColor, 0.16))
    };
  }

  return {analyze, photoColors, inspectAudio, association};
})();

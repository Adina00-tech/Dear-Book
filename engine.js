/* ArtTech color diary: photo palette, sound signals, and visual rules. */
const Engine = (() => {
  const words = value => String(value || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const mix = (first, second, amount) => first.map((value, i) => value + (second[i] - value) * amount);
  const fromHex = value => [1, 3, 5].map(i => Number.parseInt(value.slice(i, i + 2), 16));
  const toHex = rgb => '#' + rgb.map(value => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0')).join('');
  const luminance = rgb => (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;

  const profiles = [
    {
      mood: 'Тёплая тишина', hex: '#ba743d', technique: 'Мягкий свет, зерно и плавные переходы',
      image: 'Плёночная фотография и мягкий рассеянный свет импрессионизма',
      cue: 'тепл уют осен лист какао чай вечер солнц закат близ обня обним камин свеч нежн разговор бабуш дедуш домой',
      energy: 0.31
    },
    {
      mood: 'Спокойная грусть', hex: '#344568', technique: 'Воздух вокруг снимка и глубокие тени',
      image: 'Принцип пустого пространства в японской графике',
      cue: 'груст тоска тоск одинок дождя дожд пасмур син туман тих молч пуст скуча прощ одиноч холод медлен вспомнил ностальг',
      energy: 0.20
    },
    {
      mood: 'Яркий импульс', hex: '#bd4c42', technique: 'Контрастные акценты и короткие переходы',
      image: 'Контраст и диагонали абстрактной геометрической композиции',
      cue: 'спеш сроч горел волн злил нерв дедлайн сдал сдач сдава быстр устал хаос громк ночь офис ночев беж гон финиш адренал',
      energy: 0.79
    },
    {
      mood: 'Лёгкая радость', hex: '#c79227', technique: 'Светлая бумага, крупный снимок и упругий ритм',
      image: 'Многослойный бумажный коллаж и солнечная плёночная фотография',
      cue: 'смеш сме смея улыб рад весёл весел праздник днём рождени побед танц счаст концерт поехал праздник весен летн пляж',
      energy: 0.64
    },
    {
      mood: 'Свежесть и простор', hex: '#4f745c', technique: 'Широкие поля и мягкие края снимков',
      image: 'Воздушная композиция пейзажной фотографии и природные фактуры',
      cue: 'лес трав парк сад горы горн озер озёр рек мор берег водопад простор свеж озелен облак утрен рассвет цветы цветок',
      energy: 0.39
    },
    {
      mood: 'Сумеречная задумчивость', hex: '#745986', technique: 'Мягкие наложения и сумеречные полутона',
      image: 'Цветовые поля и наложение полупрозрачных плоскостей',
      cue: 'сумерк сирен мечт звезд звёзд спутн луны луна полноч неон удив загад размыш горо задум фантаз',
      energy: 0.44
    }
  ].map(profile => ({...profile, terms: profile.cue.split(' ')}));

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
    ['разговар', '', 'Долгий разговор'],
    ['разговор', '', 'Долгий разговор'],
    ['дожд', '', 'Дождь над городом'],
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
      if (level > 0.69) return {name: 'Серебристый', meaning: 'пауза, воздух и мягкий свет'};
      if (level > 0.44 && b > r + 0.02) return {name: 'Голубовато-серый', meaning: 'лёгкая отстранённость, прохлада и спокойный ритм'};
      return {name: 'Графитовый', meaning: 'сдержанность, тишина и собранность'};
    }
    if (hue < 17 || hue >= 340) {
      return {name: level < 0.42 ? 'Вишнёвый' : 'Коралловый', meaning: 'волнение, живой импульс и энергия'};
    }
    if (hue < 47) {
      return {name: level < 0.45 ? 'Медный' : level < 0.63 ? 'Янтарный' : 'Персиковый', meaning: 'уют, близость и сохраняющееся тепло'};
    }
    if (hue < 72) return {name: 'Золотистый', meaning: 'солнечный свет, открытость и лёгкая радость'};
    if (hue < 158) {
      return {name: level < 0.43 ? 'Лесной зелёный' : 'Шалфейный', meaning: 'природа, свежесть и ощущение простора'};
    }
    if (hue < 194) return {name: 'Бирюзовый', meaning: 'прохлада, ясность и свободное дыхание'};
    if (hue < 234) {
      return level < 0.52
        ? {name: 'Глубокий синий', meaning: 'спокойствие, лёгкая грусть и вечерняя тишина'}
        : {name: 'Дымчато-голубой', meaning: 'прохладный воздух, тишина и созерцание'};
    }
    if (hue < 255) return {name: level < 0.50 ? 'Сине-фиолетовый' : 'Сумеречно-синий', meaning: 'вечерняя прохлада, сосредоточенность и глубина'};
    if (hue >= 302) return {name: level < 0.48 ? 'Сливовый' : 'Розово-лиловый', meaning: 'тепло, фантазия и живой акцент'};
    return {name: level < 0.52 ? 'Черничный' : 'Сиреневый', meaning: 'сумерки, мечтательность и задумчивость'};
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

  function analyze({text: rawText, photos = [], track: rawTrack} = {}) {
    const text = String(rawText || '').trim();
    const tokens = words(text);
    const track = rawTrack || {};
    const hasTrack = Boolean(track.title || track.method || track.url || track.tone ||
      Number.isFinite(track.tempo) || Number.isFinite(track.energy));
    const energy = clamp(Number.isFinite(track.energy) ? track.energy : 0.47);
    const fastest = clamp(Number.isFinite(track.tempo) ? (track.tempo - 45) / 125 : energy);
    const usefulPhotos = photos.filter(photo => Array.isArray(photo.colors) && photo.colors.length > 0);
    const brightness = usefulPhotos.length
      ? usefulPhotos.reduce((sum, photo) => sum + (Number.isFinite(photo.brightness) ? photo.brightness : 0.5), 0) / usefulPhotos.length
      : 0.5;
    const photoSignals = usefulPhotos.flatMap((photo, i) => photo.colors
      .filter(color => /^#[0-9a-f]{6}$/i.test(color.hex))
      .map(color => ({...color, index: i, rgb: fromHex(color.hex)})));
    const strongest = photoSignals.sort((a, b) => b.weight - a.weight)[0];
    const textured = photoSignals
      .map(color => ({...color, score: Math.sqrt(Math.max(0, color.weight)) *
        (0.27 + (Math.max(...color.rgb) - Math.min(...color.rgb)) / 130) *
        (1 - Math.abs(luminance(color.rgb) - 0.47))}))
      .sort((a, b) => b.score - a.score)[0];

    const ranked = profiles.map(profile => {
      const matched = [...new Set(tokens.filter(token =>
        profile.terms.some(term => token.startsWith(term))))];
      const distance = Math.abs(energy - profile.energy);
      return {profile, matched, score: matched.length * 1.25 + (1 - distance) * 1.2};
    }).sort((a, b) => b.score - a.score);
    const theme = ranked[0];
    const {profile, matched} = theme;
    const storyline = tokens.length ? pickTitle(text, tokens, profile.mood) : 'Новая страница дневника';
    const target = fromHex(profile.hex);
    const photoAccent = textured?.rgb || strongest?.rgb || [141, 151, 160];
    const storyColor = mix(target, photoAccent, 0.16 + clamp(0.58 - brightness, 0, 0.27));
    const contrast = 0.16 + 0.54 * energy + 0.20 * Math.abs(brightness - 0.5);
    const musicTone = track.tone === 'cool' ? [65, 100, 177]
      : track.tone === 'warm' ? [229, 176, 81] : [131, 133, 169];
    const musicTarget = mix(musicTone, [251, 245, 232], (1 - energy) * 0.55);
    const sonic = mix(storyColor, musicTarget, 0.56 + energy * 0.25);
    const rhythm = Math.round((6.0 - 3.5 * fastest - 0.55 * energy) * 10) / 10;
    const textClue = matched.length
      ? 'Оттенок опирается на слова из записи «' + matched.slice(0, 3).join('», «') + '».'
      : tokens.length ? 'Оттенок связан с темой записи «' + storyline + '».' : 'Текст добавит оттенок настроения.';
    const sourcePhoto = textured || strongest;
    const photoLight = brightness < 0.35 ? 'В кадрах преобладает тень.' : brightness > 0.67 ? 'В кадрах много света.' : 'В кадрах мягкий перепад света.';
    const photoClue = sourcePhoto
      ? 'Оттенок выделен из фото ' + (sourcePhoto.index + 1) + '. ' + photoLight
      : photos.length ? 'На фото нет непрозрачного цвета для анализа.' : 'Фотографии добавят оттенок света.';
    const musicPace = Number.isFinite(track.tempo)
      ? 'Темп около ' + Math.round(track.tempo) + ' уд./мин'
      : fastest > 0.62 ? 'Быстрое движение' : fastest < 0.32 ? 'Медленное движение' : 'Ровное движение';
    const soundTone = track.tone === 'warm' ? 'тёплая окраска' : track.tone === 'cool' ? 'прохладная окраска' : 'нейтральная окраска';
    const musicClue = hasTrack
      ? musicPace + ' и ' + soundTone + ' меняют акцент и скорость смены кадров.'
      : 'Музыка добавит цветовой акцент и ритм.';
    const palette = [
      makeSwatch(storyColor, textClue),
      makeSwatch(photoAccent, photoClue),
      makeSwatch(sonic, musicClue)
    ];
    const notes = [];
    if (tokens.length) {
      notes.push(palette[0].name + ' передаёт настроение записи «' + storyline +
        '». Его ассоциации — ' + palette[0].meaning + '.');
    }
    if (sourcePhoto) {
      notes.push(palette[1].name + ' пришёл из снимков и добавил свои ассоциации — ' + palette[1].meaning + '.');
    }
    if (hasTrack) {
      notes.push(palette[2].name + ' передаёт окраску звучания. Музыка задаёт ' +
        (rhythm > 4.3 ? 'неторопливые переходы' : rhythm > 3.0 ? 'ровный ритм' : 'частые смены кадра') + '.');
    }
    const description = notes.join(' ') || 'Здесь появится цветовая история вашего дня.';
    return {
      title: storyline, description, palette,
      mood: profile.mood, art: profile.image, technique: profile.technique,
      rhythm, brightness, energy, contrast,
      textClue, photoClue, musicClue, musicPace, soundTone,
      paper: toHex(mix([245, 243, 238], storyColor, 0.10 + (1 - brightness) * 0.10)),
      ink: toHex(mix([29, 38, 48], target, 0.20))
    };
  }

  return {analyze, photoColors, inspectAudio, association};
})();

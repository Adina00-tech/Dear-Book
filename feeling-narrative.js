/* Explains day colors using the diary entry, actual photo signals and song features. */
const FeelingNarrative = (() => {
  const FEELINGS = [
    {
      label: 'облегчение', phrase: 'напряжение отпускает',
      express: ['облегч', 'выдох', 'отпуст', 'отлег'],
      detail: ['закончил', 'завершил', 'справил', 'успел', 'сдали']
    },
    {
      label: 'напряжение', phrase: 'чувствуется напряжение',
      express: ['нерв', 'трево', 'напряг', 'напряж', 'страш', 'боял', 'волнова', 'злил', 'сердил'],
      detail: ['дедлайн', 'тороп', 'спеш', 'сроч', 'гонк', 'сдач']
    },
    {
      label: 'радость', phrase: 'слышится лёгкость и радость',
      express: ['радов', 'радост', 'радует', 'рады', 'рада', 'весёл', 'весел', 'счастл', 'смея', 'смешно', 'улыб', 'восторг'],
      detail: ['праздник', 'танц', 'побед', 'сюрприз', 'концерт', 'подар']
    },
    {
      label: 'тепло', phrase: 'проступают тепло и близость',
      express: ['уют', 'утеш', 'нежн', 'родн', 'спокойно рядом'],
      detail: ['обня', 'обним', 'какао', 'свеч', 'разговор', 'разговар', 'бабуш', 'дедуш', 'тепл']
    },
    {
      label: 'усталость', phrase: 'чувствуется усталость',
      express: ['устал', 'вымот', 'изнемог', 'истощ', 'тяжело'],
      detail: ['недосып', 'переработ', 'бессон', 'из сил']
    },
    {
      label: 'тихая грусть', phrase: 'слышится тихая грусть',
      express: ['груст', 'тоск', 'одинок', 'печал', 'плак', 'скучаю', 'скучал'],
      detail: ['прощ', 'расстал', 'утрат', 'опустел', 'одиноч']
    },
    {
      label: 'покой', phrase: 'появляется ощущение покоя',
      express: ['спокой', 'умиротвор', 'безмятеж', 'расслаб', 'нетороп', 'тих'],
      detail: ['тишин', 'замедл', 'молч', 'пауза', 'вдох']
    },
    {
      label: 'простор', phrase: 'появляется ощущение свежести и простора',
      express: ['свеж', 'простор', 'свобод', 'легко дыш'],
      detail: ['лес', 'луг', 'трава', 'траву', 'берег', 'ветер', 'озер', 'озёр', 'рассвет', 'горн', 'зелень']
    },
    {
      label: 'задумчивость', phrase: 'слышится задумчивость',
      express: ['задум', 'размышл', 'вспомн', 'ностальг', 'мечтал'],
      detail: ['воспомин', 'сумерк', 'полноч', 'луну', 'туман']
    }
  ];
  const BREAKS = /[.!?…\n]+|[;,—]\s*(?=(?:но|зато|хотя|потом|позже|наконец|к вечеру|к ночи|под конец|в итоге|утром|вечером)(?=$|[ ,.!?…\s]))/giu;
  const CHANGES = /(^|[\s,;—.!?…])(?<bridge>к концу дня|ближе к вечеру|под конец|к вечеру|к ночи|в итоге|спустя время|после этого|а вечером|а утром|а потом|но потом|зато потом|потом|позже|затем|наконец|но|зато|однако|хотя)(?=$|[\s,;—.!?…])/giu;
  const TEMPORAL = /потом|позже|затем|позднее|в итоге|конец|концу|к вечеру|к ночи|наконец|спустя|после|вечером|утром/u;
  const NEGATORS = new Set(['не', 'ни', 'нет', 'без']);

  function visibleText(value) {
    return String(value || '').trim();
  }

  function quote(value, near = 0) {
    const text = value.replace(/^[\s,;—.:!?…«»"']+|[\s,;—.:!?…«»"']+$/gu, '');
    if (!text) return '';
    if (text.length <= 90) return '«' + text + '»';
    const start = Math.max(0, Math.min(text.length - 87, near - 31));
    const end = Math.min(text.length, start + 87);
    const left = start === 0 ? 0 : Math.min(end - 24, Math.max(start, text.lastIndexOf(' ', start) + 1));
    const lastSpace = text.lastIndexOf(' ', end);
    const right = end === text.length || lastSpace < left + 50 ? end : lastSpace;
    return (left ? '…' : '') + '«' + text.slice(left, right).trim() + '»' + (right < text.length ? '…' : '');
  }

  function findFeeling(value) {
    const tokens = [...value.toLowerCase().matchAll(/[\p{L}]+/gu)];
    const scores = FEELINGS.map(feeling => {
      let score = 0;
      let first = null;
      let explicit = false;
      for (let i = 0; i < tokens.length; i += 1) {
        if (NEGATORS.has(tokens[i - 1]?.[0]) ||
            (NEGATORS.has(tokens[i - 2]?.[0]) && ['очень', 'так', 'слишком', 'особо', 'очень-то'].includes(tokens[i - 1]?.[0]))) continue;
        if (tokens[i][0] === 'ради' || tokens[i][0].startsWith('радио')) continue;
        const rest = tokens.slice(i, i + 4).map(token => token[0]).join(' ');
        const direct = feeling.express.some(cue => rest.startsWith(cue)) || (feeling.label === 'радость' && tokens[i][0] === 'рад');
        if (!direct && !feeling.detail.some(cue => rest.startsWith(cue))) continue;
        score += direct ? 4 : 1.35;
        if (first == null || (direct && !explicit)) first = tokens[i].index;
        explicit = explicit || direct;
      }
      return {...feeling, score, first, explicit};
    }).filter(feeling => feeling.score > 0).sort((a, b) => b.score - a.score || a.first - b.first);
    return scores;
  }

  function sourceQuote(text, at = 0) {
    const bounds = [0];
    for (const match of text.matchAll(BREAKS)) bounds.push(match.index + match[0].length);
    bounds.push(text.length);
    let i = 0;
    while (i + 1 < bounds.length - 1 && bounds[i + 1] <= at) i += 1;
    return quote(text.slice(bounds[i], bounds[i + 1]), at - bounds[i]);
  }

  function textPlan(text) {
    const ranked = findFeeling(text);
    const primary = ranked[0];
    for (const marker of text.matchAll(CHANGES)) {
      const start = marker.index + marker[1].length;
      if (start < 4) continue;
      const left = text.slice(0, start);
      const right = text.slice(start + marker.groups.bridge.length);
      const from = findFeeling(left)[0];
      const to = findFeeling(right)[0];
      if (!from || !to || from.label === to.label || (!from.explicit && !to.explicit)) continue;
      const kind = TEMPORAL.test(marker.groups.bridge.toLowerCase()) ? 'shift' : 'contrast';
      return {
        primary, secondary: null,
        evidence: sourceQuote(left, from.first) + (kind === 'shift' ? ' → ' : ' · ') + sourceQuote(right, to.first),
        transition: {from: from.label, to: to.label, kind}
      };
    }
    const secondary = ranked.find(candidate => candidate.explicit && candidate.label !== primary?.label);
    const mixed = primary?.explicit && secondary && secondary.score >= primary.score * 0.47;
    const first = primary ? sourceQuote(text, primary.first)
      : quote(text.split(BREAKS).find(part => (part.match(/[\p{L}]+/gu) || []).length >= 4) || text.split(BREAKS)[0] || '');
    const second = mixed ? sourceQuote(text, secondary.first) : '';
    return {
      primary, secondary: mixed ? secondary : null, transition: null,
      evidence: second && first !== second ? first + ' · ' + second : first
    };
  }

  function colorShape(hexValue) {
    let hex = String(hexValue || '').match(/^#?([\da-f]{6})$/i)?.[1];
    const short = String(hexValue || '').match(/^#?([\da-f]{3})$/i)?.[1];
    if (!hex && short) hex = [...short].map(value => value + value).join('');
    if (!hex) return {base: 'сдержанность', light: 'мягкий переход между светом и тенью', color: 'мягкий цвет'};
    const [r, g, b] = [0, 2, 4].map(start => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
    const hi = Math.max(r, g, b);
    const lo = Math.min(r, g, b);
    const spread = hi - lo;
    const level = (hi + lo) / 2;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const saturation = spread ? spread / (1 - Math.abs(2 * level - 1)) : 0;
    let hue = 0;
    if (spread > 0) {
      if (hi === r) hue = (g - b) / spread;
      else if (hi === g) hue = 2 + (b - r) / spread;
      else hue = 4 + (r - g) / spread;
    }
    hue = (hue * 60 + 360) % 360;
    const dark = luminance < 0.39;
    const pale = luminance > 0.72 && saturation < 0.65;
    const soft = saturation < 0.36;
    const light = pale ? 'ощущение света и воздуха' : dark ? 'глубину и камерность'
      : soft ? 'ощущение рассеянного света' : 'выразительный акцент';
    if (spread < 0.10 || saturation < 0.17) {
      return {base: dark ? 'сдержанность и глубина' : 'пауза и свободное пространство', light, color: 'нейтральный оттенок'};
    }
    if (hue < 20 || hue >= 346) {
      const base = soft ? (dark ? 'сдержанное тепло' : 'приглушённое тепло')
        : dark ? 'собранность и внутреннее напряжение' : pale ? 'тепло и оживление' : 'волнение и импульс';
      return {base, light, color: soft ? 'приглушённый тёплый оттенок' : 'красный акцент'};
    }
    if (hue < 47) return {base: dark ? 'тихое, камерное тепло' : 'уют и близость', light, color: 'тёплый янтарный оттенок'};
    if (hue < 75) return {base: dark ? 'тепло в тени' : 'открытость и лёгкая радость', light, color: 'золотистый свет'};
    if (hue < 167) return {base: dark ? 'покой, как в тени деревьев' : 'свежесть и свободное дыхание', light, color: 'зелёный оттенок'};
    if (hue < 198) return {base: dark ? 'прохлада и сосредоточенность' : 'прохлада и свежесть', light, color: 'бирюзовый оттенок'};
    if (hue < 248) return {base: dark ? 'покой с лёгкой грустью' : 'прохлада, воздух и тишина', light, color: 'синий оттенок'};
    if (hue < 306) return {base: dark ? 'сумеречная задумчивость' : 'мечтательность и лёгкая отстранённость', light, color: 'фиолетовый оттенок'};
    return {base: dark ? 'сдержанная теплота' : 'тепло и живой акцент', light, color: 'розовый оттенок'};
  }

  function photoPlan(photos, result, swatch) {
    const measurements = (photos || []).map(photo => photo?.signals || photo?.signal || photo);
    const indexed = measurements.findIndex(photo => Array.isArray(photo?.colors) &&
      photo.colors.some(color => String(color?.hex).toLowerCase() === String(swatch?.hex).toLowerCase()));
    const matched = typeof result.photoClue === 'string' ? result.photoClue.match(/(?:фото|снимка)\s+(\d+)/iu) : null;
    const number = indexed >= 0 ? indexed + 1 : matched?.[1] || null;
    const lights = measurements.map(photo => photo?.brightness).filter(Number.isFinite);
    const brightness = Number.isFinite(result.brightness) ? result.brightness
      : lights.length ? lights.reduce((sum, value) => sum + value, 0) / lights.length : null;
    const known = number !== null || (lights.length > 0 && measurements.some(photo => photo?.colors?.length));
    const light = brightness == null || !known ? '' : brightness < 0.34 ? 'Снимки в среднем тёмные.'
      : brightness > 0.66 ? 'Снимки в среднем светлые.' : 'Средняя яркость снимков умеренная.';
    const evidence = number === null ? light : 'Оттенок из снимка ' + number + '. ' + light;
    const spec = colorShape(swatch?.hex);
    return {
      known, evidence: evidence.trim(), meaning: spec.base,
      detail: 'В палитре этот оттенок передаёт ' + spec.light + '.'
    };
  }

  function songPlan(track, song, result, swatch) {
    const tempo = Number.isFinite(track?.tempo) ? track.tempo : Number.isFinite(song?.tempo) ? song.tempo : null;
    const energy = Number.isFinite(track?.energy) ? track.energy : Number.isFinite(song?.energy) ? song.energy : null;
    const tone = track?.tone || song?.tone;
    const silent = Boolean(track?.silent || song?.silent);
    const analyzed = Boolean(track?.analyzed || song?.analyzed || /аудиофайл/iu.test(track?.method || ''));
    const spec = colorShape(swatch?.hex);
    if (silent) return {known: true, evidence: 'В файле почти тишина.', meaning: 'воздух и пауза', detail: 'Тишина оставляет больше времени на каждый кадр.'};
    const clues = [];
    if (tempo != null && tempo > 0) clues.push((analyzed ? 'Около ' : '') + Math.round(tempo) + ' уд./мин');
    if (tone === 'warm') clues.push('мягкая, тёплая окраска');
    else if (tone === 'cool') clues.push('прохладная, ясная окраска');
    else if (tone === 'neutral') clues.push('ровная окраска');
    if (energy != null) clues.push(energy < 0.35 ? 'спокойное звучание'
      : energy > 0.70 ? 'энергичное звучание' : 'умеренная энергия');
    const frame = Number.isFinite(result.rhythm) ? result.rhythm : null;
    const movement = frame == null ? '' : frame > 4.2 ? 'Паузы между акцентами дают ощущение покоя.'
      : frame < 3.0 ? 'Частые акценты добавляют ощущение движения.' : 'Ровные переходы поддерживают ощущение собранности.';
    const lead = 'В палитре песня добавляет ' + spec.light + '.';
    return {known: clues.length > 0, evidence: clues.join(' · '), meaning: spec.base, detail: [lead, movement].filter(Boolean).join(' ')};
  }

  function explain({text, result = {}, track, song, photos, reference = false} = {}) {
    const existing = Array.isArray(result.palette) ? result.palette : [];
    const body = visibleText(text);
    const plan = textPlan(body);
    const words = colorShape(existing[0]?.hex);
    const photo = photoPlan(photos, result, existing[1]);
    const music = songPlan(track, song, result, existing[2]);
    const textLight = body ? words.color[0].toUpperCase() + words.color.slice(1) + ' передаёт ' +
      words.light + '.' : 'Текст добавит оттенок настроения.';
    const textMeaning = plan.transition ? plan.transition.from + ' и ' + plan.transition.to
      : plan.secondary ? plan.primary.label + ' и ' + plan.secondary.label : plan.primary?.label || words.base;
    const pieces = [
      {name: 'Текст', meaning: textMeaning, detail: textLight, evidence: plan.evidence},
      {name: 'Фото', meaning: photo.meaning, detail: photo.detail, evidence: photo.evidence},
      {name: 'Музыка', meaning: music.meaning, detail: music.detail, evidence: music.evidence}
    ];
    const layers = pieces.filter((piece, i) => [Boolean(body), photo.known, music.known][i])
      .map(piece => {
        const end = /[.!?…]$/u.test(piece.evidence) ? ' ' : '. ';
        return {name: piece.name, detail: piece.evidence ? piece.evidence + end + piece.detail : piece.detail};
      });
    if (reference) {
      return {summary: result.description || '', palette: existing, layers, transition: null};
    }
    const palette = existing.map((swatch, i) => {
      const piece = pieces[i];
      if (!piece || ![Boolean(body), photo.known, music.known][i]) return swatch;
      return {...swatch, role: piece.name, meaning: piece.meaning, evidence: piece.evidence || swatch.evidence, detail: piece.detail};
    });
    const lines = [];
    if (plan.transition?.kind === 'shift') {
      lines.push('В записи меняется настроение. Сначала слышится ' + plan.transition.from +
        ', а позже ' + plan.transition.to + '.');
    } else if (plan.transition || plan.secondary) {
      lines.push('В одном дне соседствуют ' + textMeaning + '.');
    } else if (plan.primary && plan.evidence) {
      lines.push('В деталях ' + plan.evidence + ' ' + plan.primary.phrase + '.');
    } else if (body && plan.evidence) {
      lines.push('Цвет возвращает к моменту ' + plan.evidence + '.');
    }
    if (photo.known && existing[1]?.name) {
      lines.push('На снимках ' + colorShape(existing[1].hex).color + ' даёт ' +
        colorShape(existing[1].hex).light + '.');
    }
    if (music.known) {
      const pace = Number.isFinite(result.rhythm) && result.rhythm > 4.2 ? 'оставляет больше времени на кадр'
        : Number.isFinite(result.rhythm) && result.rhythm < 3.0 ? 'ускоряет смену кадров' : 'задаёт ровный ход кадров';
      lines.push('Музыка ' + (track?.silent || song?.silent ? 'оставляет паузу между кадрами' : pace) + '.');
    }
    return {summary: lines.join(' ') || result.description || '', palette, layers, transition: plan.transition};
  }

  return {explain};
})();

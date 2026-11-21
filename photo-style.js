/* Chooses a quiet photo reference style from actual pictures and the diary's motifs. */
const PhotoStyle = (() => {
  const STYLES = {
    ivory: {
      name: 'Молочный бытовой кадр',
      explanation: 'молочная гамма и близкий план бытовых деталей',
      query: 'candid real analog snapshot everyday home detail coffee hands quiet domestic light beige cream taupe low contrast personal film diary photos',
      matches: /какао|кофе|чайн|чай|плед|бабуш|уют|кухн|дом[аеоу](?![\p{L}])|полотенц|свеч|ламп|завтрак|чашк|молочн|бежев|льнян|рук[аиу](?![\p{L}])|нейтрал|домаш|taupe|beige|kitchen|cozy|cream|ivory|coffee/giu,
      pairing: /ча[йяю]|кофе|какао|чашк|плед|завтрак|молоч|тёпл|ламп/iu
    },
    fog: {
      name: 'Оливковый двор в тумане',
      explanation: 'оливково-серая гамма, дальний план и лёгкая дымка',
      query: 'real candid amateur film photograph quiet foggy residential lane muted olive gray gray-green fog soft mist houses wet road subdued everyday snapshot',
      matches: /туман|дымк|олив|серо[ -]зел|пасмур|безлюд|переул|соседн|пригород|тих[ийаяое]|прогул|пуст[аяойые]|двор|дорог|деревн|частн[аы][яй] дом|хво[йя]|влажн|fog|mist|overcast|olive|lane|quiet|suburban/giu,
      pairing: /туман|дымк|олив|пасмур|переул|двор|дорог|безлюд/iu
    },
    graphite: {
      name: 'Графитовый учебный стол',
      explanation: 'графитовая гамма и крупные планы вещей на столе',
      query: 'real amateur candid film diary photo graphite gray school work desk close detail books notebooks reading glasses dark muted low saturation dusty room',
      matches: /тетрад|школ|экзам|контрольн|зач[её]т|конспект|уч[иеё]б|книг|учебник|урок|очк|дедлайн|графит|угол[её]к|угольн|пыльн|стол|бумаг|печат|монитор|проект|работ|срок|сдач|desk|school|exam|notebook|book|read|graphite|deadline|charcoal/giu,
      pairing: /школ|экзам|дедлайн|очк|книг|тетрад|графит|конспект|урок|стол/iu
    },
    rain: {
      name: 'Сине-серый кадр сквозь стекло',
      explanation: 'сине-серая гамма, мокрое стекло и приглушённые отражения',
      query: 'real casual phone photo from inside car looking through rainy windshield droplets reflection muted blue gray traffic road overcast grain soft focus candid snapshot',
      matches: /дожд|лив[её]н|капл|капал|мокр|луж|стекл|дворник|автомоб|машин|такси|фар[аы]|стекло|кол[её]с|запот|отражен|сине[ -]сер|rain|wet|car|windshield|droplet|window|puddle/giu,
      pairing: /дожд|лив[её]н|мокр|дворник|автомоб|машин|запот|сине[ -]сер|стекл|фар/iu
    }
  };
  const KEYS = Object.keys(STYLES);
  const clamp = value => Math.max(0, Math.min(1, value));
  const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
  const affinity = (ratio, peak, range) => Math.max(0, 1 - Math.abs(ratio - peak) / range);

  function readColor(value) {
    const digits = String(value || '').trim().match(/^#?([\da-f]{3}|[\da-f]{6})$/iu)?.[1];
    if (!digits) return null;
    const hex = digits.length === 3 ? [...digits].map(char => char + char).join('') : digits;
    const [r, g, b] = [0, 2, 4].map(i => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
    const brightness = .2126 * r + .7152 * g + .0722 * b;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    const warm = r >= g - .015 ? clamp((r - b - .012) * 7) : 0;
    const olive = g >= r - .075 ? clamp((Math.min(r, g) - b - .012) * 9) * clamp(1 - Math.max(0, r - g) * 9) : 0;
    const blue = b >= g - .015 ? clamp((b - (r + g) / 2 - .012) * 8) : 0;
    return {brightness, spread, warm, olive, blue};
  }

  function readSignals(pictures, result) {
    const groups = [];
    for (const picture of Array.isArray(pictures) ? pictures : []) {
      const signals = picture?.signals || picture?.signal || picture;
      if (!Array.isArray(signals?.colors)) continue;
      const samples = signals.colors.map(color => ({
        color: readColor(color?.hex || color),
        weight: Number.isFinite(color?.weight) && color.weight > 0 ? color.weight : 1
      })).filter(item => item.color);
      if (!samples.length) continue;
      const totalWeight = samples.reduce((sum, item) => sum + item.weight, 0);
      const sum = key => samples.reduce((accumulator, item) => accumulator + item.color[key] * item.weight, 0) / totalWeight;
      groups.push({
        brightness: Number.isFinite(signals.brightness) ? clamp(signals.brightness) : sum('brightness'),
        spread: sum('spread'), warm: sum('warm'), olive: sum('olive'), blue: sum('blue')
      });
    }
    if (groups.length) return Object.fromEntries(Object.keys(groups[0]).map(key => [key, mean(groups.map(group => group[key]))]));
    const swatch = result?.palette?.[1];
    const evidence = [result?.photoClue, swatch?.evidence].filter(value => typeof value === 'string').join(' ');
    const backed = /выделен[ао]? из фото|из снимка|палитр[аыеуы] (?:снимк|фото)/iu.test(evidence)
      || (Array.isArray(pictures) && pictures.length && !/нет непрозрач|фотографии добавят/iu.test(evidence));
    const fallback = backed && readColor(swatch?.hex);
    if (!fallback) return null;
    return {...fallback, brightness: Number.isFinite(result.brightness) ? clamp(result.brightness) : fallback.brightness};
  }

  function answer(value) {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(answer).join(' ');
    if (!value || typeof value !== 'object') return '';
    return [value.custom, value.label, value.id, value.value].filter(item => typeof item === 'string').join(' ');
  }

  function contextScore(style, value) {
    if (typeof value !== 'string' || !value) return 0;
    const tokens = value
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean);
    const spans = value.toLowerCase().match(style.matches) || [];
    const unique = [...new Set(spans)];
    if (!unique.length) return 0;
    return Math.min(1.6, unique.length * .34 + (tokens.length > 1 && style.pairing.test(value) ? .31 : 0));
  }

  function photoScores(photo) {
    if (!photo) return {ivory: 0, fog: 0, graphite: 0, rain: 0};
    const {brightness: light, spread, warm, olive, blue} = photo;
    const muted = clamp(1 - spread * 2.8);
    return {
      ivory: 3.95 * affinity(light, .72, .46) + 2.45 * warm * clamp(.40 + light) + .65 * muted - 1.35 * blue,
      fog: 3.80 * affinity(light, .47, .34) + 2.12 * olive + .47 * muted - .95 * blue,
      graphite: 4.15 * affinity(light, .25, .36) + 1.15 * muted - 1.38 * blue - 1.10 * warm,
      rain: 3.92 * affinity(light, .39, .46) + 3.45 * blue + .58 * muted - 1.90 * warm
    };
  }

  function photoEvidence(photo) {
    const light = photo.brightness >= .63 ? 'кадры в среднем светлые'
      : photo.brightness <= .37 ? 'кадры в среднем тёмные' : 'яркость кадров умеренная';
    if (photo.blue >= .22 && photo.blue > 1.20 * photo.warm) return 'В палитре снимков заметна синева, ' + light + '.';
    if (photo.olive >= .23 && photo.olive >= .56 * photo.warm) return 'В палитре снимков заметны оливковые оттенки, ' + light + '.';
    if (photo.warm >= .25) return 'В палитре снимков заметны тёплые оттенки, ' + light + '.';
    return (photo.spread < .14 ? 'Оттенки снимков близки к серым, ' : 'В палитре снимков смешаны оттенки, ') + light + '.';
  }

  function select({text, result, pictures, track, quiz, reference} = {}) {
    const photo = readSignals(pictures, result);
    const answers = quiz?.answers || {};
    const story = typeof text === 'string' && text.trim() ? text : result?.title;
    const quizText = [answers.place, answers.weather, answers.scene, answers.rhythm, answers.texture, answers.sound, answers.colors]
      .map(answer).join(' ');
    const scores = photoScores(photo);
    const winner = KEYS.map(key => {
      const style = STYLES[key];
      const textWeight = contextScore(style, story);
      const quizWeight = contextScore(style, quizText);
      let music = 0;
      if (Number.isFinite(track?.energy)) {
        if (track.energy < .32 && (key === 'fog' || key === 'ivory')) music += .11;
        if (track.energy > .72 && (key === 'graphite' || key === 'rain')) music += .11;
      }
      if (track?.tone === 'cool' && (key === 'rain' || key === 'fog')) music += .08;
      if (track?.tone === 'warm' && key === 'ivory') music += .09;
      return {key, score: scores[key] + textWeight * (photo ? .66 : 1) + quizWeight * (photo ? .65 : .96) + music, textWeight, quizWeight};
    }).sort((a, b) => b.score - a.score)[0];
    const fixed = typeof reference === 'string' ? reference : reference?.styleKey || reference?.key || reference?.photoStyle?.key || reference?.photoStyle;
    const fixedStyle = typeof fixed === 'string' && Object.prototype.hasOwnProperty.call(STYLES, fixed);
    const key = fixedStyle ? fixed : winner.key;
    const style = STYLES[key];
    let reason;
    if (fixedStyle) {
      reason = 'Сохранён выбранный стиль референсов — ' + style.explanation + '.';
    } else if (photo) {
      reason = photoEvidence(photo) + ' Стиль референсов — ' + style.explanation + '.';
    } else if (winner.textWeight > 0 && winner.quizWeight > 0) {
      reason = 'Мотивы записи и ответы анкеты подсказали стиль — ' + style.explanation + '.';
    } else if (winner.textWeight > 0 || winner.quizWeight > 0) {
      reason = (winner.textWeight > 0 ? 'Визуальный мотив из записи' : 'Визуальный мотив из анкеты') +
        ' подсказал стиль — ' + style.explanation + '.';
    } else {
      reason = 'Приглушённый стиль для этой страницы — ' + style.explanation + '.';
    }
    return {key, name: style.name, reason, query: style.query};
  }

  return {select};
})();

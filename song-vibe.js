/* Local analysis of how a song sounds and what it contributes to the diary. */
const SongVibe = (() => {
  const TONES = {
    warm: {
      label: 'тёплое',
      hue: '#d29a61',
      sound: 'мягкая, тёплая окраска',
      color: 'янтарный цвет, как от мягкого света'
    },
    cool: {
      label: 'прохладное',
      hue: '#759ed3',
      sound: 'ясная, прохладная окраска',
      color: 'синий акцент, как прохладный вечерний свет'
    },
    neutral: {
      label: 'ровное по тембру',
      hue: '#a0a4bd',
      sound: 'ровная окраска без ярко выраженного тепла или прохлады',
      color: 'дымчатый оттенок, как рассеянный свет'
    }
  };

  const clamp = value => Math.max(0, Math.min(1, value));

  function describe(track) {
    const data = track || {};
    const tone = Object.hasOwn(TONES, data.tone) ? data.tone : null;
    const energy = Number.isFinite(data.energy) ? clamp(data.energy) : null;
    const tempo = Number.isFinite(data.tempo) && data.tempo > 0 ? Math.round(data.tempo) : null;
    const {regularity, dynamics, silent, analyzed} = data;
    if (silent) {
      return {
        label: 'Почти без звука',
        description: 'В файле почти тишина. Она оставляет в мудборде больше воздуха и замедляет переходы.',
        evidence: 'Слышимого сигнала недостаточно для оценки темпа.',
        hue: '#b7bed0',
        energy: energy ?? 0.12,
        tempo: null,
        tone: 'neutral'
      };
    }
    if (tone == null && energy == null && tempo == null) {
      return {
        label: 'Характер песни пока неизвестен',
        description: 'Добавьте аудиофайл или опишите темп и окраску песни, чтобы она могла изменить мудборд.',
        evidence: 'По одной ссылке звуковые свойства определить нельзя.',
        hue: null, energy: null, tempo: null, tone: null
      };
    }

    const palette = tone ? TONES[tone] : TONES.neutral;
    const pace = tempo == null ? null : tempo < 85 ? 'медленный' : tempo < 120 ? 'умеренный' : 'быстрый';
    const feel = energy == null ? null : energy < 0.36 ? 'спокойное' : energy < 0.68 ? 'живое' : 'напористое';
    const beat = regularity >= 0.65 ? 'с отчётливым пульсом' : null;
    const pulse = pace === 'медленный'
      ? 'Размеренный темп оставляет время задержаться на каждом кадре.'
      : pace === 'быстрый'
        ? 'В быстром темпе кадры сменяются чаще, а акценты становятся заметнее.'
        : pace === 'умеренный'
          ? 'Умеренный темп поддерживает плавное движение от кадра к кадру.'
          : feel === 'напористое'
            ? 'Сильные звуковые акценты добавляют контраста и ускоряют смену кадров.'
            : feel === 'спокойное'
              ? 'Спокойная энергия даёт снимкам больше времени.'
              : 'Энергия звучания задаёт ровный ход переходов.';
    const motion = dynamics >= 0.54
      ? 'Тихие участки заметно чередуются со звуковыми всплесками.'
      : dynamics != null && dynamics < 0.25 ? 'Громкость держится на близком уровне, поэтому звучание ощущается цельным.' : '';
    const color = tone
      ? 'У песни ' + palette.sound + '. В мудборде появляется ' + palette.color + '.'
      : '';
    const traits = [feel, tone ? palette.label : null].filter(Boolean);
    const subheading = traits.length
      ? traits.join(' и ') + ' звучание'
      : pace + ' темп';
    const label = subheading.charAt(0).toUpperCase() + subheading.slice(1) + (beat ? ' ' + beat : '');
    const markers = [];
    if (tempo != null) markers.push((analyzed ? '≈ ' : '') + tempo + ' уд./мин');
    else if (analyzed) markers.push('Отчётливый темп не найден');
    if (energy != null) markers.push('энергия ' + (energy < 0.36 ? 'мягкая' : energy < 0.68 ? 'средняя' : 'высокая'));
    if (tone != null) markers.push(palette.sound);
    if (analyzed && Number.isFinite(data.sampleDuration) && data.duration > data.sampleDuration + 1) {
      markers.push('первые ' + Math.round(data.sampleDuration) + ' с файла');
    }
    return {
      label,
      description: [pulse, motion, color].filter(Boolean).join(' '),
      evidence: markers.join(' · '),
      hue: tone ? palette.hue : null,
      energy, tempo, tone
    };
  }

  function findBeat(levels, frameRate) {
    if (levels.length < frameRate * 5) return {tempo: null, regularity: null};
    const onsets = levels.slice(1).map((level, index) => Math.max(0, level - levels[index]));
    const average = onsets.reduce((sum, value) => sum + value, 0) / onsets.length;
    if (average < 0.0002) return {tempo: null, regularity: 0};
    const centered = onsets.map(value => value - average);
    const shortest = Math.ceil(frameRate * 60 / 195);
    const longest = Math.floor(frameRate * 60 / 54);
    const peaks = [];
    const scores = [];
    for (let lag = shortest - 1; lag <= longest + 1; lag += 1) {
      let joint = 0;
      let first = 0;
      let second = 0;
      for (let i = lag; i < centered.length; i += 1) {
        const a = centered[i];
        const b = centered[i - lag];
        joint += a * b;
        first += a * a;
        second += b * b;
      }
      scores[lag] = joint / Math.max(1e-9, Math.sqrt(first * second));
    }
    for (let lag = shortest; lag <= longest; lag += 1) {
      if (scores[lag] >= scores[lag - 1] && scores[lag] >= scores[lag + 1]) {
        peaks.push({lag, score: scores[lag]});
      }
    }
    const best = peaks.reduce((highest, peak) => Math.max(highest, peak.score), 0);
    if (best < 0.32) return {tempo: null, regularity: best};
    const peak = peaks.find(candidate => candidate.score >= best - 0.09);
    const {lag, score} = peak;
    const before = scores[lag - 1];
    const after = scores[lag + 1];
    const curve = before + after - 2 * score;
    const offset = curve < 0 ? 0.5 * (before - after) / curve : 0;
    return {tempo: Math.round(frameRate * 60 / (lag + offset)), regularity: clamp(score)};
  }

  function readAudio(buffer) {
    const {sampleRate, length} = buffer;
    const channels = Array.from({length: Math.min(2, buffer.numberOfChannels || 1)}, (_, index) => buffer.getChannelData(index));
    const samples = Math.min(length ?? channels[0].length, sampleRate * 60);
    const frameSize = Math.max(1, Math.round(sampleRate / 40));
    const stride = Math.max(1, Math.round(sampleRate / 12000));
    const levels = [];
    let power = 0;
    let brightnessPower = 0;
    let points = 0;
    for (let start = 0; start + frameSize <= samples; start += frameSize) {
      let level = 0;
      let count = 0;
      for (const samples of channels) {
        for (let i = start + stride; i < start + frameSize; i += stride) {
          const value = samples[i];
          level += value * value;
          brightnessPower += (value - samples[i - stride]) ** 2;
          count += 1;
        }
      }
      if (count === 0) continue;
      power += level;
      points += count;
      levels.push(Math.sqrt(level / count));
    }
    const duration = buffer.duration ?? (length ?? channels[0].length) / sampleRate;
    const common = {
      duration, sampleDuration: samples / sampleRate, analyzed: true,
      method: 'Анализ аудиофайла'
    };
    if (!points || power / points < 1e-7) {
      return {...common, silent: true, tone: 'neutral', energy: 0.12, tempo: null, brightness: 0, dynamics: null, regularity: null};
    }

    const peak = Math.max(...levels);
    const floor = Math.max(0.002, peak * 0.07);
    const first = levels.findIndex(level => level >= floor);
    let last = levels.length - 1;
    while (last > first && levels[last] < floor) last -= 1;
    const active = levels.slice(Math.max(0, first), last + 1);
    const ranked = [...active].sort((a, b) => a - b);
    const low = ranked[Math.floor((ranked.length - 1) * 0.15)] || 0;
    const high = ranked[Math.floor((ranked.length - 1) * 0.90)] || 0;
    const dynamics = clamp((high - low) / Math.max(0.004, high));
    const brightness = clamp(brightnessPower / power);
    const tone = brightness < 0.085 ? 'warm' : brightness > 0.23 ? 'cool' : 'neutral';
    const {tempo, regularity} = findBeat(active, sampleRate / frameSize);
    const pace = tempo == null ? 0.30 : clamp((tempo - 55) / 115);
    const rising = active.slice(1).reduce((sum, value, index) => sum + Math.max(0, value - active[index]), 0);
    const motion = clamp(6.5 * rising / Math.max(0.005, active.length * high));
    const loudness = clamp(Math.sqrt(power / points) * 2.7);
    const energy = clamp(0.10 + 0.30 * loudness + 0.29 * motion + 0.28 * pace + 0.11 * brightness);
    return {...common, tempo, tone, energy, brightness, dynamics, regularity};
  }

  async function inspect(arrayBuffer) {
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) throw new Error('Браузер не может проанализировать аудиофайл.');
    const context = new Audio();
    try {
      const buffer = await context.decodeAudioData(arrayBuffer.slice(0));
      const profile = readAudio(buffer);
      return {...profile, ...describe(profile)};
    } finally {
      if (context.state !== 'closed') await context.close();
    }
  }

  return {inspect, describe};
})();

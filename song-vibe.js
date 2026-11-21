/* Local rhythm analysis and its contribution to diary editing. */
const SongVibe = (function createSongVibe() {
  const tones = {
    warm: {hue:"#d29a61", label:"Мягкая окраска", visual:"мягкий янтарный акцент"},
    neutral: {hue:"#a0a4bd", label:"Ровная окраска", visual:"дымчатый цветовой акцент"},
    cool: {hue:"#759ed3", label:"Яркая окраска", visual:"прохладный синий акцент"}
  };
  const paceText = {slow:"размеренный", moderate:"умеренный", fast:"быстрый"};
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const mean = items => items.reduce((sum, item) => sum + item, 0) / Math.max(1, items.length);
  const quantile = (ordered, ratio) => ordered[Math.floor((ordered.length - 1) * ratio)] ?? 0;

  function pacing(track = {}) {
    const data = track || {};
    const confidence = Number.isFinite(data.tempoConfidence) ? clamp(data.tempoConfidence) : null;
    const energy = Number.isFinite(data.energy) ? clamp(data.energy) : null;
    const dynamics = Number.isFinite(data.dynamics) ? clamp(data.dynamics) : 0.3;
    const continuity = Number.isFinite(data.rhythmContinuity) ? clamp(data.rhythmContinuity) :
      Number.isFinite(data.regularity) ? clamp(data.regularity) : null;
    const tempo = !data.silent && Number.isFinite(data.tempo) && data.tempo >= 20 && data.tempo <= 400 &&
      !(data.analyzed && confidence != null && confidence < 0.5) ? Math.round(data.tempo) : null;
    const pace = tempo == null ? null : tempo < 85 ? "slow" : tempo < 120 ? "moderate" : "fast";
    const beatMs = tempo == null ? null : Math.round(60000 / tempo);
    const pulse = data.silent ? "quiet" : data.analyzed && beatMs != null ?
      (continuity >= 0.64 ? "steady" : "intermittent") : data.analyzed ? "loose" : "unspecified";
    const basis = data.analyzed ? "measured" : beatMs != null || energy != null || Object.hasOwn(tones, data.tone) ? "manual" : "none";
    const beatsPerFrame = pulse === "intermittent" ? 4.4 : 4;
    const frameMs = beatMs == null ? Math.round(4400 - 1600 * (energy ?? 0.5)) :
      Math.round(clamp(beatMs * beatsPerFrame, 1200, 4900));
    const transitionMs = Math.round(clamp(460 + 0.18 * (beatMs ?? 660) - 310 * dynamics, 230, 690));
    return {tempo, beatMs, frameMs, transitionMs, pace, pulse, certainty:confidence, basis};
  }

  function dayRhythm(context = {}) {
    const rhythm = context.quiz?.answers?.rhythm ?? context.answers?.rhythm;
    const quizId = typeof rhythm === "string" ? rhythm : rhythm?.id;
    const quizRhythms = {
      "slow-blurred": {pace:"slow"},
      "fast-chaotic": {pace:"fast", shape:"uneven"},
      "calm-intense": {pace:"slow", feeling:"спокойно, но эмоционально насыщенно"},
      montage: {shape:"uneven"},
      monotone: {shape:"steady"},
      unpredictable: {shape:"uneven"}
    };
    const selected = quizRhythms[quizId] || {};
    const direct = Object.hasOwn(paceText, context.pace) ? context.pace : null;
    const text = [context.text, rhythm?.custom].filter(item => typeof item === "string").join(" ").slice(0, 9000);
    const slow = /(?:^|[^а-яё])(?:медленн[а-яё]*\s+(?:шл|ех|двиг|тян|прош)|нетороплив|неспешн|не\s+спеша|без\s+спешк|в\s+своём\s+темпе|долгая\s+пауза)/iu.test(text);
    const actionText = text.replace(/(?:^|[^а-яё])(?:не|без)\s+(?:очень\s+)?(?:быстр|тороп|спеш|сует)[а-яё]*/giu, " ");
    const fast = /(?:^|[^а-яё])(?:быстр[а-яё]*\s+(?:менял|шл|ех|беж|прош|собир)|торопил|суетил|бегом|наперегонки|спешк|спешил|на\s+бегу|день\s+прош[её]л\s+быстро)/iu.test(actionText);
    const clearPace = slow === fast ? null : slow ? "slow" : "fast";
    const pace = direct || selected.pace || clearPace;
    const shape = selected.shape || (slow && fast ? "uneven" : null);
    const feeling = typeof context.feeling === "string" && context.feeling.trim()
      ? context.feeling.trim().replace(/\s+/g, " ").slice(0,120)
      : selected.feeling;
    return {pace, shape, feeling};
  }

  function connect(track, context) {
    const edit = pacing(track);
    if (!context || edit.basis === "none") return {kind:"unknown", text:""};
    const day = dayRhythm(context);
    const trackRhythm = edit.basis === "manual" ? "указанный темп песни" : "пульс трека";
    if (day.shape === "uneven" && edit.pulse === "steady") {
      return {
        kind:"contrast",
        text:"День описан как череда неодинаковых моментов. Ровный пульс может связать их, оставив заметные паузы между группами кадров."
      };
    }
    if (day.pace && edit.pace && day.pace !== edit.pace) {
      const lead = "Запись передаёт " + paceText[day.pace] + " ход дня, а " + trackRhythm + " " + paceText[edit.pace] + ".";
      return {kind:"contrast", text:lead + " Этот контраст можно передать чередованием длинных кадров и коротких акцентов."};
    }
    if (day.pace && day.pace === edit.pace) {
      return {
        kind:"consonant",
        text:"Ритм дня в записи и " + trackRhythm + " сходятся. " +
          (edit.pace === "slow" ? "Размеренные переходы оставляют время рассмотреть детали." :
            "Смена кадров может подхватить этот темп.")
      };
    }
    if (day.shape === "steady" && edit.pulse === "steady") {
      return {kind:"consonant", text:"В записи повторяются похожие моменты, а в треке держится ровный пульс. Одинаковая длина соседних кадров свяжет эти два наблюдения."};
    }
    if (day.feeling && (edit.tempo != null || edit.pulse === "quiet")) {
      return {
        kind:"layered",
        text:"В ответе об ощущении дня звучит «" + day.feeling + "». Музыка добавляет к записи " +
          (edit.pulse === "quiet" ? "паузу." : paceText[edit.pace] + " ритм переходов.")
      };
    }
    return {kind:"unknown", text:""};
  }

  function describe(track, context) {
    const data = track || {};
    const edit = pacing(data);
    const tone = Object.hasOwn(tones, data.tone) ? data.tone : null;
    const energy = Number.isFinite(data.energy) ? clamp(data.energy) : null;
    const {tempo, pace, pulse, basis, certainty} = edit;
    const connection = connect(data, context);
    const details = {energy, tempo, tone, pace, pacing:edit, connection:connection.text, connectionKind:connection.kind};
    if (data.silent) return {
      ...details,
      label:"Почти без звука",
      description:"В файле почти тишина. Длинные кадры и лёгкие переходы сохраняют ощущение паузы.",
      evidence:"Анализ аудиофайла · слышимого сигнала недостаточно для оценки темпа.",
      hue:"#b7bed0", energy:energy ?? 0.12, tempo:null, tone:"neutral"
    };
    if (basis === "none") return {
      ...details,
      label:"Характер песни пока неизвестен",
      description:"Добавь аудиофайл или опиши темп и окраску песни, чтобы она могла изменить мудборд.",
      evidence:"Музыкальная ссылка открывает песню. Для оформления можно задать её профиль.",
      hue:null
    };

    const narrative = [];
    if (pulse === "steady") narrative.push("В файле повторяется устойчивый " + paceText[pace] + " пульс. Он задаёт интервалы между кадрами.");
    else if (pulse === "intermittent") narrative.push("Повторяющийся " + paceText[pace] + " пульс заметен лишь местами. В монтаже оставь место для пауз.");
    else if (pulse === "loose") narrative.push("Устойчивый пульс выделить не удалось. Длину кадров можно менять по силе звуковых акцентов.");
    else if (pace) narrative.push("В профиле указан " + paceText[pace] + " темп. Он задаёт общую скорость смены кадров.");
    else narrative.push("Оформление следует указанному у трека характеру.");

    const {dynamics, accentRate, sampleDuration, duration, tempoAlternatives} = data;
    if (basis === "measured" && Number.isFinite(dynamics)) {
      if (dynamics >= 0.66) narrative.push("Перепады громкости позволяют чередовать тихие участки с короткими акцентами.");
      else if (dynamics <= 0.24) narrative.push("Громкость меняется мало. Мягкий переход поддержит непрерывность.");
    }
    const palette = tone ? tones[tone] : null;
    if (palette) narrative.push("Тембровые признаки дают мудборду " + palette.visual + ".");

    const markers = [basis === "measured" ? "Анализ аудиофайла" : "Музыкальный профиль задан вручную"];
    if (tempo != null) markers.push((basis === "measured" ? "≈ " : "") + tempo + " уд./мин");
    if (basis === "measured" && tempo != null && certainty != null && certainty < 0.7) markers.push("приблизительный пульс");
    if (basis === "measured" && tempo != null && Array.isArray(tempoAlternatives) && tempoAlternatives.length) {
      markers.push("возможен счёт " + tempoAlternatives.slice(0,2).join(" или ") + " уд./мин");
    }
    if (basis === "measured" && Number.isFinite(accentRate) && accentRate > 0) {
      markers.push(accentRate.toLocaleString("ru-RU",{maximumFractionDigits:1}) + " звуковых акцента/с");
    }
    if (energy != null) markers.push("энергия " + (energy < 0.36 ? "мягкая" : energy < 0.68 ? "средняя" : "высокая"));
    if (basis === "measured" && Number.isFinite(sampleDuration) && duration > sampleDuration + 1) {
      markers.push("первые " + Math.round(sampleDuration) + " с файла");
    }
    const paceLabel = pace && (paceText[pace][0].toUpperCase() + paceText[pace].slice(1));
    return {
      ...details,
      label:paceLabel ? paceLabel + (basis === "measured" ? " пульс" : " темп") :
        palette?.label || (basis === "measured" ? "Подвижность звучания" : "Характер песни"),
      description:narrative.join(" "),
      evidence:markers.join(" · "),
      hue:palette?.hue ?? null
    };
  }

  function findAccents(levels, frameRate) {
    const smoothed = levels.map((level, index) =>
      (3 * level + 2 * (levels[index-1] ?? level) + 2 * (levels[index+1] ?? level) +
        (levels[index-2] ?? level) + (levels[index+2] ?? level)) / 9);
    const rises = smoothed.map((level,index) => index ? Math.max(0, level - smoothed[index - 1]) : 0);
    const top = Math.max(0, ...rises);
    const floor = Math.max(0.00008, top * 0.093, mean(rises) * 2.4, mean(smoothed) * 0.06);
    const gap = Math.max(1, Math.round(frameRate * 0.07));
    const events = [];
    for (let i = 1; i < rises.length - 1; i += 1) {
      const value = rises[i];
      if (value < floor || value < rises[i-1] || value <= rises[i+1]) continue;
      const last = events.at(-1);
      if (!last || i-last.frame >= gap) events.push({frame:i, value});
      else if (value > last.value) Object.assign(last,{frame:i,value});
    }
    return {events, top};
  }

  function autocorrelation(length, events, top, maxLag) {
    const signal = new Float64Array(length);
    for (const {frame, value} of events) {
      for (let offset = -2; offset <= 2; offset += 1) {
        const index = frame + offset;
        if (index >= 0 && index < length) signal[index] += (3 - Math.abs(offset)) * value / top;
      }
    }
    const average = mean(signal);
    for (let i = 0; i < signal.length; i += 1) signal[i] -= average;
    const scores = new Float64Array(maxLag + 2);
    for (let lag = 1; lag <= maxLag + 1; lag += 1) {
      let joint=0, first=0, second=0;
      for (let i = lag; i < signal.length; i += 1) {
        const a = signal[i];
        const b = signal[i-lag];
        joint += a*b;
        first += a*a;
        second += b*b;
      }
      scores[lag] = joint / Math.max(1e-9, Math.sqrt(first*second));
    }
    return scores;
  }

  function beatPhase(events, period) {
    let horizontal = 0;
    let vertical = 0;
    let total = 0;
    for (const {frame,value} of events) {
      const radians = 2 * Math.PI * frame / period;
      horizontal += value * Math.cos(radians);
      vertical += value * Math.sin(radians);
      total += value;
    }
    return {
      strength:clamp(Math.hypot(horizontal, vertical) / Math.max(1e-9, total)),
      position:Math.atan2(vertical, horizontal) * period / (2 * Math.PI)
    };
  }

  function beatContinuity(events, period, phase, length, frameRate) {
    const window = Math.round(Math.max(frameRate * 2.4, period * 4));
    const portions = Math.max(1, Math.floor(length / window));
    const scores = new Float64Array(portions);
    const counts = new Array(portions).fill(null).map(() => new Set());
    for (const {frame} of events) {
      const nearest = Math.round((frame - phase) / period);
      if (Math.abs((frame - phase) / period - nearest) <= 0.18) {
        counts[Math.min(portions-1, Math.floor(frame * portions / length))].add(nearest);
      }
    }
    const expected = length / (period * portions);
    counts.forEach((hits,index) => { scores[index] = clamp((hits.size + 0.25) / expected); });
    return mean(scores);
  }

  function findBeat(levels, frameRate, events, top) {
    const unknown = {tempo:null, regularity:null, tempoConfidence:null, tempoAlternatives:[], rhythmContinuity:null};
    if (levels.length < frameRate * 5 || events.length < 5 || top <= 0) return unknown;
    const shortest = Math.ceil(frameRate * 60 / 200);
    const longest = Math.floor(frameRate * 60 / 43);
    const scores = autocorrelation(levels.length, events, top, longest * 2);
    const candidates = [];
    for (let lag = shortest; lag <= longest; lag += 1) {
      const correlation = scores[lag];
      if (correlation < 0.28 || correlation < scores[lag-1] || correlation <= scores[lag+1]) continue;
      const curve = scores[lag-1] + scores[lag+1] - 2 * correlation;
      const offset = curve < 0 ? clamp(0.5 * (scores[lag-1] - scores[lag+1]) / curve, -0.5, 0.5) : 0;
      const period = lag + offset;
      const phase = beatPhase(events, period);
      const continuity = beatContinuity(events, period, phase.position, levels.length, frameRate);
      const harmonic = scores[Math.round(period * 2)] || 0;
      const score = 0.56 * correlation + 0.24 * phase.strength + 0.15 * continuity + 0.05 * Math.max(0,harmonic);
      candidates.push({tempo:Math.round(frameRate * 60 / period), score, correlation, continuity, phase:phase.strength});
    }
    candidates.sort((a,b) => b.score - a.score);
    const best = candidates[0];
    if (!best) return {...unknown, regularity:0};
    const tempoAlternatives = candidates.slice(1).filter(candidate => {
      const ratio = Math.max(best.tempo,candidate.tempo) / Math.min(best.tempo,candidate.tempo);
      return Math.abs(ratio - 2) <= 0.09 && best.score - candidate.score <= 0.135;
    }).slice(0,2).map(candidate => candidate.tempo);
    const confidence = clamp(best.score * (tempoAlternatives.length ? 0.9 : 1));
    return {
      tempo:confidence >= 0.5 && best.continuity >= 0.32 ? best.tempo : null,
      regularity:clamp(best.correlation),
      tempoConfidence:confidence,
      tempoAlternatives:confidence >= 0.5 ? tempoAlternatives : [],
      rhythmContinuity:best.continuity
    };
  }

  function readAudio(buffer) {
    const {sampleRate,length} = buffer;
    const channels = Array.from({length:Math.min(2,buffer.numberOfChannels || 1)}, (_,index) => buffer.getChannelData(index));
    const samples = Math.min(length ?? channels[0].length, sampleRate * 60);
    const frameSize = Math.max(2,Math.round(sampleRate / 80));
    const stride = Math.max(1,Math.round(sampleRate / 12000));
    const frameRate = sampleRate / frameSize;
    const levels = [];
    let power = 0, brightnessPower = 0, points = 0;
    for (let start = 0; start + frameSize <= samples; start += frameSize) {
      let level=0, count=0;
      for (const channel of channels) {
        for (let i = start+stride; i < start+frameSize; i += stride) {
          const value = channel[i];
          level += value * value;
          brightnessPower += (value-channel[i-stride]) ** 2;
          count += 1;
        }
      }
      if (!count) continue;
      power += level;
      points += count;
      levels.push(Math.sqrt(level/count));
    }
    const duration = buffer.duration ?? (length ?? channels[0].length) / sampleRate;
    const common = {duration,sampleDuration:samples/sampleRate,analyzed:true,method:"Анализ аудиофайла"};
    if (!points || power / points < 1e-7) {
      return {...common,silent:true,tone:"neutral",energy:0.12,tempo:null,brightness:0,dynamics:null,
        regularity:null,tempoConfidence:null,tempoAlternatives:[],rhythmContinuity:null,accentRate:0,accentStrength:0};
    }

    const peak = Math.max(...levels);
    const floor = Math.max(0.002,peak * 0.065);
    const first = levels.findIndex(level => level >= floor);
    let last = levels.length - 1;
    while (last > first && levels[last] < floor) last -= 1;
    const active = levels.slice(Math.max(0,first), last+1);
    const ranked = [...active].sort((a,b) => a-b);
    const low = quantile(ranked,0.15);
    const high = Math.max(quantile(ranked,0.90), peak * 0.17);
    const dynamics = clamp((high-low)/Math.max(0.004,high));
    const brightness = clamp(brightnessPower/power);
    const tone = brightness < 0.085 ? "warm" : brightness > 0.23 ? "cool" : "neutral";
    const {events,top} = findAccents(active,frameRate);
    const pulse = findBeat(active,frameRate,events,top);
    const accentRate = events.length * frameRate / Math.max(1,active.length);
    const accentStrength = clamp(mean(events.map(event => event.value))/Math.max(0.005,high));
    const pace = pulse.tempo == null ? 0.26 : clamp((pulse.tempo-50)/120);
    const loudness = clamp(Math.sqrt(power/points)*2.7);
    const energy = clamp(0.07+0.23*loudness+0.21*clamp(accentRate/3.2)+0.20*accentStrength+0.23*pace+0.06*brightness);
    return {...common,...pulse,tone,energy,brightness,dynamics,accentRate,accentStrength};
  }

  async function inspect(arrayBuffer) {
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) throw new Error("Браузер не может проанализировать аудиофайл.");
    const context = new Audio();
    try {
      const buffer = await context.decodeAudioData(arrayBuffer.slice(0));
      const profile = readAudio(buffer);
      return {...profile,...describe(profile)};
    } finally {
      if (context.state !== "closed") await context.close();
    }
  }

  return Object.freeze({inspect,describe,pacing,connect});
})();

// Original offline demo illustrations and sound for the diary.
const { DemoCatalog, demoAudio } = (() => {
  const width = 960;
  const height = 640;
  const range = (length, draw) => Array.from({ length }, (_, index) => draw(index)).join('');

  function random(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function rect(x, y, w, h, fill, opacity = 1, radius = 0) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" opacity="${opacity}"/>`;
  }

  function dot(x, y, r, fill, opacity = 1) {
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" opacity="${opacity}"/>`;
  }

  function line(x, y, x2, y2, color, width = 1, opacity = 1) {
    return `<path d="M${x} ${y}L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" opacity="${opacity}"/>`;
  }

  const path = (d, fill, opacity = 1) => `<path d="${d}" fill="${fill}" opacity="${opacity}"/>`;

  function ridge(rng, y, height, color, opacity) {
    let d = `M0 ${y} `;
    for (let x = 0; x < width + 80; x += 20 + Math.round(rng() * 35)) {
      d += `L${x} ${y - Math.round(rng() * height)} `;
    }
    return path(d + 'L1040 640H0Z', color, opacity);
  }

  function river(rng, angle) {
    const axis = 638 - angle * 156;
    let svg = rect(0, 300, width, 340, 'url(#water)');
    svg += dot(axis, 191, 113, 'url(#halo)', 0.85);
    svg += dot(axis, 220, 24, '#f0b884', 0.73);
    svg += range(36, () => {
      const x = Math.round(rng() * 1030) - 50;
      const y = 185 + Math.round(rng() * 102);
      return line(x, y, x + 30 + rng() * 156, y, '#f5b68d', 1 + rng() * 2, .08 + rng() * .19);
    });
    svg += ridge(rng, 305, 43, '#414348', .91);
    svg += rect(0, 302, width, 338, 'url(#water)');
    svg += range(220, () => {
      const y = 305 + rng() * 350;
      const x = rng() * width;
      const lit = Math.abs(x - axis) < (y - 270) * .60;
      return line(x, y, x + 3 + rng() * (y - 270) / 4, y + rng() * 1.4, lit ? '#e4a17c' : '#9aafad', 0.7 + rng() * 2, .07 + rng() * .28);
    });
    svg += path('M0 467Q127 486 199 566L360 640H0Z', '#192b32');
    svg += path('M0 481Q108 497 177 569L293 640H0Z', '#514647', .9);
    svg += path('M0 497Q121 506 175 588L242 640H0Z', '#202e35');
    svg += range(23, (i) => {
      const x = 3 + i * 10;
      const y = 510 + i * 3 + rng() * 12;
      return line(x, y, x + 13 + rng() * 17, y - 8, '#b29388', 1.2, .12 + rng() * .25);
    });
    if (angle !== 1) {
      const x = angle === 2 ? 141 : 97;
      svg += dot(x, 516, 7, '#19282b') + path(`M${x - 13} 526q13 -9 25 0l9 60h-44Z`, '#26353b');
      svg += path(`M${x - 45} 506q5 -43 47 -41q35 0 50 39q-23 -10 -39 3q-19 -11 -34 0q-15 -8 -24 -1Z`, '#73504d');
      svg += line(x + 1, 474, x + 1, 549, '#2d3338', 1.5, .86);
    }
    return svg;
  }

  function studio(rng, angle) {
    const offset = angle * 113;
    let svg = rect(26, 38, 659, 437, '#222b4b', 1, 9);
    svg += rect(40, 53, 631, 392, 'url(#water)', 1, 3);
    svg += dot(426 - offset, 237, 126, 'url(#halo)', 0.45);
    svg += range(22, (index) => {
      const x = 42 + index * 28;
      const y = 235 + rng() * 170;
      const w = 16 + rng() * 39;
      return rect(x, y, w, 446 - y, index % 2 ? '#152341' : '#1c2841') +
        range(8, (row) => {
          const left = x + 5 + (row % 2) * 8;
          const top = y + 10 + Math.floor(row / 2) * 18;
          return rect(left, top, 3, 5, row % 3 ? '#87a9e1' : '#e989bb', rng() * .67);
        });
    });
    svg += line(353, 47, 353, 459, '#0a182c', 9, .97) + line(36, 305, 672, 305, '#0a182c', 6, .97);
    svg += range(64, () => {
      const x = 44 + rng() * 606;
      const y = 56 + rng() * 378;
      return line(x, y, x - 1, y + 3 + rng() * 27, '#95aadd', 1, .09 + rng() * .31);
    });
    svg += path('M0 467L960 433V640H0Z', '#101523') + path('M0 486L960 466V640H0Z', '#202031');
    svg += path(`M${412 - offset} 483h230l71 126h-341Z`, '#443851', .78);
    svg += path(`M${419 - offset} 479h211l39 96h-268Z`, '#121921');
    svg += range(24, (index) => {
      const x = 420 + index % 8 * 29 - offset;
      const y = 494 + Math.floor(index / 8) * 21;
      return rect(x, y, 24, 15, '#667591', index % 5 ? .4 : .73, 2);
    });
    svg += dot(785 - offset / 4, 365, 154, 'url(#halo)', .85);
    svg += path(`M${746 - offset / 4} 332q30 -34 66 0l33 41h-130Z`, '#d5a1ae');
    svg += line(782 - offset / 4, 317, 816 - offset / 4, 491, '#68485f', 9);
    svg += line(779 - offset / 4, 498, 862 - offset / 4, 498, '#947087', 7);
    return svg;
  }

  function rooftop(rng, angle) {
    const sun = 723 - angle * 204;
    let svg = dot(sun, 165, 133, 'url(#halo)', 1) + dot(sun, 181, 36, '#ffe5a7', .97);
    svg += range(22, () => {
      const x = rng() * width;
      const y = 102 + rng() * 220;
      return line(x, y, x + 42 + rng() * 160, y - 2, '#fff3dc', 1.5 + rng() * 4, .15 + rng() * .34);
    });
    svg += ridge(rng, 363, 39, '#8a6272', .45);
    svg += range(20, (i) => {
      const x = -25 + i * 53;
      const y = 305 + rng() * 120;
      const fill = ['#ab766a', '#946c75', '#cb8c72', '#c08c7c'][i % 4];
      return rect(x, y, 53 + rng() * 25, 175, fill) + rect(x + 9, y + 9, 16, 8, '#e4b097', .7);
    });
    svg += path('M0 492L960 414V640H0Z', '#dac2a1') + path('M0 529L960 438V640H0Z', 'url(#water)');
    svg += range(14, (index) => line(index * 83 - 75, 530 - index * 7, index * 96 - 57, 640, '#9c6c60', 1, .46));
    svg += dot(239 + angle * 212, 510, 109, '#ab6558', .5);
    svg += dot(229 + angle * 212, 500, 105, '#e8cba4') + dot(228 + angle * 212, 499, 89, '#f3e6c4');
    svg += range(7, (index) => {
      const a = index * .90 + angle * .83;
      const x = 226 + angle * 212 + Math.cos(a) * (25 + rng() * 36);
      const y = 496 + Math.sin(a) * (21 + rng() * 37);
      return dot(x + 5, y + 6, 21, '#a35b42', .45) + dot(x, y, 22, ['#e06e43', '#e88444', '#ed9d52'][index % 3]) + dot(x - 5, y - 6, 8, '#fac170', .64);
    });
    svg += path(`M${206 + angle * 212} 516q-34 -35 -56 0q32 12 56 0ZM${246 + angle * 212} 477q12 -49 54 -32q-16 36 -54 32Z`, '#788367');
    return svg;
  }

  function winter(rng, angle) {
    const x = 604 - angle * 206;
    const lamp = 724 - angle * 190;
    let svg = dot(832 - angle * 186, 132, 124, 'url(#halo)', .65) + dot(832 - angle * 186, 132, 21, '#bbc7d8', .72);
    svg += ridge(rng, 373, 68, '#33455d', .88) + path('M0 383Q390 358 960 388V640H0Z', 'url(#water)');
    svg += path('M352 640L615 388L708 392L960 638Z', '#50637a', .7);
    svg += range(31, (index) => line(13 + rng() * width, 439 + rng() * 200, 33 + rng() * width, 448 + rng() * 200, '#9fb5ca', .9, index % 4 ? .15 : .29));
    svg += range(22, () => {
      const bx = 12 + rng() * width;
      const by = 352 + rng() * 56;
      const top = 136 + rng() * 215;
      if (bx > x - 110 && bx < x + 267) return '';
      return line(bx, by, bx - 10, top, '#1c2d44', 2 + rng() * 3.8, .83) +
        line(bx - 4, top + 40, bx + 25, top + 6, '#1c2d44', 1.4, .83) +
        line(bx - 5, top + 33, bx - 26, top + 2, '#1c2d44', 1.1, .83);
    });
    svg += rect(x - 105, 280, 252, 157, '#30445e', .89) + rect(x - 96, 288, 234, 139, '#8198af', .43);
    svg += line(x - 112, 281, x + 154, 281, '#a7b9c9', 7, 1) + line(x - 102, 283, x - 102, 461, '#273a54', 7);
    svg += line(x + 146, 285, x + 146, 459, '#273a54', 7) + line(x + 14, 289, x + 14, 435, '#273a54', 3);
    svg += line(x - 61, 407, x + 116, 407, '#28384a', 10);
    svg += line(lamp, 439, lamp, 157, '#354963', 8) + line(lamp - 33, 159, lamp + 2, 159, '#354963', 8);
    svg += dot(lamp - 33, 166, 103, 'url(#halo)', 1) + dot(lamp - 33, 166, 7, '#fae7bc', .9);
    svg += range(130, () => dot(rng() * width, rng() * height, .42 + rng() * 2.3, '#eaf1f7', .12 + rng() * .57));
    return svg;
  }

  function concert(rng, angle) {
    const lights = [175 + angle * 65, 424 - angle * 81, 729 + angle * 32];
    let svg = rect(111, 97, 740, 354, '#1e172f');
    svg += range(24, (i) => line(120 + i * 32, 98, 120 + i * 32, 462, '#392742', .9, .79));
    svg += rect(115, 316, 724, 148, '#311e3a');
    svg += lights.map((x, i) => {
      const y = 131 + i % 2 * 69;
      const color = ['#f1808d', '#a78be4', '#dc8fb5'][i];
      const aim = 760 - x + angle * 99;
      return path(`M${x - 5} ${y}L${aim - 49} 501L${aim + 95} 501L${x + 4} ${y}Z`, color, .21) +
        dot(x, y, 105, 'url(#halo)', 1) + dot(x, y, 9, color, .9) + dot(x, y, 3, '#ffd8db', 1);
    }).join('');
    svg += path('M108 413q160 -38 347 -13t389 -9v68H114Z', '#86708d', .26);
    svg += path('M196 469q193 -90 361 -8q116 47 230 -11l73 88H134Z', '#a65278', .23);
    svg += range(3, (i) => {
      const x = 376 + i * 114 + angle * 12;
      return dot(x, 356 + i % 2 * 17, 13, '#20182e') + path(`M${x - 17} 378q15 -16 34 0l11 66h-46Z`, '#251a2c') +
        line(x + 25, 376, x + 31, 456, '#c9a4b8', 2, .8);
    });
    svg += range(19, (i) => {
      const x = -17 + i * 55;
      const y = 469 + rng() * 98;
      const fill = i % 3 ? '#191528' : '#2c1a33';
      return dot(x, y, 16 + rng() * 14, fill) + path(`M${x - 39} 640V${y + 46}Q${x} ${y - 7} ${x + 39} ${y + 45}V640Z`, fill);
    });
    return svg;
  }

  function snapshot(config, index, angle) {
    const [top, horizon, ground, light, edge] = config.colors;
    const rng = random(1923 + index * 541 + angle * 287);
    const grain = range(420, () => dot((rng() * width).toFixed(2), (rng() * height).toFixed(2), (rng() * 1.35 + .16).toFixed(2), rng() < .53 ? '#fffff5' : '#111820', (rng() * .15 + .045).toFixed(3)));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>
      <linearGradient id="sky" x2="0" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${horizon}"/></linearGradient>
      <linearGradient id="water" x2="0" y2="1"><stop stop-color="${horizon}"/><stop offset="1" stop-color="${ground}"/></linearGradient>
      <radialGradient id="halo"><stop stop-color="${light}" stop-opacity=".84"/><stop offset="1" stop-color="${light}" stop-opacity="0"/></radialGradient>
      <radialGradient id="vignette" cx="50%" cy="43%" r="74%"><stop offset=".48" stop-color="${edge}" stop-opacity="0"/><stop offset="1" stop-color="${edge}" stop-opacity=".51"/></radialGradient>
      </defs>${rect(0, 0, width, height, 'url(#sky)')}${config.draw(rng, angle)}${rect(0, 0, width, height, 'url(#vignette)')}${grain}</svg>`;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }

  const scenes = [
    {
      text: 'После дождя мы с мамой пошли к реке. Вода почти не двигалась, по ней тянулась медная полоска заката, а от мокрой куртки пахло листвой. Мы присели на берегу и наконец поговорили обо всём, на что летом не было времени. Я долго не хотел уходить.',
      date: '2026-10-18', trackTitle: 'Медленная вода', tempo: 76, energy: .24, tone: 'warm',
      colors: ['#526076', '#a67b70', '#2a4e57', '#f8b188', '#20272c'],
      labels: ['Медная полоска заката', 'Отражение на воде', 'Последние минуты у берега'],
      draw: river, root: 53, mode: [0, 4, 7, 9]
    },
    {
      text: 'До сдачи проекта оставалось полтора часа. В мастерской моргал монитор, за окном соседний офис уже погас, а у меня всё не сходились две последние страницы. Когда файл наконец ушёл, в тишине вдруг стало слышно, как дождь бьётся о окно.',
      date: '2026-11-12', trackTitle: 'Последний экспорт', tempo: 130, energy: .78, tone: 'cool',
      colors: ['#21243e', '#695175', '#182447', '#e694b9', '#13192e'],
      labels: ['Дождь в окне мастерской', 'Лампа над клавиатурой'],
      draw: studio, root: 45, mode: [0, 3, 7, 10]
    },
    {
      text: 'Субботним утром мы вынесли завтрак на крышу. Подруга принесла мандарины, один укатился по плитке, и мы долго смеялись. Солнце нагрело парапет, но воздух был ещё прохладным. Мне хотелось, чтобы это утро шло чуть медленнее.',
      date: '2026-09-05', trackTitle: 'Мандариновый круг', tempo: 104, energy: .56, tone: 'warm',
      colors: ['#dfaaa6', '#edba91', '#b8786c', '#ffe5ab', '#854d4e'],
      labels: ['Тёплый парапет', 'Мандарины на крыше'],
      draw: rooftop, root: 60, mode: [0, 4, 7, 11]
    },
    {
      text: 'На пустой остановке падал мокрый снег. Только одна лампа горела, и под ней белые точки были видны особенно резко. Я проводил друга на автобус и ещё минут десять смотрел на дорогу. Домой ехал в тишине, у окна.',
      date: '2026-11-17', trackTitle: 'Фонарь под снегом', tempo: 64, energy: .17, tone: 'cool',
      colors: ['#273753', '#687c97', '#364d68', '#d6e0df', '#16283d'],
      labels: ['Остановка после отъезда', 'Фонарь и мокрый снег'],
      draw: winter, root: 50, mode: [0, 3, 7, 10]
    },
    {
      text: 'На маленьком концерте мы стояли почти у сцены. Бас шёл в грудь, красный прожектор выхватывал руки, под ногами дрожал пол. Я был вымотан и счастлив одновременно. После последней песни никто не хотел первым открывать дверь на улицу.',
      date: '2026-10-31', trackTitle: 'Пол ещё дрожит', tempo: 145, energy: .93, tone: 'neutral',
      colors: ['#492340', '#814965', '#301b3c', '#e97eac', '#1b1223'],
      labels: ['Красный свет над сценой', 'Руки в фиолетовом дыму'],
      draw: concert, root: 43, mode: [0, 3, 7, 12]
    }
  ];

  const DemoCatalog = scenes.map((scene, index) => ({
    text: scene.text,
    date: scene.date,
    trackTitle: scene.trackTitle,
    tempo: scene.tempo,
    energy: scene.energy,
    tone: scene.tone,
    pictures: scene.labels.map((label, angle) => ({ label, data: snapshot(scene, index, angle) }))
  }));

  const tau = 2 * Math.PI;
  const frequency = (note) => 440 * 2 ** ((note - 69) / 12);
  const audioCache = new Map();

  function demoAudio(index) {
    if (!Number.isInteger(index) || !scenes[index]) throw new RangeError('Unknown demo recording');
    const cached = audioCache.get(index);
    if (cached) return cached;
    const scene = scenes[index];
    const rate = 22050;
    const beat = 60 / scene.tempo;
    const bars = scene.tempo > 120 ? 5 : scene.tempo >= 90 ? 4 : 3;
    const seconds = beat * bars * 4;
    const sampleCount = Math.ceil(seconds * rate);
    const wav = new Uint8Array(44 + sampleCount * 2);
    const header = new DataView(wav.buffer);
    const mark = (offset, word) => { for (let i = 0; i < word.length; i++) wav[offset + i] = word.charCodeAt(i); };
    mark(0, 'RIFF');
    header.setUint32(4, wav.length - 8, true);
    mark(8, 'WAVE');
    mark(12, 'fmt ');
    header.setUint32(16, 16, true);
    header.setUint16(20, 1, true);
    header.setUint16(22, 1, true);
    header.setUint32(24, rate, true);
    header.setUint32(28, rate * 2, true);
    header.setUint16(32, 2, true);
    header.setUint16(34, 16, true);
    mark(36, 'data');
    header.setUint32(40, sampleCount * 2, true);
    const progression = index === 2 ? [0, 5, 2, 7] : index === 4 ? [0, -3, 0, 2] : [0, -3, 5, 2];
    const melody = [0, 2, 1, 3, 2, 0, 1, 2];
    const arpeggio = index === 0 || index === 3 ? 1 : .5;
    const noise = random(8762 + index);
    for (let i = 0; i < sampleCount; i++) {
      const t = i / rate;
      const beatsElapsed = t / beat;
      const root = scene.root + progression[Math.floor(beatsElapsed / 4) % progression.length];
      const step = Math.floor(beatsElapsed / arpeggio);
      const tick = t - step * beat * arpeggio;
      const note = frequency(root + 12 + scene.mode[melody[step % melody.length]]);
      const envelope = Math.min(1, tick / .017) * Math.exp(-tick * (2.2 + scene.energy * 7));
      const lead = (Math.sin(tau * note * tick) + Math.sin(tau * note * 2 * tick) * (.13 + scene.energy * .3)) * envelope;
      const beatTick = t - Math.floor(beatsElapsed) * beat;
      const bassFreq = frequency(root - (index === 0 || index === 3 ? 0 : 12));
      const bass = Math.sin(tau * bassFreq * beatTick) * Math.min(1, beatTick / .015) * Math.exp(-beatTick * 4.7);
      const kick = Math.sin(tau * (42 * beatTick + 5 * (1 - Math.exp(-beatTick * 17)))) * Math.exp(-beatTick * 31);
      const hatT = t - Math.floor(beatsElapsed * 2) * beat / 2;
      const hat = (noise() * 2 - 1) * Math.exp(-hatT * 62);
      const fade = Math.min(1, t / .04, (seconds - t) / .32);
      const sample = (lead * .27 + bass * .15 + kick * .25 * scene.energy + hat * .088 * scene.energy) * fade;
      header.setInt16(44 + i * 2, Math.round(32767 * sample), true);
    }
    const blob = new Blob([wav], { type: 'audio/wav' });
    audioCache.set(index, blob);
    return blob;
  }

  return { DemoCatalog, demoAudio };
})();

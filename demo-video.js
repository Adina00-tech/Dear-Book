"use strict";

(function demoVideoModule() {
  const width = 1280;
  const height = 720;
  const duration = 36;
  const ink = "#252d2c";
  const secondary = "#52615e";
  const teal = "#427e75";
  const paper = "#ecf0ed";
  const hairline = "#b3c0ba";
  const legend = [
    ["#d77868", "Коралловый", "Импульс и движение"],
    ["#d4a860", "Охра", "Тепло и близость"],
    ["#91a984", "Шалфейный", "Пауза и лёгкость"],
    ["#72a6a7", "Бирюзовый", "Свежесть и простор"],
    ["#526986", "Тёмно-синий", "Тишина с грустью"],
    ["#9b83a4", "Сиреневый", "Задумчивость"]
  ];

  function box(context, x, y, w, h, radius, fill, stroke) {
    context.beginPath();
    context.roundRect(x, y, w, h, radius);
    if (fill) {
      context.fillStyle = fill;
      context.fill();
    }
    if (stroke) {
      context.strokeStyle = stroke;
      context.lineWidth = 1;
      context.stroke();
    }
  }

  function text(context, value, x, y, size = 20, options = {}) {
    context.font = `${options.weight || 400} ${size}px ${options.family || "Arial, sans-serif"}`;
    context.fillStyle = options.color || ink;
    context.textBaseline = "top";
    if (options.maxWidth) context.fillText(String(value), x, y, options.maxWidth);
    else context.fillText(String(value), x, y);
  }

  function wrapped(context, value, x, y, w, size, lines, color = secondary, font = "Arial, sans-serif") {
    context.font = `400 ${size}px ${font}`;
    const words = String(value || "").trim().split(/\s+/);
    const output = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width > w && line) {
        output.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) output.push(line);
    output.slice(0, lines).forEach((value, index) => {
      const remaining = index === lines - 1 && output.length > lines;
      text(context, value + (remaining ? "…" : ""), x, y + index * (size + 9), size, {color, family: font, maxWidth:w});
    });
  }

  function photo(context, picture, x, y, w, h) {
    box(context, x, y, w, h, 10, "#d5ddd8");
    if (!picture) return;
    const ratio = Math.max(w / picture.naturalWidth, h / picture.naturalHeight);
    const iw = picture.naturalWidth * ratio;
    const ih = picture.naturalHeight * ratio;
    context.save();
    box(context, x, y, w, h, 10);
    context.clip();
    context.drawImage(picture, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
    context.restore();
  }

  function caption(context, title, copy, stage) {
    box(context, 47, 608, 1186, 66, 15, "#f8fbf7", hairline);
    box(context, 66, 622, 34, 34, 17, teal);
    text(context, String(stage), 78, 630, 16, {color:"#fff",weight:700});
    text(context, title, 116, 619, 17, {weight:700});
    wrapped(context, copy, 116, 643, 1085, 16, 1);
  }

  function shell(context, tab) {
    context.fillStyle = paper;
    context.fillRect(0, 0, width, height);
    const wash = context.createRadialGradient(970, 104, 50, 935, 200, 960);
    wash.addColorStop(0, "#f8fcf6");
    wash.addColorStop(0.6, "#e7eeea");
    wash.addColorStop(1, "#c7d1cd");
    context.fillStyle = wash;
    context.fillRect(0, 0, width, height);
    for (let y = 0; y < height; y += 4) {
      context.fillStyle = "rgba(57, 83, 73, .045)";
      context.fillRect(0, y, width, 1);
    }

    const toolbar = context.createLinearGradient(0, 25, 0, 80);
    toolbar.addColorStop(0,"#fff");
    toolbar.addColorStop(0.48,"#e9efeb");
    toolbar.addColorStop(1,"#cdd8d3");
    box(context, 47, 24, 1186, 56, 16, toolbar, hairline);
    const light = context.createRadialGradient(76, 44, 2, 80, 51, 13);
    light.addColorStop(0,"#e0f9d9");
    light.addColorStop(1,teal);
    box(context, 68, 40, 24, 24, 12, light, "#627f72");
    text(context, "DearBook", 108, 40, 22, {weight:700});
    box(context, 1015, 35, 196, 33, 16, "rgba(255,255,255,.64)", hairline);
    box(context, tab === "Архив" ? 1115 : 1017, 37, tab === "Архив" ? 93 : 101, 29, 14, "#fff", "#c0ccc6");
    text(context, "Запись", 1035, 44, 16, {weight:tab === "Архив" ? 400 : 700});
    text(context, "Архив", 1134, 44, 16, {weight:tab === "Архив" ? 700 : 400});
  }

  function wheel(context, x, y, scale, time, active) {
    const shape = Math.PI / 3;
    const radius = 93 * scale;
    context.save();
    context.translate(x, y);
    const rotation = time * (active ? 0.72 : 0.08);
    const rim = context.createRadialGradient(-23, -33, 12, 0, 0, radius + 16);
    rim.addColorStop(0, "#fff");
    rim.addColorStop(1, "#d2ded7");
    context.beginPath();
    context.arc(0, 0, radius + 12, 0, Math.PI * 2);
    context.fillStyle = rim;
    context.fill();
    context.strokeStyle = hairline;
    context.stroke();
    for (let i = 0; i < legend.length; i++) {
      const start = i * shape + rotation - Math.PI / 2;
      context.beginPath();
      context.arc(0, 0, radius, start + 0.017, start + shape - 0.017);
      context.arc(0, 0, radius * 0.48, start + shape - 0.037, start + 0.037, true);
      context.closePath();
      context.fillStyle = legend[i][0];
      context.fill();
    }
    const gloss = context.createRadialGradient(-13, -16, 5, 0, 0, radius * 0.6);
    gloss.addColorStop(0,"#fff");
    gloss.addColorStop(1,"#d7e5dc");
    context.beginPath();
    context.arc(0, 0, radius * 0.44, 0, Math.PI * 2);
    context.fillStyle = gloss;
    context.fill();
    context.fillStyle = teal;
    context.beginPath();
    context.arc(0, 0, scale * 9, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function aquabutton(context, label, data) {
    const {x,y,w} = data;
    const aqua = context.createLinearGradient(x,y,x,y+40);
    aqua.addColorStop(0, "#f0faf4");
    aqua.addColorStop(.51, "#b2cebd");
    aqua.addColorStop(1, "#87ad9e");
    box(context,x,y,w,40,20,aqua,"#739689");
    text(context,label,x+17,y+10,17,{weight:700,maxWidth:w-34});
  }

  function recordScene(context, scene, time, sample, result, days, photos) {
    shell(context, scene === 3 ? "Архив" : "Запись");

    if (scene === 0) {
      text(context, "Как прошёл", 91, 147, 69, {family:"Georgia, serif"});
      text(context, "твой день?", 91, 221, 69, {family:"Georgia, serif"});
      wrapped(context, "Запиши один момент, добавь фотографии и песню. Дневник соберёт из них палитру воспоминания.", 94, 326, 575, 27, 3);
      aquabutton(context, "Начать запись", {x:94,y:444,w:175});
      box(context, 773, 113, 429, 452, 22, "rgba(255,255,255,.66)", hairline);
      text(context, "Колесо оттенков", 806, 135, 22, {weight:700});
      wheel(context, 986, 284, 1.02, time, false);
      const selected = legend[[0, 4, 1][Math.min(2, Math.floor(time / 1.9))]];
      box(context, 804, 441, 364, 70, 13, "#fff", hairline);
      box(context, 826, 456, 34, 34, 17, selected[0]);
      text(context, selected[1], 880, 452, 19, {weight:700});
      text(context, selected[2], 880, 478, 17, {color:secondary});
      caption(context, "Колесо связывает оттенки с ощущениями.", "Запись начинает формироваться ещё до сборки мудборда.", 1);
      return;
    }

    if (scene === 1) {
      box(context,47,105,737,461,18,"rgba(255,255,255,.76)",hairline);
      text(context,"Запись дня",78,131,34,{family:"Georgia, serif"});
      text(context,"Что запомнилось",79,191,18,{weight:700});
      box(context,78,216,672,131,12,"#fcfdfb",hairline);
      const shown = Math.max(1, Math.round(String(sample.text).length * Math.min(1,(time - 5.7) / 3.1)));
      wrapped(context, String(sample.text).slice(0,shown), 94,233,631,19,4,ink);
      if (time >= 9.0) {
        text(context,"Фотографии",79,370,18,{weight:700});
        photos.slice(0,3).forEach((item,index) => photo(context,item,79+105*index,399,92,64));
      }
      if (time >= 11.2) {
        text(context,"Песня",421,370,18,{weight:700});
        wrapped(context,sample.trackTitle || "Песня дня",421,403,301,21,2,ink);
      }
      if (time > 12.8) aquabutton(context,"Собрать мудборд",{x:79,y:491,w:198});
      box(context,807,105,426,461,18,"rgba(255,255,255,.68)",hairline);
      text(context,"Колесо оттенков",837,132,22,{weight:700});
      wheel(context,1021,304,1.2,time-5.7,true);
      text(context,time >= 11.2 ? "Текст · фото · музыка" : time >= 9.0 ? "Текст · фото" : "Текст",867,477,24,{color:teal,weight:700});
      caption(context,"Собираем один день.","Описание задаёт сюжет, фотографии дают палитру, музыка меняет ритм.",2);
      return;
    }

    const palette = result.palette || [];
    if (scene === 2) {
      const accent = palette[0]?.hex || teal;
      box(context,47,103,1186,464,18,"#fafbf7",hairline);
      box(context,48,104,1184,8,4,accent);
      text(context, "Воспоминание дня", 76, 128, 17, {color:secondary,weight:700});
      text(context,result.title || "День из дневника",76,156,39,{family:"Georgia, serif",maxWidth:1109});
      const first = Math.floor((time-14.5)/4) % Math.max(1,photos.length);
      photo(context,photos[first],76,215,502,255);

      if (palette.length) {
        const swatchW = 502 / palette.length;
        palette.forEach((color,index) => box(context,76+swatchW*index,483,swatchW-2,24,5,color.hex));
      }
      text(context, "♪  " + (sample.trackTitle || "Песня дня"), 76, 526, 17, {weight:700,maxWidth:502});
      wrapped(context, result.description, 620, 215, 574, 22, 3,ink,"Georgia, serif");

      const colorsToShow = palette.slice(0,3);
      colorsToShow.forEach((color,index) => {
        const y = 321 + index * 70;
        box(context,620,y+5,40,40,10,color.hex);
        const name = color.name || color.hex;
        text(context,name,677,y,19,{weight:700,maxWidth:497});
        wrapped(context,color.meaning || color.evidence,677,y+27,504,17,2);
      });
      caption(context,"Цвет превращает детали в воспоминание.","В карточке видны оттенки кадра, их ассоциации и связь с настроением дня.",3);
      return;
    }

    if (time >= 32) {
      box(context,47,104,1186,467,19,"rgba(255,255,255,.84)",hairline);
      text(context, "Архив  /  Папка дня", 82, 134, 18, {color:secondary,weight:700});
      text(context,result.title || "День из дневника",82,165,41,{family:"Georgia, serif",maxWidth:1111});
      photo(context,photos[0],83,229,481,292);
      wrapped(context,sample.text,603,228,585,22,6,ink,"Georgia, serif");
      const swatchW = Math.min(103, 547 / Math.max(1,palette.length));
      palette.forEach((color,index) => box(context,603+swatchW*index,425,swatchW-5,35,10,color.hex));
      text(context,"♪  "+(sample.trackTitle || "Песня дня"),603,485,18,{weight:700,maxWidth:554});
      caption(context,"Из архива снова открывается тот же день.","В папке остаются запись, фотографии, палитра и музыка.",4);
      return;
    }

    text(context,"Архив дней",79,117,47,{family:"Georgia, serif"});
    text(context,"У каждого дня своя папка",82,174,20,{color:secondary});
    days.slice(0,5).forEach((day,index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 82 + col * 380;
      const y = 221 + row * 165;
      const highlighted = day.title === result.title;
      box(context,x,y,350,141,15,highlighted ? "#f3f9f2" : "#f8faf8",highlighted ? teal : hairline);
      box(context,x+24,y+27,56,34,7,highlighted? "#b1cebd" : "#d2ded6",hairline);
      box(context,x+25,y+21,22,9,4,highlighted? "#b1cebd" : "#d2ded6");
      if (day.date) text(context,day.date,x+102,y+28,16,{color:secondary});
      wrapped(context,day.title,x+25,y+77,299,22,2,ink,"Georgia, serif");
    });
    caption(context,"Разные дни в одном дневнике.","Одинаковая структура связывает разные настроения.",4);
  }

  function loadPicture(item) {
    return new Promise(resolve => {
      const source = item && (item.data || item.url || item.src);
      if (!source) {
        resolve(null);
        return;
      }
      const picture = new Image();
      picture.onload = () => resolve(picture);
      picture.onerror = () => resolve(null);
      picture.src = source;
    });
  }

  window.recordDemoVideo = async function recordDemoVideo({sample, result, days=[], audio, onProgress}) {
    if (!sample || !result) throw new Error("Сначала подготовьте демонстрационную запись.");
    if (typeof MediaRecorder !== "function") throw new Error("Для экспорта видео откройте дневник в Chrome или Edge.");
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", {alpha:false});
    if (!context || !canvas.captureStream || !context.roundRect) {
      throw new Error("Этот браузер не записывает видео с холста.");
    }

    const audioFile = audio || sample.audio;
    const Audio = window.AudioContext || window.webkitAudioContext;
    let soundContext;
    let soundSource;
    let stream;
    let frame;
    let recorder;

    try {
      let soundPromise = Promise.resolve(undefined);
      if (Audio && audioFile && typeof audioFile.arrayBuffer === "function") {
        soundContext = new Audio();
        const resume = soundContext.resume();
        soundPromise = Promise.all([resume,audioFile.arrayBuffer()])
          .then(([,bytes]) => soundContext.decodeAudioData(bytes));
      }

      const [rawPhotos, soundBuffer] = await Promise.all([
        Promise.all((sample.pictures || []).map(loadPicture)), soundPromise
      ]);
      const photos = rawPhotos.filter(Boolean);
      if (!photos.length) throw new Error("Не удалось открыть фотографии демонстрационного дня.");
      const entries = days.some(day => day.title === result.title) ?
        days : [{title:result.title,date:sample.date}, ...days];
      recordScene(context, 0, 0, sample, result, entries, photos);
      stream = canvas.captureStream(24);
      if (soundBuffer) {
        const destination = soundContext.createMediaStreamDestination();
        soundSource = soundContext.createBufferSource();
        soundSource.buffer = soundBuffer;
        soundSource.loop = true;
        const volume = soundContext.createGain();
        soundSource.connect(volume).connect(destination);
        const clipStart = soundContext.currentTime + 14.5;
        volume.gain.setValueAtTime(0, clipStart);
        volume.gain.linearRampToValueAtTime(.8, clipStart + .5);
        volume.gain.setValueAtTime(.8, clipStart + 10.5);
        volume.gain.linearRampToValueAtTime(0, clipStart + 11.5);
        for (const track of destination.stream.getAudioTracks()) stream.addTrack(track);
        soundSource.start(clipStart);
      }

      const codecs = soundBuffer ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/mp4"] :
        ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/mp4"];
      const mimeType = codecs.find(codec => MediaRecorder.isTypeSupported(codec));
      recorder = new MediaRecorder(stream, mimeType ? {mimeType, videoBitsPerSecond:4_000_000} : undefined);
      const chunks = [];
      let rejectRecording;
      const completion = new Promise((resolve,reject) => {
        rejectRecording = reject;
        recorder.ondataavailable = event => {
          if (event.data.size > 0) chunks.push(event.data);
        };
        recorder.onerror = event => reject(event.error || new Error("Не удалось записать видео."));
        recorder.onstop = () => {
          if (chunks.length === 0) return reject(new Error("Видео не удалось сохранить."));
          resolve(new Blob(chunks,{type:recorder.mimeType || chunks[0].type || "video/webm"}));
        };
      });

      recorder.start(300);
      const start = performance.now();
      let lastProgress = -1;
      function tick(timestamp) {
        if (recorder.state !== "recording") return;
        const elapsed = (timestamp-start)/1000;
        const scene = elapsed < 5.7 ? 0 : elapsed < 14.5 ? 1 : elapsed < 26 ? 2 : 3;
        try {
          recordScene(context,scene,elapsed,sample,result,entries,photos);
          const progress = Math.max(0, Math.min(1, elapsed / duration));
          if (progress >= 1 || progress - lastProgress > .025) {
            lastProgress = progress;
            if (onProgress) onProgress(progress);
          }
          if (elapsed >= duration) recorder.stop();
          else frame = requestAnimationFrame(tick);
        } catch (error) {
          rejectRecording(error);
        }
      }
      frame = requestAnimationFrame(tick);
      return await completion;
    } finally {
      if (frame) cancelAnimationFrame(frame);
      if (recorder && recorder.state === "recording") recorder.stop();
      if (soundSource) soundSource.disconnect();
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (soundContext) await soundContext.close();
    }
  };
})();

"use strict";

const $ = (id) => document.getElementById(id);
const state = {
  pictures: [],
  quiz: null,
  quizView: null,
  track: null,
  sampleDate: "",
  entries: [],
  examples: [],
  reference: null,
  current: null,
  deletion: null,
  photoJob: 0,
  loadingPhotos: false,
  previewTimer: 0,
  wheelTimer: 0,
  playbackUrl: "",
  voiceRun: 0,
  db: null,
  storageReady: false
};

const wheelGuide = [
  ["#ba6e6d", "Красный", "тепло встречи или напряжение спешки"],
  ["#cc9869", "Янтарный", "уют вечера или тепло, которое хочется удержать"],
  ["#cac187", "Жёлтый", "лёгкость утра или яркая деталь на тихом фоне"],
  ["#85a693", "Зелёный", "свежесть после дождя или пауза, чтобы выдохнуть"],
  ["#465e80", "Тёмно-синий", "прохладный свет, глубина или тихая пауза"],
  ["#8d83a9", "Лиловый", "мечтательность или ощущение незаконченного дня"]
];

const monthDay = new Intl.DateTimeFormat("ru", {day:"numeric",month:"long",timeZone:"UTC"});
const fullDate = new Intl.DateTimeFormat("ru", {day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const encoder = new TextEncoder();

function node(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value !== undefined) element.textContent = value;
  return element;
}

function chip(hex, className = "") {
  const element = node("i", className);
  element.style.setProperty("--swatch", hex);
  element.setAttribute("aria-hidden", "true");
  return element;
}

function status(id, value, error = false) {
  const element = $(id);
  element.textContent = value;
  element.classList.toggle("error", error);
}

function dateLabel(value, formatter = monthDay) {
  return formatter.format(new Date(value + "T12:00:00Z"));
}

function todayKey() {
  const now = new Date();
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part) => String(part).padStart(2, "0")).join("-");
}

function safeLink(value) {
  try {
    const link = new URL(value);
    return link.protocol === "https:" && !link.username && !link.password ? link.href : "";
  } catch {
    return "";
  }
}

function openImage(src) {
  return new Promise((resolve, reject) => {
    const picture = new Image();
    picture.onload = () => resolve(picture);
    picture.onerror = () => reject(new Error("Фото не удалось открыть."));
    picture.src = src;
  });
}

async function loadPhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = await openImage(url);
    const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    context.fillStyle = "#eff2ee";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return {label:file.name, data:canvas.toDataURL("image/jpeg", .86), signals:Engine.photoColors(canvas)};
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function makeExample(sample, index) {
  if (index === 0 && EditorialAssets.length >= 4) {
    sample = {
      ...sample,
      text:"По дороге домой пошёл дождь. Сидел в машине и поймал на телефон, как капли размывают дальний свет. Потом прошёл по тихой улице между домами. Они почти растворились в тумане, а мокрая листва всё ещё была видна.",
      pictures:[EditorialAssets[3],EditorialAssets[1]]
    };
  }
  const pictures = await Promise.all(sample.pictures.map(async (image) => ({
    label:image.label,
    data:image.data,
    signals:Engine.photoColors(await openImage(image.data))
  })));
  const track = {
    title:sample.trackTitle,
    tempo:sample.tempo,
    energy:sample.energy,
    tone:sample.tone,
    method:"авторская музыкальная зарисовка",
    source:"file",
    extension:"wav",
    blob:demoAudio(index)
  };
  const result = analysis(sample.text, pictures, track);
  return {
    id:"example-" + index,
    date:sample.date,
    created:index,
    title:result.title,
    text:sample.text,
    pictures,
    track,
    result,
    demo:true
  };
}

function analysis(text, pictures, track, quiz, song = readingFor(track,{text,quiz})) {
  return Engine.analyze({text,photos:pictures.map((picture) => picture.signals).filter(Boolean),track,quiz,song});
}

function readingFor(track, context) {
  if (!track) return null;
  const reading = SongVibe.describe(track,context);
  return track.vibe ? {...reading,...track.vibe,connection:reading.connection,connectionKind:reading.connectionKind} : reading;
}

function explainFeelings(day, song = readingFor(day.track,day)) {
  return FeelingNarrative.explain({
    text:day.text,
    result:day.result,
    track:day.track,
    quiz:day.quiz,
    song,
    photos:day.pictures?.map((picture) => picture.signals).filter(Boolean),
    reference:day.reference
  });
}

function feelingBand(feelings) {
  const {transition,layers} = feelings;
  if (!transition && !layers?.length) return null;
  const band = node("section","feeling-band");
  const shifts = transition?.kind === "shift";
  band.append(node("h3","",shifts ? "Как менялось ощущение" : "Как сочетаются впечатления"));
  if (transition) {
    const flow = node("div","feeling-flow");
    const separator = node("span","feeling-arrow",shifts ? "→" : "и");
    if (shifts) separator.setAttribute("aria-label","затем");
    flow.append(node("span","feeling-beat",transition.from),separator,node("span","feeling-beat",transition.to));
    band.append(flow);
  }
  if (layers?.length) {
    const grid = node("div","feeling-layers");
    for (const layer of layers) {
      const item = node("div","feeling-layer");
      item.append(node("strong","",layer.name),node("p","",layer.detail));
      grid.append(item);
    }
    band.append(grid);
  }
  return band;
}

function songReading(vibe) {
  const box = node("div", "song-vibe-note");
  const label = node("strong");
  label.append(chip(vibe.hue), document.createTextNode(vibe.label));
  box.append(label, node("p", "", vibe.description), node("small", "", vibe.evidence));
  if (vibe.connection) box.append(node("p","song-connection",vibe.connection));
  return box;
}

function paintWheel(result, label) {
  const colors = result.palette.map(({hex}) => hex);
  $("wheel").style.setProperty("--wheel-colors", [...colors, colors[0]].join(","));
  $("wheelHint").textContent = label;
  renderLegend(result.palette.map(({hex,name,meaning}) => [hex, name, meaning]));
}

function renderLegend(rows) {
  $('legend').replaceChildren(...rows.map(([hex, name, meaning]) => {
    const row = node("div", "legend-row");
    const text = node("span");
    text.append(node("b", "", name), document.createTextNode(" · " + meaning));
    row.append(chip(hex), text);
    return row;
  }));
}

function pulseWheel() {
  clearTimeout(state.wheelTimer);
  $("wheel").classList.add("active");
  state.wheelTimer = setTimeout(() => $("wheel").classList.remove("active"), 1100);
}

function hasQuizAnswers() {
  return Object.values(state.quiz?.answers || {}).some((answer) =>
    Array.isArray(answer) ? answer.length > 0 : typeof answer === "string" ? Boolean(answer.trim()) : Boolean(answer?.id));
}

function refreshQuizButton() {
  const complete = Boolean(state.quiz?.completed);
  const open = $("openAtmosphere");
  open.classList.toggle("aqua",!complete);
  open.classList.toggle("silver",complete);
  open.textContent = complete ? "Изменить ответы" : hasQuizAnswers() ? "Продолжить тест" : "Пройти тест атмосферы";
  $("atmosphereState").textContent = complete ? "Тест пройден · можно собрать день" : hasQuizAnswers() ? "Черновик сохранён · закончи тест" : "Обязательный шаг · 10 вопросов";
}

function rememberQuiz(snapshot) {
  state.quiz = snapshot;
  AtmosphereDiary.saveDraft(snapshot);
  refreshQuizButton();
  queueWheel();
}

function bindAtmosphere() {
  const dialog = $("atmosphereDialog");
  state.quiz = AtmosphereDiary.readDraft();
  state.quizView = AtmosphereQuiz.mount($("atmosphereQuiz"),{
    initial:state.quiz,
    onChange:rememberQuiz,
    onComplete:(snapshot) => {
      rememberQuiz(snapshot);
      dialog.close();
      const missing = [!state.pictures.length && "фото",!state.track && "песню"].filter(Boolean);
      status("entryStatus",missing.length ? "Ответы готовы. Добавь " + missing.join(" и ") + "." : "Ответы готовы. Собери воспоминание.");
    },
    onClose:() => dialog.close()
  });
  state.quiz = state.quizView.getValue();
  refreshQuizButton();
  $("openAtmosphere").addEventListener("click",openAtmosphere);
}

function openAtmosphere() {
  const dialog = $("atmosphereDialog");
  if (dialog.open) return;
  dialog.showModal();
  dialog.querySelector(".quiz-question")?.focus();
}

function renderSongPreview(reading) {
  const preview = $("songPreview");
  preview.hidden = !reading;
  preview.replaceChildren();
  if (!reading) return;
  const caption = node("strong","song-preview-title");
  caption.append(chip(reading.hue),document.createTextNode(reading.label));
  preview.append(caption,node("p","",reading.description));
  if (reading.connection) preview.append(node("p","song-connection",reading.connection));
}

function updateWheel() {
  const text = $("story").value.trim();
  $("resetEntry").hidden = !text && !state.pictures.length && !state.track && !state.loadingPhotos && !hasQuizAnswers();
  if (!text && !state.pictures.length && !state.track && !state.quiz?.completed) {
    renderSongPreview(null);
    MoodTheme.apply(document.documentElement, null, null);
    $("wheel").style.removeProperty("--wheel-colors");
    $("wheelHint").textContent = "Смысл цвета меняется вместе с записью";
    renderLegend(wheelGuide);
    return;
  }
  const quiz = state.quiz?.completed ? state.quiz : null;
  const source = AtmosphereDiary.answerText(quiz,text);
  const vibe = readingFor(state.track,{text,quiz});
  const preview = analysis(source,state.pictures,state.track || undefined,quiz,vibe);
  renderSongPreview(vibe);
  const draft = {text,result:preview,track:state.track,pictures:state.pictures,quiz};
  const profile = AtmosphereDiary.localProfile(draft,vibe);
  const colors = profile?.palette?.length ? profile.palette : explainFeelings(draft,vibe).palette;
  const themed = {...preview,palette:colors};
  MoodTheme.apply(document.documentElement,themed,vibe);
  const stages = [text && "текст", profile && "ответы теста", state.pictures.length && "фото", state.track && "песня"].filter(Boolean);
  paintWheel(themed,"Учтено: " + stages.join(" • "));
}

function queueWheel() {
  pulseWheel();
  clearTimeout(state.previewTimer);
  state.previewTimer = setTimeout(updateWheel, 160);
}

function updateInputs() {
  $("storyCount").textContent = $("story").value.length + " / 5000";
  $("photoLabel").textContent = state.pictures.length ? "Фото · " + state.pictures.length : "Добавить фото";
  $("songLabel").textContent = state.track ? state.track.title : "Добавить песню";
  $("removeMusic").hidden = !state.track;
  const strip = $("photoStrip");
  strip.hidden = !state.pictures.length;
  strip.replaceChildren(...state.pictures.map((picture, index) => {
    const frame = node("div", "photo-thumb");
    const image = node("img");
    image.src = picture.data;
    image.alt = picture.label;
    const remove = node("button", "", "×");
    remove.type = "button";
    remove.setAttribute("aria-label", "Убрать фото " + (index + 1));
    remove.addEventListener("click", () => {
      state.pictures.splice(index, 1);
      updateInputs();
    });
    frame.append(image, remove);
    return frame;
  }));
  queueWheel();
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error("Хранилище браузера недоступно.")); return; }
    const request = indexedDB.open("ottenki-dnya", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("days", {keyPath:"id"});
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Хранилище открыто в другой вкладке."));
  });
}

function dbAction(mode, action) {
  return new Promise((resolve, reject) => {
    const transaction = state.db.transaction("days", mode);
    const request = action(transaction.objectStore("days"));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onabort = transaction.onerror = () => reject(transaction.error || request.error);
  });
}

function archiveDays() {
  const personal = [...state.entries].sort((a,b) => b.date.localeCompare(a.date) || b.created - a.created);
  return personal.concat(state.reference ? [state.reference] : [], state.examples);
}

function openMemory(day) {
  const captureOrder = archiveDays().sort((a,b) =>
    (Number(a.created) || 0) - (Number(b.created) || 0) ||
    a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)));
  const number = Math.max(1, captureOrder.findIndex((entry) => entry.id === day.id) + 1);
  AfterimageOpening.open(day, {number, onReveal: () => showResult(day)});
}

function renderMemoryNavigation() {
  const days = archiveDays();
  const cover = $("afterimageCover");
  const recent = days[0];
  if (!recent?.pictures[0]) {
    cover.replaceChildren();
    delete cover.dataset.day;
    cover.setAttribute("aria-hidden", "true");
  } else if (cover.dataset.day !== String(recent.id)) {
    const button = node("button", "afterimage-home__preview");
    button.type = "button";
    const image = node("img", "afterimage-home__photo");
    image.src = recent.pictures[recent.reference ? 1 : 0]?.data || recent.pictures[0].data;
    image.alt = "";
    const caption = node("span", "afterimage-home__caption");
    const date = node("time", "", dateLabel(recent.date, fullDate));
    date.dateTime = recent.date;
    caption.append(node("span", "", recent.demo ? "Пример воспоминания" : "Последнее воспоминание"),
      node("strong", "", recent.title), date);
    button.append(image, caption);
    button.addEventListener("click", () => openMemory(recent));
    cover.replaceChildren(button);
    cover.dataset.day = String(recent.id);
    cover.removeAttribute("aria-hidden");
  }
  AfterimageRevisit.render($("afterimageRevisit"), days, {onOpen:openMemory});
}

function renderArchive() {
  const query = $("query").value.trim().toLocaleLowerCase("ru");
  const all = archiveDays();
  const matches = all.filter((day) =>
    [day.title, day.date, dateLabel(day.date, fullDate), day.text, day.quiz?.answers?.memory, day.result.mood, day.track.title]
      .join(" ").toLocaleLowerCase("ru").includes(query));
  $("count").textContent = all.length || "";
  const buttons = matches.map((day) => {
    const card = node("button", day.reference ? "folder folder-reference" : "folder");
    card.type = "button";
    const image = node("img", "folder-image");
    image.src = day.pictures[day.reference ? 1 : 0].data;
    image.alt = "";
    image.loading = "lazy";
    const body = node("span", "folder-body");
    const meta = node("span", "folder-meta");
    meta.append(node("span", "", dateLabel(day.date)), node("span", "", day.reference ? "Из референсов" : day.demo ? "Пример" : day.result.mood));
    const palette = node("span", "folder-palette");
    palette.append(...(day.quizPalette || day.result.palette.map(({hex}) => hex)).map((hex) => chip(hex)));
    body.append(meta, node("span", "folder-title", day.title), palette);
    const frame = node("span", "afterimage-folder-frame");
    frame.append(image);
    card.append(frame, body);
    card.addEventListener("click", () => openMemory(day));
    return card;
  });
  $("folders").replaceChildren(...(buttons.length ? buttons : [node("p","empty",query ? "Ничего не найдено." : "Здесь появятся сохранённые дни.")]));
}

function isPersonalMemory(day) {
  return !day.demo && !day.reference && state.entries.includes(day);
}

function isDeletingMemory(day) {
  return state.deletion?.pending && state.deletion.day === day;
}

async function updatePersonalMemory(day, fields) {
  if (!state.storageReady || !isPersonalMemory(day) || isDeletingMemory(day)) return false;
  try {
    const existing = await dbAction("readwrite", (store) => {
      const request = store.get(day.id);
      request.onsuccess = () => {
        // A result arriving after deletion must never recreate the record.
        if (request.result) store.put({...request.result, ...fields});
      };
      return request;
    });
    return Boolean(existing);
  } catch {
    return false;
  }
}

async function addDayPin(day, id) {
  const current = day.pinterest || PinterestMood.snapshot(day,state.entries);
  const updated = {...current, extras:[...(current.extras || []),id]};
  day.pinterest = updated;
  return updatePersonalMemory(day, {pinterest:updated});
}

async function saveAtmosphereReading(day,reading) {
  if ((!isPersonalMemory(day) && !day.demo) || isDeletingMemory(day)) return;
  day.atmosphereAI = {...reading,interpretationVersion:2};
  if (isPersonalMemory(day) && state.storageReady) {
    const saved = await updatePersonalMemory(day, {atmosphereAI:day.atmosphereAI});
    if (!isPersonalMemory(day) || isDeletingMemory(day)) return;
    if (!saved) status("archiveStatus","Интерпретация осталась в этой вкладке. Её можно скачать в папке дня.",true);
  }
  if (state.current === day) showResult(day,false);
}

async function saveReflection(day, reflection) {
  if (!await updatePersonalMemory(day, {reflection})) return false;
  day.reflection = reflection;
  return true;
}

function askToDeleteMemory(day) {
  const dialog = $("deleteMemoryDialog");
  if (!isPersonalMemory(day) || dialog.open) return;
  state.deletion = {day, pending:false};
  $("deleteMemoryName").textContent = day.title;
  status("deleteMemoryStatus", "");
  dialog.showModal();
}

async function deleteMemory(event) {
  event.preventDefault();
  const deletion = state.deletion;
  if (!deletion || deletion.pending || !isPersonalMemory(deletion.day)) return;

  const {day} = deletion;
  deletion.pending = true;
  $("confirmMemoryDelete").disabled = true;
  $("cancelMemoryDelete").disabled = true;
  status("deleteMemoryStatus", "Удаляем воспоминание…");
  try {
    if (state.storageReady) await dbAction("readwrite", (store) => store.delete(day.id));
  } catch {
    status("deleteMemoryStatus", "Не удалось удалить воспоминание. Попробуй ещё раз.", true);
    return;
  } finally {
    deletion.pending = false;
    $("confirmMemoryDelete").disabled = false;
    $("cancelMemoryDelete").disabled = false;
  }

  state.entries = state.entries.filter((entry) => entry.id !== day.id);
  $("deleteMemoryDialog").close();
  state.deletion = null;
  if (state.current === day) {
    stopMemoryPlayback();
    state.current = null;
    $("result").hidden = true;
    $("result").replaceChildren();
    updateWheel();
  }
  renderArchive();
  renderMemoryNavigation();
  if (location.hash !== "#archive") history.replaceState(history.state, "", "#archive");
  updateTabs();
  status("archiveStatus", "Воспоминание удалено.");
  focusMemorySection($("archive"), $("archiveTitle"));
}

function focusMemorySection(section, heading) {
  heading.tabIndex = -1;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!heading.isConnected || document.querySelector("dialog[open]")) return;
      heading.focus({preventScroll:true});
      section.scrollIntoView({behavior:"instant", block:"start"});
    });
  });
}

function stopMemoryPlayback() {
  state.voiceRun++;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  $("result").querySelector("audio")?.pause();
  if (state.playbackUrl) URL.revokeObjectURL(state.playbackUrl);
  state.playbackUrl = "";
}

function atmosphereColors(profile, ai, fallback) {
  if (!profile?.palette?.length) return fallback;
  const notes = Array.isArray(ai?.paletteNotes) ? ai.paletteNotes : [];
  return profile.palette.map((color) => {
    const note = notes.find((item) => item.hex?.toLowerCase() === color.hex.toLowerCase());
    return note?.meaning ? {...color,detail:note.meaning} : color;
  });
}

function showResult(day, scroll = true) {
  const preservedLetters = !scroll && state.current === day
    ? $("result").querySelector(".afterimage-reflection")
    : null;
  state.current = day;
  stopMemoryPlayback();

  const {result} = day;
  const songVibe = readingFor(day.track,day);
  const feelings = explainFeelings(day,songVibe);
  const profile = AtmosphereDiary.localProfile(day,songVibe);
  const ai = profile && day.atmosphereAI?.interpretationVersion === 2 ? day.atmosphereAI : null;
  const palette = atmosphereColors(profile,ai,feelings.palette);
  const themed = {...result,palette};
  const composition = AtmosphereDiary.design(day,result);
  clearTimeout(state.previewTimer);
  MoodTheme.apply(document.documentElement,themed,songVibe);
  paintWheel(themed,"Палитра открытой записи");
  const memory = node("article", scroll ? "memory afterimage-develop" : "memory");
  const hero = node("div", "memory-top");
  hero.style.setProperty("--accent", palette[0].hex);
  hero.style.setProperty("--fade", composition.transition + "s");
  hero.style.setProperty("--sat", .72 + result.energy * .55);
  hero.style.setProperty("--contrast", 1 + Number(result.contrast || 0) * .24);
  hero.dataset.motion = composition.motion;
  if (composition.style) hero.dataset.scene = composition.style;
  if (composition.texture) hero.dataset.atmosphereTexture = composition.texture;
  const images = node("div", "memory-images");
  const frames = day.pictures.map((picture, index) => {
    const image = node("img", index === 0 ? "current" : "");
    image.src = picture.data;
    image.alt = picture.label;
    image.setAttribute("aria-hidden", index !== 0);
    return image;
  });
  images.append(...frames);
  const copy = node("div", "memory-copy");
  const time = node("time", "", dateLabel(day.date, fullDate));
  time.dateTime = day.date;
  const h2 = node("h2", "", day.title);
  h2.id = "resultTitle";
  copy.append(time, h2, node("p", "", ai?.summary || profile?.summary || feelings.summary || result.description));
  hero.append(images, copy);
  let slide = 0;
  let audioClock = null;
  let anchorFrame = 0;
  let anchorTime = 0;
  const slides = node("div", "slides");
  const slideButtons = day.pictures.map((_, index) => {
    const button = node("button", "", index + 1);
    button.type = "button";
    button.setAttribute("aria-label", "Кадр " + (index + 1));
    button.setAttribute("aria-pressed", index === 0);
    return button;
  });
  function goFrame(index) {
    slide = index;
    frames.forEach((frame, number) => {
      frame.classList.toggle("current", number === index);
      frame.setAttribute("aria-hidden", number !== index);
      slideButtons[number].setAttribute("aria-pressed", number === index);
    });
  }
  if (frames.length > 1) {
    slideButtons.forEach((button, index) => {
      button.addEventListener("click", () => {
        anchorFrame = index;
        anchorTime = audioClock?.currentTime ?? 0;
        goFrame(index);
      });
      slides.append(button);
    });
    copy.append(slides);
  }

  const content = node("div", "memory-content");
  const paletteBlock = node("section", "palette-block");
  paletteBlock.append(node("h3", "", "Почему эти цвета"),
    node("p","palette-prompt",day.reference ? "Что в референсах и звуке даёт оттенкам смысл." : "Одна деталь из дня может изменить смысл целого оттенка."));
  const paletteList = node("div", "palette-list");
  for (const color of palette) {
    const row = node("div", "palette-row");
    const swatch = chip(color.hex);
    swatch.className = "";
    const words = node("div","palette-context");
    const meta = node("div","palette-meta");
    meta.append(node("b","",color.name),node("code","",color.hex.toUpperCase()));
    if (color.role) meta.append(node("span","palette-role",color.role));
    words.append(meta,node("p","palette-meaning",color.meaning),node("p","palette-evidence",color.evidence));
    if (color.detail) words.append(node("p","palette-detail",color.detail));
    row.append(swatch, words);
    paletteList.append(row);
  }
  paletteBlock.append(paletteList);
  const notes = node("aside", "journal-side");
  notes.append(node("h3", "", "Песня дня"), node("p", "", day.track.title));
  if (day.track.source === "file" && day.track.blob instanceof Blob) {
    const player = node("audio");
    player.controls = true;
    player.preload = "metadata";
    player.loop = day.demo;
    state.playbackUrl = URL.createObjectURL(day.track.blob);
    player.src = state.playbackUrl;
    audioClock = player;
    if (frames.length > 1) {
      const followAudio = () => {
        if (motion.matches) return;
        if (player.currentTime < anchorTime) {
          anchorTime = 0;
          anchorFrame = 0;
        }
        const elapsed = Math.max(0,player.currentTime-anchorTime);
        const index = (anchorFrame + Math.floor(elapsed/composition.interval)) % frames.length;
        if (index !== slide) goFrame(index);
      };
      player.addEventListener("play",followAudio);
      player.addEventListener("timeupdate",() => { if (!player.paused) followAudio(); });
      player.addEventListener("seeked",() => {
        anchorTime = 0;
        anchorFrame = 0;
        followAudio();
      });
    }
    notes.append(player);
  } else if (safeLink(day.track.url)) {
    const link = node("a", "link-track", "Открыть песню ↗");
    link.href = safeLink(day.track.url);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    notes.append(link);
  }
  if (songVibe) notes.append(songReading(songVibe));
  const explanation = node("details");
  explanation.append(node("summary", "", "Как собрался мудборд"),
    node("p", "", result.art + ". " + result.technique),
    node("p", "", "Текст · " + result.textClue),
    node("p", "", "Фото · " + result.photoClue),
    node("p", "", "Музыка · " + result.musicClue + " · Кадр около " + Number(composition.interval.toFixed(1)) + " с"));
  const original = node("details");
  original.append(node("summary", "", "Запись дня"), node("p", "", day.text));
  const actions = node("div", "journal-actions");
  const feedback = node("p", "status");
  feedback.setAttribute("role","status");
  if (day.text && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window) {
    const voice = node("button", "silver", "Послушать запись");
    voice.type = "button";
    voice.addEventListener("click", () => speak(day, voice, feedback));
    actions.append(voice);
  }
  const download = node("button", "silver", "Скачать папку ZIP");
  download.type = "button";
  download.addEventListener("click", async () => {
    download.disabled = true;
    try {
      downloadFile(await buildFolder(day), folderName(day) + ".zip");
    } catch {
      feedback.textContent = "Папку не удалось подготовить.";
    } finally {
      download.disabled = false;
    }
  });
  actions.append(download);
  if (isPersonalMemory(day)) {
    const remove = node("button", "silver delete-memory-button", "Удалить воспоминание");
    remove.type = "button";
    remove.addEventListener("click", () => askToDeleteMemory(day));
    actions.append(remove);
  }
  if (day.reference) {
    const openBoard = node("a", "silver open-board", "Открыть полный мудборд");
    openBoard.href = "Мудборд.html";
    actions.prepend(openBoard);
  }
  notes.append(explanation);
  if (day.text) notes.append(original);
  notes.append(actions,feedback);
  content.append(paletteBlock, notes);
  memory.append(hero);
  const band = profile ? AtmosphereDiary.renderSection(day,profile,ai,(reading) => saveAtmosphereReading(day,reading),songVibe) : feelingBand(feelings);
  if (band) memory.append(band);
  if (day.reference) memory.append(EditorialBoard.section(day));
  const letters = preservedLetters || AfterimageReflection.section(day, {
    onSave:day.demo ? undefined : (reflection) => saveReflection(day, reflection)
  });
  memory.append(content, letters, PinterestMood.section(day,(pin) => addDayPin(day,pin)));
  const resultSection = $("result");
  resultSection.replaceChildren(memory);
  resultSection.hidden = false;
  if (scroll) focusMemorySection(resultSection, h2);
}

function speak(day, button, feedback) {
  const previous = state.voiceRun++;
  if (button.getAttribute("aria-pressed") === "true") {
    speechSynthesis.cancel();
    button.textContent = "Послушать запись";
    button.setAttribute("aria-pressed", "false");
    return;
  }
  speechSynthesis.cancel();
  const run = previous + 1;
  const line = new SpeechSynthesisUtterance(day.text);
  line.lang = "ru-RU";
  line.rate = .8 + day.result.energy * .42;
  line.pitch = day.result.soundTone === "cool" ? .88 : 1.02;
  const all = speechSynthesis.getVoices();
  const voices = all.filter((voice) => voice.lang.toLowerCase().startsWith("ru") && voice.localService);
  if (!voices.length) {
    feedback.textContent = "Для озвучки установи локальный русский голос в настройках системы.";
    return;
  }
  line.voice = voices[day.result.energy > .62 ? voices.length - 1 : 0];
  line.onend = line.onerror = () => {
    if (state.voiceRun !== run) return;
    button.textContent = "Послушать запись";
    button.setAttribute("aria-pressed", "false");
  };
  feedback.textContent = "";
  button.setAttribute("aria-pressed", "true");
  button.textContent = "Остановить озвучку";
  speechSynthesis.speak(line);
}

function folderName(day) {
  return (day.date + " — " + day.title).replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 110);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g,(character) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
}

function downloadFile(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = node("a");
  a.download = name;
  a.href = url;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let index = 0; index < 8; index++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipFiles(files) {
  const local = [], central = [];
  let offset = 0, centralSize = 0;
  for (const [name, data] of files) {
    const path = encoder.encode(name);
    const bytes = typeof data === "string" ? encoder.encode(data) : data;
    const info = crc32(bytes);
    const header = new DataView(new ArrayBuffer(30));
    header.setUint32(0, 0x04034b50, true);
    header.setUint16(4, 20, true);
    header.setUint16(6, 0x0800, true);
    header.setUint16(12, 0x0021, true);
    header.setUint32(14, info, true);
    header.setUint32(18, bytes.length, true);
    header.setUint32(22, bytes.length, true);
    header.setUint16(26, path.length, true);
    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint16(14, 0x0021, true);
    entry.setUint32(16, info, true);
    entry.setUint32(20, bytes.length, true);
    entry.setUint32(24, bytes.length, true);
    entry.setUint16(28, path.length, true);
    entry.setUint32(42, offset, true);
    local.push(header.buffer, path, bytes);
    central.push(entry.buffer, path);
    offset += header.byteLength + path.length + bytes.length;
    centralSize += entry.byteLength + path.length;
  }
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...local, ...central, end.buffer], {type:"application/zip"});
}

async function buildFolder(day) {
  const root = folderName(day) + "/";
  const written = day.text || (day.quiz ? AtmosphereQuiz.format(day.quiz) : "");
  const files = [[root + "Дневник.txt", day.title + "\n" + dateLabel(day.date, fullDate) + "\n\n" + written]];
  const pictures = [];
  for (const [index, photo] of day.pictures.entries()) {
    const comma = photo.data.indexOf(",");
    const header = photo.data.slice(0, comma);
    const data = photo.data.slice(comma + 1);
    const type = header.includes("svg+xml") ? "svg" : "jpg";
    const name = "Фото-" + (index + 1) + "." + type;
    const bytes = header.endsWith(";base64")
      ? Uint8Array.from(atob(data), (character) => character.charCodeAt(0))
      : encoder.encode(decodeURIComponent(data));
    pictures.push('<img src="' + name + '" alt="' + escapeHtml(photo.label) + '">');
    files.push([root + name, bytes]);
  }
  let player = "";
  if (day.track.source === "file" && day.track.blob instanceof Blob) {
    const extension = (day.track.extension || (day.demo ? "wav" : "audio")).match(/^[a-z0-9]{2,5}$/)?.[0] || "audio";
    const filename = "Песня." + extension;
    files.push([root + filename, new Uint8Array(await day.track.blob.arrayBuffer())]);
    player = '<audio controls src="' + filename + '"></audio>';
  } else if (safeLink(day.track.url)) {
    files.push([root + "Ссылка на песню.txt", day.track.title + "\n" + day.track.url]);
    player = '<a href="' + escapeHtml(safeLink(day.track.url)) + '">Открыть песню</a>';
  }
  const result = day.result;
  const vibe = readingFor(day.track,day);
  const feelings = explainFeelings(day,vibe);
  const profile = AtmosphereDiary.localProfile(day,vibe);
  const ai = profile && day.atmosphereAI?.interpretationVersion === 2 ? day.atmosphereAI : null;
  const colors = atmosphereColors(profile,ai,feelings.palette);
  const theme = MoodTheme.build({...result,palette:colors},vibe);
  const flowHTML = profile ? '<h2>Атмосфера дня</h2>' + [
    ['В кадре',ai?.visual || profile.visual],['В звуке',ai?.sound || profile.sound],
    ...(ai?.connections?.length ? ai.connections : profile.connections).map((x)=>[x.title,x.detail]),
    ...(ai?.tensions?.length ? ai.tensions : profile.tensions).map((x)=>[x.title,x.detail])
  ].filter(([,value])=>value).map(([label,value])=>'<p><strong>' + escapeHtml(label) + '.</strong> ' + escapeHtml(value) + '</p>').join("") +
    '<details><summary>Ответы теста</summary>' + AtmosphereDiary.answerRows(day.quiz)
      .map(([label,value])=>'<p><strong>' + escapeHtml(label) + '.</strong> ' + escapeHtml(value) + '</p>').join("") + '</details>' : '';
  if (day.quiz) {
    const data=AtmosphereDiary.structuredData(day,profile,vibe);
    files.push([root + "Атмосфера.json",JSON.stringify(data,null,2)]);
  }
  const vibeHTML = vibe ? '<h3>' + escapeHtml(vibe.label) + '</h3><p>' + escapeHtml(vibe.description) +
    '</p><small>' + escapeHtml(vibe.evidence) + '</small>' +
    (vibe.connection ? '<p>' + escapeHtml(vibe.connection) + '</p>' : '') : '';
  const palette = colors.map((color) => '<li><span style="background:' + escapeHtml(color.hex) + '"></span><strong>' +
    escapeHtml(color.name + " · " + color.hex + (color.role ? " · " + color.role : "")) + '</strong><p>' +
    escapeHtml(color.meaning) + '</p><small>' + escapeHtml(color.evidence) + '</small>' +
    (color.detail ? '<p><small>' + escapeHtml(color.detail) + '</small></p>' : '') + '</li>').join("");
  const shifts = feelings.transition?.kind === "shift";
  const separator = shifts ? " → " : " и ";
  const transition = feelings.transition ?
    '<p><strong>' + escapeHtml(feelings.transition.from + separator + feelings.transition.to) + '</strong></p>' : '';
  const layers = (feelings.layers || []).map((layer) =>
    '<p><strong>' + escapeHtml(layer.name) + '.</strong> ' + escapeHtml(layer.detail) + '</p>').join("");
  const emotionalReading = (transition || layers) ? '<h2>' +
    (shifts ? 'Как менялось ощущение' : 'Как сочетаются впечатления') + '</h2>' + transition + layers : '';
  const html = '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>' + escapeHtml(day.title) + '</title>' +
    '<style>body{margin:0 auto;padding:30px 18px;max-width:940px;font:16px/1.5 system-ui;background:' + theme.css["--m-bg"] + ';color:' + theme.css["--ink"] + '}h1{font:clamp(2em,7vw,4em)/1.04 Georgia,serif;margin:6px 0 20px}.photos{display:flex;gap:8px;flex-wrap:wrap}.photos img{flex:1 1 250px;min-width:0;width:100%;max-height:420px;object-fit:cover;border-radius:8px}ul{padding:0;list-style:none}li{padding:12px 0;border-bottom:1px solid ' + theme.css["--m-line"] + '}li span{display:inline-block;width:40px;height:18px;vertical-align:middle;margin-right:8px;border-radius:4px}li p{margin:4px 0}small{color:' + theme.css["--muted"] + '}audio{max-width:100%}.pin-export{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.pin-export figure{margin:0}.pin-export img{width:100%;aspect-ratio:1.25;object-fit:cover;border-radius:6px}.pin-export figcaption{font-size:13px}</style>' +
    '<main><time>' + escapeHtml(dateLabel(day.date, fullDate)) + '</time><h1>' + escapeHtml(day.title) +
    '</h1><div class="photos">' + pictures.join("") + '</div><p>' + escapeHtml(ai?.summary || profile?.summary || feelings.summary || result.description) +
    '</p>' + (profile ? flowHTML : emotionalReading) + (day.reference ? EditorialBoard.exportHtml(day,escapeHtml) : '') +
    '<h2>Почему эти цвета</h2><ul>' + palette + '</ul>' + PinterestMood.exportHtml(day, escapeHtml) +
    '<h2>Песня дня</h2><p>' + escapeHtml(day.track.title) +
    '</p>' + player + vibeHTML + '<details><summary>Запись дня</summary><p style="white-space:pre-wrap">' +
    escapeHtml(written) + '</p></details>' + AfterimageReflection.exportHtml(day,escapeHtml) + '</main></html>';
  files.push([root + "Воспоминание.html", html]);
  files.push([root + "Пины Pinterest.txt", PinterestMood.exportLinks(day)]);
  return zipFiles(files);
}

function switchMusicSource() {
  const source = document.querySelector('input[name="source"]:checked').value;
  $("audioFields").hidden = source !== "file";
  $("linkFields").hidden = source !== "link";
  status("musicStatus", "");
}

function bindEvents() {
  const deleteDialog = $("deleteMemoryDialog");
  $("deleteMemoryForm").addEventListener("submit", deleteMemory);
  $("cancelMemoryDelete").addEventListener("click", () => deleteDialog.close());
  deleteDialog.addEventListener("cancel", (event) => {
    if (state.deletion?.pending) event.preventDefault();
  });
  deleteDialog.addEventListener("close", () => {
    if (!deleteDialog.open) state.deletion = null;
  });

  $("story").addEventListener("input", () => {
    $("storyCount").textContent = $("story").value.length + " / 5000";
    status("entryStatus", "");
    queueWheel();
  });
  $("photoButton").addEventListener("click", () => $("photos").click());
  $("photos").addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    const room = 8 - state.pictures.length;
    if (room < 1) { status("entryStatus", "В одной записи помещается до восьми фото.", true); return; }
    const job = ++state.photoJob;
    state.loadingPhotos = true;
    pulseWheel();
    status("entryStatus", "Читаю цвета и свет на фотографиях…");
    const results = await Promise.allSettled(files.slice(0, room).map((file) => {
      if (file.size > 30 * 1024 * 1024) return Promise.reject(new Error("Фото больше 30 МБ."));
      return loadPhoto(file);
    }));
    if (job !== state.photoJob) return;
    state.loadingPhotos = false;
    state.pictures.push(...results.filter((item) => item.status === "fulfilled").map((item) => item.value));
    const rejected = results.filter((item) => item.status === "rejected").length;
    status("entryStatus", rejected ? "Не все фото открылись. Подойдут JPEG, PNG и WebP до 30 МБ." :
      files.length > room ? "Добавлено максимально возможное число фото (8)." : "", rejected > 0);
    updateInputs();
  });
  $("songButton").addEventListener("click", () => {
    const type = state.track?.source || "file";
    document.querySelector('input[name="source"][value="' + type + '"]').checked = true;
    if (type === "link") {
      $("trackUrl").value = state.track.url;
      $("trackTitle").value = state.track.title;
      $("trackTempo").value = String(state.track.tempo);
      $("trackEnergy").value = Number(state.track.energy).toFixed(2);
      $("trackTone").value = state.track.tone;
    }
    $("audioFile").value = "";
    switchMusicSource();
    $("musicDialog").showModal();
  });
  $("closeMusic").addEventListener("click", () => $("musicDialog").close());
  $("musicDialog").addEventListener("cancel", (event) => {
    if ($("saveMusic").disabled) event.preventDefault();
  });
  document.querySelectorAll('input[name="source"]').forEach((input) => input.addEventListener("change", switchMusicSource));
  $("musicForm").noValidate = true;
  $("removeMusic").addEventListener("click", () => {
    state.track = null;
    $("musicDialog").close();
    updateInputs();
  });
  $("musicForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const source = document.querySelector('input[name="source"]:checked').value;
    if (source === "link") {
      const url = safeLink($("trackUrl").value.trim());
      const title = $("trackTitle").value.trim();
      const tempo = Number($("trackTempo").value);
      const energy = Number($("trackEnergy").value);
      const tone = $("trackTone").value;
      if (!url || !title || !tempo || !energy || !tone) {
        status("musicStatus", "Добавь HTTPS-ссылку, название и характеристики песни.", true);
        return;
      }
      state.track = {source,url,title,tempo,energy,tone,method:"по описанию песни"};
    } else {
      const file = $("audioFile").files[0];
      if (!file) {
        if (state.track?.source === "file") { $("musicDialog").close(); return; }
        status("musicStatus", "Выбери аудиофайл.", true);
        return;
      }
      if (file.size > 35 * 1024 * 1024) { status("musicStatus", "Выбери аудиофайл до 35 МБ.", true); return; }
      $("saveMusic").disabled = true;
      $("closeMusic").disabled = true;
      $("removeMusic").disabled = true;
      pulseWheel();
      status("musicStatus", "Слушаю темп и характер…");
      try {
        const profile = await SongVibe.inspect(await file.arrayBuffer());
        const extension = file.name.split(".").pop().toLowerCase();
        state.track = {...profile,source,blob:file,extension,title:file.name.replace(/\.[^.]+$/, "") || "Песня дня"};
      } catch {
        status("musicStatus", "Аудио не открылось. Попробуй MP3, WAV или ссылку на песню.", true);
        return;
      } finally {
        $("saveMusic").disabled = false;
        $("closeMusic").disabled = false;
        $("removeMusic").disabled = false;
      }
    }
    $("musicDialog").close();
    status("entryStatus", "");
    updateInputs();
  });
  $("entryForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if ($("create").disabled) return;
    const text = $("story").value.trim();
    if (!state.quiz?.completed) {
      status("entryStatus","Сначала пройди тест атмосферы. Он нужен для подбора настроения дня.",true);
      openAtmosphere();
      return;
    }
    if (state.loadingPhotos) { status("entryStatus", "Дождись чтения фотографий."); return; }
    if (!state.pictures.length) { status("entryStatus", "Добавь хотя бы одно фото.", true); $("photoButton").focus(); return; }
    if (!state.track) { status("entryStatus", "Добавь песню дня.", true); $("songButton").focus(); return; }

    $("create").disabled = true;
    pulseWheel();
    status("entryStatus", "Собираю цвета дня…");
    const sourceQuiz = state.quiz;
    const quiz = JSON.parse(JSON.stringify(sourceQuiz));
    const source = AtmosphereDiary.answerText(quiz,text);
    const result = analysis(source,state.pictures,state.track,quiz,readingFor(state.track,{text,quiz}));
    const day = {
      id:globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + "-" + Math.random().toString(36).slice(2),
      date:state.sampleDate || todayKey(),
      created:Date.now(),
      title:result.title,
      text,
      quiz,
      pictures:[...state.pictures],
      track:state.track,
      result,
      interpretationVersion:2
    };
    const profile = AtmosphereDiary.localProfile(day,readingFor(day.track,day));
    if (profile?.palette?.length) day.quizPalette = profile.palette.map(({hex}) => hex);
    day.pinterest = PinterestMood.snapshot(pinContext(day,profile),state.entries);
    let saved = false;
    try {
      if (state.storageReady) {
        await dbAction("readwrite", (store) => store.add(day));
        saved = true;
      }
    } catch {
      status("archiveStatus", "Браузер не смог сохранить одну из записей. Её можно скачать из дневника.", true);
    } finally {
      state.entries.unshift(day);
      const unchanged = state.quiz === sourceQuiz && state.track === day.track && $("story").value.trim() === text &&
        state.pictures.length === day.pictures.length && state.pictures.every((picture,index)=>picture === day.pictures[index]);
      if (unchanged) clearEntryDraft();
      renderArchive();
      renderMemoryNavigation();
      openMemory(day);
      status("entryStatus", saved ? "Запись сохранена в архиве." : "Запись доступна в этой вкладке. Скачай папку, чтобы сохранить её.", !saved);
      $("create").disabled = false;
    }
  });
  $("loadExample").addEventListener("click", () => {
    const day = state.examples.find((item) => item.id === "example-0") || state.examples[0];
    if (!day) { status("entryStatus", "Пример ещё загружается."); return; }
    if (state.loadingPhotos) { state.photoJob++; state.loadingPhotos = false; }
    $("story").value = day.text;
    state.pictures = [...day.pictures];
    state.track = day.track;
    state.sampleDate = day.date;
    status("entryStatus",state.quiz?.completed ? "" : "Пример заполнен. Пройди тест атмосферы, чтобы собрать свою версию.");
    updateInputs();
  });
  $("resetEntry").addEventListener("click", () => {
    clearEntryDraft();
    status("entryStatus","");
    $("story").focus();
  });
  $("composeTab").addEventListener("click", updateWheel);
  $("query").addEventListener("input", renderArchive);
  $("makeVideo").addEventListener("click", async () => {
    const day = state.examples.find((item) => item.id === "example-0") || state.examples[0];
    if (!day || typeof window.recordDemoVideo !== "function") return;
    $("makeVideo").disabled = true;
    try {
      const feelings = explainFeelings(day);
      const blob = await window.recordDemoVideo({
        sample:{...day, trackTitle:day.track.title},
        result:{...day.result, description:feelings.summary || day.result.description, palette:feelings.palette},
        days:state.examples,
        audio:day.track.blob,
        onProgress:(fraction) => status("archiveStatus", "Готовлю видеопоказ · " + Math.round(fraction * 100) + "%")
      });
      downloadFile(blob, "DearBook — видеопоказ." + (blob.type.includes("mp4") ? "mp4" : "webm"));
      status("archiveStatus", "Видеопоказ готов.");
    } catch {
      status("archiveStatus", "Браузер не смог записать видео. Попробуй Chrome или Edge в активной вкладке.", true);
    } finally {
      $("makeVideo").disabled = false;
    }
  });
  window.addEventListener("hashchange", updateTabs);
}

function updateTabs() {
  const sections = ["#home", "#archive", "#create-memory", "#revisit"];
  const section = sections.includes(location.hash) ? location.hash : "#home";
  for (const tab of document.querySelectorAll(".toolbar nav .tab")) {
    const active = tab.getAttribute("href") === section;
    tab.classList.toggle("active", active);
    if (active) tab.setAttribute("aria-current", "location");
    else tab.removeAttribute("aria-current");
  }
}

function clearEntryDraft() {
  state.photoJob++;
  state.loadingPhotos = false;
  state.pictures = [];
  state.track = null;
  state.sampleDate = "";
  state.quizView.setValue(null);
  state.quiz = null;
  AtmosphereDiary.saveDraft(null);
  refreshQuizButton();
  $("story").value = "";
  renderSongPreview(null);
  updateInputs();
}

function pinContext(day, profile) {
  return profile?.palette?.length ? {...day,result:{...day.result,palette:profile.palette}} : day;
}

function refreshSavedDays(days) {
  const byCapture = [...days].sort((a,b) =>
    (Number(a.created)||0)-(Number(b.created)||0) || String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)));
  const refreshed = [];
  for (const saved of byCapture) {
    const song = readingFor(saved.track,saved);
    const isLegacy = saved.interpretationVersion !== 2;
    const result = isLegacy
      ? analysis(AtmosphereDiary.answerText(saved.quiz?.completed ? saved.quiz : null,saved.text),saved.pictures,saved.track,saved.quiz,song)
      : saved.result;
    const day = {...saved,result,interpretationVersion:2};
    const profile = AtmosphereDiary.localProfile(day,song);
    if (isLegacy) {
      day.quizPalette = profile?.palette?.map(({hex})=>hex);
    }
    if (saved.pinterest?.schemaVersion !== 2) {
      const snapshot = PinterestMood.snapshot(pinContext(day,profile),refreshed);
      day.pinterest = {...snapshot,extras:Array.isArray(saved.pinterest?.extras) ? saved.pinterest.extras : []};
    }
    refreshed.push(day);
  }
  return refreshed;
}

async function init() {
  const date = todayKey();
  $("today").dateTime = date;
  $("today").textContent = dateLabel(date);
  $("create").disabled = true;
  $("loadExample").disabled = true;
  MoodTheme.apply(document.documentElement, null, null);
  state.reference = EditorialAssets.length >= 4 ? makeReferenceEntry() : null;
  renderLegend(wheelGuide);
  renderArchive();
  updateTabs();
  bindAtmosphere();
  bindEvents();
  updateWheel();

  const database = openDatabase().then(async (db) => {
    state.db = db;
    const days = await dbAction("readonly", (store) => store.getAll());
    state.entries = refreshSavedDays(days);
    state.storageReady = true;
  }).catch(() => status("archiveStatus", "Постоянный архив недоступен в этом режиме браузера. Папки дней можно скачать.", true));
  const examples = Promise.allSettled(DemoCatalog.map(makeExample)).then((results) => {
    state.examples = results.filter((item) => item.status === "fulfilled").map((item) => item.value);
    if (state.examples.length) {
      $("loadExample").disabled = false;
      $("makeVideo").hidden = typeof window.recordDemoVideo !== "function";
    }
    if (state.examples.length !== DemoCatalog.length) status("archiveStatus", "Не все демонстрационные дни загрузились.", true);
    renderArchive();
  });
  await Promise.all([database, examples]);
  renderArchive();
  renderMemoryNavigation();
  $("create").disabled = false;
}

init().catch(() => status("entryStatus", "Не удалось запустить дневник. Проверь, что все файлы скачаны и лежат рядом.", true));

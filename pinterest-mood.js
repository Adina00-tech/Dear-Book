"use strict";

const PinterestMood = (() => {
  const raw = [["614108099177506088","736x/a8/76/49/a87649165a78e1ce42aee7dab0dbeb3d.jpg","Камера и наушники на бежевой ткани","ivory"],["430938258103723559","originals/58/89/fd/5889fdf5b098feffe02a943c207bc334.jpg","Две белые кружки и провод","ivory"],["49187820922443441","originals/ce/61/eb/ce61ebe30ad048da9208bbab7ee7b007.jpg","Книга, телефон и проводные наушники","graphite"],["296393219249378524","originals/86/c6/ca/86c6ca0d2aaec787167753c280d4f87f.jpg","Кремовые балетки и ткань крупным планом","ivory"],["789748484696177262","originals/25/2b/66/252b6626097484f4a8c89f6862698330.jpg","Мокрый асфальт и невысокие дома","fog"],["909938299714277001","originals/2d/2e/9f/2d2e9f68a84ef8c34ff24e688c5361c3.jpg","Тихий перекрёсток в тумане","fog"],["4292562140411464","originals/bd/bc/41/bdbc41e453dcfb9d80d11f1d881494b0.jpg","Фары на дороге под деревьями","fog"],["1108237420808473346","originals/d2/f6/ab/d2f6ab71db069a350ff413ce0cad0f1a.jpg","Очки на рукописном конспекте","graphite"],["289004501082491565","originals/43/7a/23/437a23e0cf2438ede8a2dd187bfa37ac.jpg","Капли на боковом стекле машины","rain"]];

  // Catalogued visual details. The color is an approximate midtone of the indexed photo.
  const subjects = {
    "614108099177506088": {hex:"#B2A491", motifs:["camera","personal-audio","fabric"]},
    "430938258103723559": {hex:"#D8D1C7", motifs:["drink","personal-audio"]},
    "49187820922443441": {hex:"#837C76", motifs:["reading","personal-audio","desk"]},
    "296393219249378524": {hex:"#DACDC0", motifs:["shoes","fabric"]},
    "789748484696177262": {hex:"#74776D", motifs:["neighborhood","street","wet"], anchors:["neighborhood","street"]},
    "909938299714277001": {hex:"#656B5D", motifs:["neighborhood","fog","lamps"], anchors:["neighborhood","fog"]},
    "4292562140411464": {hex:"#536059", motifs:["street","fog","trees","car"], anchors:["street","fog","trees"]},
    "1108237420808473346": {hex:"#4D4A4A", motifs:["school","reading","paper","glasses","desk"]},
    "289004501082491565": {hex:"#647386", motifs:["rain","glass","car","wet"], anchors:["rain","glass","car"]}
  };

  const catalogue = raw.map(([id, path, title, group]) => ({
    id, src:"https://i.pinimg.com/" + path, title, group, ...subjects[id]
  }));
  const byId = new Map(catalogue.map((pin) => [pin.id,pin]));
  const catalogueId = (id) => (typeof id === "string" || Number.isSafeInteger(id)) && /^\d{5,25}$/.test(String(id));
  const site = (id) => "https://www.pinterest.com/pin/" + id + "/";
  const safeMedia = (url) => /^https:\/\/i\.pinimg\.com\/(?:originals|[0-9]+x)\/[a-f0-9/]+\.(?:jpe?g|png|webp)$/i.test(url || "");

  function parse(value) {
    try {
      const url = new URL(value.trim());
      if (url.protocol !== "https:" || url.username || url.password || url.port ||
          !/^(?:[a-z0-9-]+\.)?pinterest\.(?:com|ca|fr|de|se|ru|co\.uk|com\.au|ch|it|es|jp|at|pt|nl|dk|no|fi|co\.kr|co\.nz)$/.test(url.hostname)) return null;
      const id = url.pathname.match(/^\/pin\/(?:[^/]+--)?(\d{5,25})\/?$/)?.[1];
      return id || null;
    } catch {
      return null;
    }
  }

  const schemaVersion = 2;
  const recentDaysLimit = 7;
  const styleKeys = new Set(["ivory","fog","graphite","rain"]);

  function ids(values) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.filter(catalogueId).map(String))];
  }

  function savedAuto(day) {
    const values = ids(day.pinterest?.auto).filter(id => byId.has(id));
    if (Array.isArray(day.pinterest?.auto) && (day.pinterest.schemaVersion === schemaVersion || values.length)) return values;
    return null;
  }

  function asNumber(day) {
    const date = Date.parse(day.date || "");
    return Number.isFinite(day.created) && day.created > 0 ? day.created : Number.isFinite(date) ? date : 0;
  }

  function recentPins(day, previousDays) {
    const recent = (Array.isArray(previousDays) ? previousDays : [])
      .filter(item => item && item !== day && (!day.id || item.id !== day.id) && !item.demo && !item.reference)
      .sort((a, b) => asNumber(b) - asNumber(a) || String(a.id || "").localeCompare(String(b.id || "")))
      .slice(0, recentDaysLimit);
    return new Set(recent.flatMap(item => [
      ...(savedAuto(item) ?? select(item).pins.map(pin => pin.id)),
      ...ids(item.pinterest?.extras)
    ]));
  }

  function seedTie(day, pin) {
    const identity = day.id || [day.date || "", day.created || "", day.title || day.result?.title || ""].join("|");
    const value = identity + ":" + pin.id;
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
    return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
  }

  function rank(pin, style, day) {
    if (pin.group !== style.key) return 0;
    if (!(pin.anchors || pin.motifs)?.some(motif => style.motifs[motif] > 0)) return 0;
    const clues = pin.motifs.map(motif => style.motifs[motif]).filter(Boolean);
    if (!clues.length) return 0;
    const best = Math.max(...clues);
    const support = Math.min(2.3, (clues.reduce((sum, value) => sum + value, 0) - best) * .45);
    const photo = PhotoStyle.colorAffinity(style.photo, pin.hex);
    const chosen = PhotoStyle.colorAffinity(style.chosen, pin.hex);
    return best + support + 1.1 * photo + .35 * chosen + .24 * seedTie(day, pin);
  }

  function matchingPins(day, style, previousDays) {
    const used = recentPins(day, previousDays);
    const matching = catalogue.filter(pin => !used.has(pin.id))
      .map(pin => ({pin, score:rank(pin, style, day)}))
      .filter(candidate => candidate.score > 0)
      .sort((a,b) => b.score - a.score || a.pin.id.localeCompare(b.pin.id));
    // Leave other suitable photos available for the next similar record.
    const count = Math.min(3, Math.ceil(matching.length / 2));
    return matching.slice(0, count).map(({pin}) => pin);
  }

  function boardStyle(day) {
    const style = PhotoStyle.select(day);
    const savedKey = day.pinterest?.styleKey;
    return styleKeys.has(savedKey) && savedKey !== style.key
      ? PhotoStyle.select({...day, reference:savedKey})
      : style;
  }

  function select(day = {}, previousDays = []) {
    const style = boardStyle(day);
    if (day.reference) {
      return {styleKey:style.key, name:"Тихая документальная съёмка",
        reason:"Посуда, мокрые окна и бытовые детали в мягком естественном свете.",
        search:"muted film diary close ups rain window quiet street",
        pins:["430938258103723559","909938299714277001","289004501082491565"].map(id => byId.get(id))};
    }
    return {styleKey:style.key, name:style.name, reason:style.reason, search:style.query,
      pins:matchingPins(day, style, previousDays)};
  }

  function collection(day) {
    const saved = savedAuto(day);
    const selected = select(day);
    const base = saved === null ? selected.pins : saved.map(id => byId.get(id));
    const extras = ids(day.pinterest?.extras).filter(id => !base.some(pin => pin.id === id));
    return {...selected,pins:base.concat(extras.map(id => byId.get(id) || {id,title:"Добавленный пин"}))};
  }

  function snapshot(day, previousDays = []) {
    const saved = savedAuto(day);
    const selected = select(day, previousDays);
    const auto = saved ?? selected.pins.map(pin => pin.id);
    const extras = ids(day.pinterest?.extras).filter(id => !auto.includes(id));
    return {schemaVersion, auto, extras, styleKey:selected.styleKey};
  }

  function node(name, className, value) {
    const element = document.createElement(name);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  }

  function external(link, label, className) {
    const item = node("a",className,label);
    item.href = link;
    item.target = "_blank";
    item.rel = "noopener noreferrer";
    item.referrerPolicy = "no-referrer";
    return item;
  }

  function pinWidget(well, id, title) {
    const frame = node("iframe", "pin-widget");
    frame.src = "pinterest-pin.html#" + id;
    frame.title = title + " · Pinterest";
    frame.loading = "lazy";
    frame.referrerPolicy = "no-referrer";
    frame.setAttribute("sandbox","allow-scripts allow-popups allow-popups-to-escape-sandbox");
    well.replaceChildren(frame);
  }

  function makePinCard(pin) {
    const figure = node("figure","pin-card");
    const well = node("div","pin-image");
    if (safeMedia(pin.src)) {
      const a = external(site(pin.id),"","pin-photo-link");
      const img = node("img");
      img.alt = pin.title;
      img.loading = "lazy";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("error", () => pinWidget(well,pin.id,pin.title), {once:true});
      img.src = pin.src;
      a.append(img);
      well.append(a);
    } else {
      pinWidget(well,pin.id,pin.title);
    }
    const caption = node("figcaption");
    caption.append(node("strong","",pin.title));
    if (pin.credit) caption.append(node("small","",pin.credit));
    caption.append(external(site(pin.id),"Открыть пин ↗","pin-source"));
    figure.append(well,caption);
    return figure;
  }

  function section(day, onAdd = null) {
    const board = collection(day);
    const part = node("section","pin-board");
    const lead = node("div","pin-board-lead");
    const aside = node("div","pin-board-meta");
    aside.append(node("h3","","Фотографии из Pinterest"),node("p","","«" + board.name + "». " + board.reason));
    lead.append(aside,external("https://www.pinterest.com/search/pins/?q=" + encodeURIComponent(board.search),"Ещё в Pinterest ↗","pin-source"));
    const grid = node("div","pin-grid");
    function draw() {
      const pins = collection(day).pins;
      grid.replaceChildren(...(pins.length ? pins.map(makePinCard)
        : [node("p","pin-empty","Для этой записи пока нет новой подходящей фотографии из подборки.")]));
    }
    draw();
    part.append(lead,grid);

    if (typeof onAdd === "function") {
      const chooser = node("details","pin-add");
      chooser.append(node("summary","","Добавить свой пин"));
      const form = node("form","pin-form");
      const label = node("label","","Ссылка на публичный пин");
      const input = node("input");
      input.type = "url";
      input.placeholder = "https://www.pinterest.com/pin/…";
      input.maxLength = 400;
      input.required = true;
      label.append(input);
      const button = node("button","silver","Добавить");
      button.type = "submit";
      const info = node("p","status");
      info.setAttribute("role","status");
      form.append(label,button);
      form.addEventListener("submit",async (event) => {
        event.preventDefault();
        info.classList.remove("error");
        const id = parse(input.value);
        if (!id) {
          info.textContent = "Открой пин на Pinterest и скопируй полный адрес из строки браузера.";
          info.classList.add("error");
          return;
        }
        if (collection(day).pins.some((pin) => pin.id === id)) {
          info.textContent = "Этот пин уже в подборке.";
          return;
        }
        if ((day.pinterest?.extras || []).length >= 6) {
          info.textContent = "Можно добавить до шести своих пинов.";
          return;
        }
        button.disabled = true;
        try {
          const saved = await onAdd(id);
          draw();
          input.value = "";
          info.textContent = saved ? "Пин добавлен." : "Пин добавлен на время этой вкладки.";
        } catch {
          info.textContent = "Не удалось добавить пин.";
          info.classList.add("error");
        } finally {
          button.disabled = false;
        }
      });
      chooser.append(form,info);
      part.append(chooser);
    }
    return part;
  }

  function exportLinks(day) {
    return collection(day).pins.map((pin) => pin.title + " — " + site(pin.id)).join("\n");
  }

  function exportHtml(day, escape) {
    const board = collection(day);
    if (!board.pins.length) return "";
    const cards = board.pins.map((pin) => '<figure>' +
      (safeMedia(pin.src) ? '<img src="' + escape(pin.src) + '" alt="' + escape(pin.title) + '" loading="lazy" referrerpolicy="no-referrer">' : '') +
      '<figcaption><a href="' + escape(site(pin.id)) + '">' + escape(pin.title) + ' ↗</a>' +
      (pin.credit ? '<br><small>' + escape(pin.credit) + '</small>' : '') + '</figcaption></figure>').join("");
    return '<h2>Фотографии из Pinterest</h2><p>' + escape(board.name + ". " + board.reason) +
      '</p><div class="pin-export">' + cards + '</div>';
  }

  return {section, snapshot, select, collection, parse, exportLinks, exportHtml};
})();

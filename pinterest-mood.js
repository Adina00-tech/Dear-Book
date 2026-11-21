"use strict";

const PinterestMood = (() => {
  const raw = [["614108099177506088","736x/a8/76/49/a87649165a78e1ce42aee7dab0dbeb3d.jpg","Камера и наушники на бежевой ткани","ivory"],["430938258103723559","originals/58/89/fd/5889fdf5b098feffe02a943c207bc334.jpg","Две белые кружки и провод","ivory"],["49187820922443441","originals/ce/61/eb/ce61ebe30ad048da9208bbab7ee7b007.jpg","Книга, телефон и проводные наушники","graphite"],["296393219249378524","originals/86/c6/ca/86c6ca0d2aaec787167753c280d4f87f.jpg","Кремовые балетки и ткань крупным планом","ivory"],["789748484696177262","originals/25/2b/66/252b6626097484f4a8c89f6862698330.jpg","Мокрый асфальт и невысокие дома","fog"],["909938299714277001","originals/2d/2e/9f/2d2e9f68a84ef8c34ff24e688c5361c3.jpg","Тихий перекрёсток в тумане","fog"],["4292562140411464","originals/bd/bc/41/bdbc41e453dcfb9d80d11f1d881494b0.jpg","Фары на дороге под деревьями","fog"],["1108237420808473346","originals/d2/f6/ab/d2f6ab71db069a350ff413ce0cad0f1a.jpg","Очки на рукописном конспекте","graphite"],["289004501082491565","originals/43/7a/23/437a23e0cf2438ede8a2dd187bfa37ac.jpg","Капли на боковом стекле машины","rain"]];

  const catalogue = raw.map(([id, path, title, group]) => ({
    id, src:"https://i.pinimg.com/" + path, title, group
  }));
  const byId = new Map(catalogue.map((pin) => [pin.id,pin]));
  const catalogueId = (id) => /^\d{5,25}$/.test(String(id));
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

  function select(day) {
    const style=PhotoStyle.select(day);
    if (day.reference) {
      return {name:"Тихая документальная съёмка",
        reason:"Посуда, мокрые окна и бытовые детали в мягком естественном свете.",
        search:"muted film diary close ups rain window quiet street",
        pins:["430938258103723559","909938299714277001","289004501082491565"].map((id)=>byId.get(id))};
    }
    const sibling = {ivory:"graphite",graphite:"ivory",fog:"rain",rain:"fog"}[style.key];
    const matching = catalogue.filter((pin)=>pin.group===style.key);
    const adjacent = catalogue.filter((pin)=>pin.group===sibling);
    return {name:style.name,reason:style.reason,search:style.query,pins:matching.concat(adjacent).slice(0,3)};
  }

  function collection(day) {
    const selected = select(day);
    const auto = Array.isArray(day.pinterest?.auto) ? day.pinterest.auto.map((id)=>byId.get(id)).filter(Boolean) : [];
    const base = auto.length ? auto : selected.pins;
    const extras = Array.isArray(day.pinterest?.extras) ? day.pinterest.extras.filter(catalogueId).filter((id) => !base.some((pin) => pin.id===id)) : [];
    return {...selected,pins:base.concat(extras.map((id) => byId.get(id) || {id,title:"Добавленный пин"}))};
  }

  function snapshot(day) {
    return {auto:select(day).pins.map((pin)=>pin.id),extras:[]};
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
      grid.replaceChildren(...collection(day).pins.map(makePinCard));
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
    const cards = board.pins.map((pin) => '<figure>' +
      (safeMedia(pin.src) ? '<img src="' + escape(pin.src) + '" alt="' + escape(pin.title) + '" loading="lazy" referrerpolicy="no-referrer">' : '') +
      '<figcaption><a href="' + escape(site(pin.id)) + '">' + escape(pin.title) + ' ↗</a>' +
      (pin.credit ? '<br><small>' + escape(pin.credit) + '</small>' : '') + '</figcaption></figure>').join("");
    return '<h2>Фотографии из Pinterest</h2><p>' + escape(board.name + ". " + board.reason) +
      '</p><div class="pin-export">' + cards + '</div>';
  }

  return {section, snapshot, select, collection, parse, exportLinks, exportHtml};
})();

"use strict";

const AfterimageRevisit = (() => {
  const stateByHost = new WeakMap();
  const dateFormat = new Intl.DateTimeFormat("ru", {day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
  const photoUrl = /^data:image\/(?:avif|webp|png|jpe?g|gif|svg\+xml)(?:;charset=[\w-]+)?(?:;base64)?,/i;
  const swatchHex = /^#[\da-f]{6}$/i;
  let sequence = 0;

  function clean(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function dateOf(day) {
    const date = clean(day.date);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const checked = new Date(date + "T12:00:00Z");
      if (!Number.isNaN(checked.getTime()) && checked.toISOString().slice(0,10) === date) return date;
    }
    const created = Number.isFinite(day.created) && day.created >= 0 ? new Date(day.created) : null;
    return created && !Number.isNaN(created.getTime()) ? created.toISOString().slice(0,10) : "";
  }

  function photosOf(day) {
    return (Array.isArray(day.pictures) ? day.pictures : []).filter(picture =>
      typeof picture?.data === "string" && photoUrl.test(picture.data));
  }

  function paletteOf(day) {
    const colors = Array.isArray(day.quizPalette) ? day.quizPalette : day.result?.palette;
    return (Array.isArray(colors) ? colors : []).map(color => typeof color === "string" ? color : color?.hex)
      .filter(color => typeof color === "string" && swatchHex.test(color)).slice(0,5);
  }

  function noteOf(day) {
    const note = clean(day.quiz?.answers?.memory) || clean(day.text) || clean(day.result?.description);
    const plain = note.replace(/\s+/g," ");
    if (plain.length < 151) return plain;
    const initial = plain.slice(0,148);
    return (initial.length - initial.lastIndexOf(" ") < 24 ? initial.slice(0,initial.lastIndexOf(" ")) : initial) + "…";
  }

  function entries(days) {
    const seen = new Set();
    const result = [];
    for (const day of Array.isArray(days) ? days : []) {
      const id = clean(day?.id);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      result.push({
        day,id,date:dateOf(day),created:Number.isFinite(day.created) ? day.created : -1,
        title:clean(day.title) || clean(day.result?.title) || "Запись дня",
        photos:photosOf(day),colors:paletteOf(day),note:noteOf(day)
      });
    }
    return result.sort((a,b) => b.date.localeCompare(a.date) || b.created - a.created || a.id.localeCompare(b.id));
  }

  function ensurePair(state, rows) {
    if (!rows.length) {
      state.then = "";
      state.now = "";
      return;
    }
    if ((!state.hasPair && rows.length > 1) || !rows.some(row => row.id === state.now)) state.now = rows[0].id;
    if (!rows.some(row => row.id === state.then) || state.then === state.now) {
      const nowDate = rows.find(row => row.id === state.now).date;
      const earlier = rows.find(row => row.id !== state.now && row.date < nowDate);
      state.then = earlier?.id || rows.find(row => row.id !== state.now)?.id || "";
    }
    // The older of the two entries always leads the scene, including same-date entries.
    if (state.then && rows.findIndex(row => row.id === state.then) < rows.findIndex(row => row.id === state.now)) {
      [state.then,state.now] = [state.now,state.then];
    }
    if (state.then) state.hasPair = true;
  }

  function element(doc, tag, className, text) {
    const item = doc.createElement(tag);
    if (className) item.className = className;
    if (typeof text === "string") item.textContent = text;
    return item;
  }

  function dateElement(doc, row, className) {
    if (!row.date) return element(doc,"span",className,"Дата не указана");
    const time = element(doc,"time",className,dateFormat.format(new Date(row.date + "T12:00:00Z")));
    time.dateTime = row.date;
    return time;
  }

  function swatches(doc, row) {
    const list = element(doc,"span","arv__swatches");
    list.setAttribute("aria-hidden","true");
    for (const color of row.colors) {
      const sample = element(doc,"i");
      sample.style.setProperty("--arv-swatch",color);
      list.append(sample);
    }
    return list;
  }

  function cover(doc, row, className, lazy) {
    const picture = row.photos[0];
    const well = element(doc,"span",className);
    well.setAttribute("aria-hidden","true");
    if (row.colors.length) well.style.setProperty("--arv-swatch",row.colors[0]);
    if (picture) {
      const image = element(doc,"img");
      image.src = picture.data;
      image.alt = "";
      image.decoding = "async";
      if (lazy) image.loading = "lazy";
      image.addEventListener("error",() => image.remove(),{once:true});
      well.append(image);
    }
    return well;
  }

  function albumList(doc, rows, onOpen) {
    const block = element(doc,"div","arv__albums");
    block.append(element(doc,"h3","arv__subhead","Альбомы по датам"));
    const list = element(doc,"ul","arv__album-list");
    for (const row of rows) {
      const item = element(doc,"li");
      const button = element(doc,"button","arv__album");
      button.type = "button";
      button.dataset.focusToken = "album:" + row.id;
      const summary = element(doc,"span","arv__album-summary");
      summary.append(dateElement(doc,row,"arv__date"),element(doc,"strong",null,row.title));
      if (row.colors.length) summary.append(swatches(doc,row));
      button.append(cover(doc,row,"arv__thumbnail",true),summary,element(doc,"span","arv__album-arrow","↗"));
      button.lastChild.setAttribute("aria-hidden","true");
      button.setAttribute("aria-label",row.title + " · " + dateElement(doc,row).textContent + " · открыть альбом");
      button.disabled = typeof onOpen !== "function";
      button.addEventListener("click",() => onOpen?.(row.day));
      item.append(button);
      list.append(item);
    }
    block.append(list);
    return block;
  }

  function chooser(doc, rows, side, state, onChoose) {
    const label = element(doc,"label","arv__chooser");
    const visible = side === "then" ? "Тогда" : "Сейчас";
    label.append(element(doc,"span","arv__chooser-label",visible));
    const select = element(doc,"select");
    select.dataset.focusToken = "select:" + side;
    const other = side === "then" ? "now" : "then";
    for (const row of rows) {
      const option = element(doc,"option",null,dateElement(doc,row).textContent + " · " + row.title);
      option.value = row.id;
      option.disabled = row.id === state[other];
      select.append(option);
    }
    select.value = state[side];
    select.addEventListener("change",() => {
      if (select.value && select.value !== state[other]) onChoose(side,select.value);
    });
    label.append(select);
    return label;
  }

  function scene(doc, row, side) {
    const item = element(doc,"figure","arv__scene");
    item.dataset.side = side;
    item.append(cover(doc,row,"arv__scene-photo",false));
    const caption = element(doc,"figcaption","arv__scene-copy");
    caption.append(element(doc,"span","arv__film-frame",side === "then" ? "THEN / ТОГДА" : "NOW / СЕЙЧАС"),
      dateElement(doc,row,"arv__scene-date"),element(doc,"strong","arv__scene-title",row.title));
    if (row.note) caption.append(element(doc,"p","arv__scene-note",row.note));
    if (row.colors.length) caption.append(swatches(doc,row));
    item.append(caption);
    return item;
  }

  function comparison(doc, rows, state, onChoose, onOpen) {
    const part = element(doc,"div","arv__compare");
    part.append(element(doc,"h3","arv__subhead","Тогда → Сейчас"));
    if (rows.length < 2) {
      part.append(element(doc,"p","arv__notice","Когда появится ещё один день, здесь можно будет сравнить два альбома."));
      return part;
    }

    const earlier = rows.find(row => row.id === state.then);
    const recent = rows.find(row => row.id === state.now);
    const controls = element(doc,"div","arv__selectors");
    controls.append(chooser(doc,rows,"then",state,onChoose),chooser(doc,rows,"now",state,onChoose));
    part.append(controls);
    const stage = element(doc,"div","arv__stage");
    const thenFrame = scene(doc,earlier,"then");
    const nowFrame = scene(doc,recent,"now");
    stage.append(thenFrame,nowFrame);
    const actions = element(doc,"div","arv__actions");
    const lenses = element(doc,"div","arv__lenses");
    lenses.setAttribute("role","group");
    lenses.setAttribute("aria-label","Кадр сравнения");

    const thenButton = element(doc,"button","arv__lens","Тогда");
    const nowButton = element(doc,"button","arv__lens","Сейчас");
    const play = element(doc,"button","arv__play","Показать переход");
    for (const [button,token] of [[thenButton,"frame:then"],[nowButton,"frame:now"],[play,"play"]]) {
      button.type = "button";
      button.dataset.focusToken = token;
    }
    lenses.append(thenButton,nowButton);
    const open = element(doc,"button","arv__open","Открыть альбом ↗");
    open.type = "button";
    open.dataset.focusToken = "open";
    open.disabled = typeof onOpen !== "function";
    open.addEventListener("click",() => onOpen?.((state.frame === "now" ? recent : earlier).day));
    actions.append(lenses,play,open);
    const status = element(doc,"p","arv__sr");
    status.setAttribute("role","status");

    function cancelPlayback() {
      clearTimeout(state.timer);
      state.timer = null;
      delete stage.dataset.reset;
    }

    function show(frame, announce) {
      state.frame = frame;
      stage.dataset.frame = frame;
      thenFrame.setAttribute("aria-hidden",String(frame !== "then"));
      nowFrame.setAttribute("aria-hidden",String(frame !== "now"));
      thenButton.setAttribute("aria-pressed",String(frame === "then"));
      nowButton.setAttribute("aria-pressed",String(frame === "now"));
      const row = frame === "then" ? earlier : recent;
      const spoken = (frame === "then" ? "Тогда" : "Сейчас") + " · " + dateElement(doc,row).textContent + " · " + row.title;
      open.setAttribute("aria-label","Открыть альбом «" + row.title + "»");
      if (announce) status.textContent = spoken;
    }

    thenButton.addEventListener("click",() => {cancelPlayback();show("then",true);});
    nowButton.addEventListener("click",() => {cancelPlayback();show("now",true);});
    play.addEventListener("click",() => {
      cancelPlayback();
      if (doc.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
        show("now",true);
        return;
      }
      stage.dataset.reset = "yes";
      show("then",true);
      state.timer = setTimeout(() => {
        state.timer = null;
        delete stage.dataset.reset;
        show("now",true);
      },350);
    });
    show(state.frame,false);
    part.append(stage,actions,status);
    return part;
  }

  function render(host, days, {onOpen} = {}) {
    if (!host?.ownerDocument || typeof host.replaceChildren !== "function") return;
    const doc = host.ownerDocument;
    const state = stateByHost.get(host) || {then:"",now:"",hasPair:false,frame:"then",timer:null,id:++sequence};
    stateByHost.set(host,state);
    clearTimeout(state.timer);
    state.timer = null;
    const rows = entries(days);
    ensurePair(state,rows);
    const focusToken = host.contains(doc.activeElement) ? doc.activeElement?.dataset?.focusToken : "";
    const listScroll = host.querySelector(".arv__album-list")?.scrollTop || 0;
    const root = element(doc,"section","afterimage-revisit");
    root.setAttribute("aria-labelledby","arv-title-" + state.id);
    const header = element(doc,"header","arv__header");
    const title = element(doc,"h2","arv__title","Пересмотреть день");
    title.id = "arv-title-" + state.id;
    header.append(title,element(doc,"p","arv__intro","Выбери альбом по дате или посмотри, как один день сменяет другой."));
    root.append(header);

    if (!rows.length) {
      root.append(element(doc,"p","arv__notice","После первой записи здесь появится альбом дня."));
    } else {
      const body = element(doc,"div","arv__body");
      const open = typeof onOpen === "function" ? onOpen : null;
      body.append(albumList(doc,rows,open),comparison(doc,rows,state,(side,id) => {
        state[side] = id;
        state.frame = "then";
        render(host,days,{onOpen});
      },open));
      root.append(body);
    }
    host.replaceChildren(root);
    const albumRail = root.querySelector(".arv__album-list");
    if (albumRail) albumRail.scrollTop = listScroll;
    if (focusToken) {
      const active = Array.from(root.querySelectorAll("[data-focus-token]")).find(item => item.dataset.focusToken === focusToken);
      active?.focus({preventScroll:true});
    }
  }

  return {render};
})();

"use strict";

const EditorialBoard = (function editorialBoardModule() {
  const captions = {
    cream: "Из предоставленных референсов · тёплый коллаж",
    lane: "Из предоставленных референсов · улица в тумане",
    graphite: "Из предоставленных референсов · графитовый коллаж",
    glass: "Из предоставленных референсов · съёмка через стекло"
  };

  // Coordinates are proportions of the uncropped reference, in order x, y, width, height.
  const views = {
    cream: {index:0,title:"Свет на повседневных деталях",source:captions.cream},
    creamDetail: {index:0,title:"Деталь в молочном свете",source:captions.cream,crop:[0.48,0.48,0.49,0.49]},
    lane: {index:1,title:"Тихая улица в тумане",source:captions.lane},
    laneDetail: {index:1,title:"Воздух между домами",source:captions.lane,crop:[0.06,0.22,0.89,0.53]},
    graphite: {index:2,title:"Чернила, стекло и тень",source:captions.graphite,crop:[0.52,0.50,0.44,0.44]},
    graphiteNarrow: {index:2,title:"Тёмные детали вблизи",source:captions.graphite,crop:[0.64,0.43,0.33,0.52]},
    glass: {index:3,title:"Синий свет на мокром стекле",source:captions.glass},
    glassDetail: {index:3,title:"Блики и капли",source:captions.glass,crop:[0.07,0.24,0.86,0.53]}
  };

  const layouts = {
    ivory:["cream", "laneDetail", "creamDetail"],
    fog:["lane", "creamDetail", "glassDetail"],
    graphite:["graphite", "laneDetail", "graphiteNarrow"],
    rain:["glass", "laneDetail", "graphite"]
  };

  const safeImage = /^data:image\/(?:png|jpeg|jpg|webp|avif);base64,[a-z0-9+/=\s]+$/i;

  function selectStyle(day) {
    const selected = typeof PhotoStyle !== "undefined" ? PhotoStyle.select(day) : null;
    return {
      key: Object.hasOwn(layouts, selected?.key) ? selected.key : "ivory",
      name: typeof selected?.name === "string" ? selected.name : "",
      reason: typeof selected?.reason === "string" ? selected.reason : ""
    };
  }

  function framesFor(day) {
    if (typeof EditorialAssets === "undefined" || !Array.isArray(EditorialAssets)) return [];
    const style = selectStyle(day);
    const names = day?.reference === true ? ["lane", "cream", "graphite", "glass"] : layouts[style.key];
    return names.map(name => {
      const view = views[name];
      const asset = EditorialAssets[view.index];
      if (!asset?.data || !safeImage.test(asset.data)) return null;
      return {
        title:view.title,
        data:asset.data,
        source:view.source,
        crop:view.crop,
        width:Number(asset.width) || 1,
        height:Number(asset.height) || 1
      };
    }).filter(Boolean);
  }

  function element(tag, name, value) {
    const node = document.createElement(tag);
    if (name) node.className = name;
    if (value) node.textContent = value;
    return node;
  }

  function cropStyles(frame, styles) {
    const [x,y,w,h] = frame.crop || [0,0,1,1];
    styles("--ed-ratio", String((frame.width * w) / (frame.height * h)));
    styles("--ed-x", `${(-100 * x) / w}%`);
    styles("--ed-y", `${(-100 * y) / h}%`);
    styles("--ed-iw", `${100 / w}%`);
    styles("--ed-ih", `${100 / h}%`);
  }

  function media(frame, contain = false) {
    const viewport = element("div", `ed-board__media${contain ? " ed-board__media--contain" : ""}`);
    cropStyles(frame, (name, value) => viewport.style.setProperty(name, value));
    const crop = element("span", "ed-board__crop");
    const image = element("img", "ed-board__image");
    image.src = frame.data;
    image.alt = frame.title;
    image.decoding = "async";
    if (!contain) image.loading = "lazy";
    crop.append(image);
    viewport.append(crop);
    return viewport;
  }

  function createViewer() {
    const dialog = element("dialog", "ed-board__viewer");
    dialog.setAttribute("aria-label", "Фотография из мудборда");
    const body = element("div", "ed-board__viewer-body");
    const header = element("div", "ed-board__viewer-header");
    const title = element("h3", "ed-board__viewer-title");
    const close = element("button", "ed-board__button", "Закрыть");
    close.type = "button";
    close.setAttribute("aria-label", "Закрыть фотографию");
    const content = element("div", "ed-board__viewer-content");
    let trigger;

    function afterClose() {
      content.replaceChildren();
      trigger?.focus();
      trigger = undefined;
    }

    function closeViewer() {
      if (typeof dialog.close === "function" && typeof dialog.showModal === "function") dialog.close();
      else {
        dialog.removeAttribute("open");
        afterClose();
      }
    }

    close.addEventListener("click", closeViewer);
    dialog.addEventListener("close", afterClose);
    dialog.addEventListener("click", event => {
      if (event.target === dialog) closeViewer();
    });

    header.append(title, close);
    body.append(header, content);
    dialog.append(body);
    return {
      dialog,
      open(frame, button) {
        trigger = button;
        title.textContent = frame.title;
        content.replaceChildren(media(frame, true), element("p", "ed-board__source", frame.source));
        if (typeof dialog.showModal === "function") dialog.showModal();
        else dialog.setAttribute("open", "");
        close.focus();
      }
    };
  }

  function section(day, {title = "Фотографии для мудборда", readOnly = false} = {}) {
    const board = element("section", "editorial-board");
    const frames = framesFor(day);
    if (!frames.length) {
      board.hidden = true;
      return board;
    }
    const style = selectStyle(day);
    board.dataset.style = style.key;
    board.dataset.frames = String(frames.length);

    const headline = element("header", "ed-board__header");
    headline.append(element("h3", "ed-board__title", title));
    if (style.name || style.reason) {
      const text = (style.name && style.reason ? `${style.name} · ${style.reason}` : style.name || style.reason);
      headline.append(element("p", "ed-board__note", text));
    }

    const grid = element("div", "ed-board__grid");
    const viewer = !readOnly ? createViewer() : null;
    for (const frame of frames) {
      const figure = element("figure", "ed-board__frame");
      figure.append(media(frame));
      const footer = element("figcaption", "ed-board__caption");
      const labels = element("span", "ed-board__labels");
      labels.append(element("strong", "ed-board__frame-title", frame.title),
        element("small", "ed-board__source", frame.source));
      footer.append(labels);

      if (viewer) {
        const open = element("button", "ed-board__button", "Крупнее");
        open.type = "button";
        open.setAttribute("aria-label", `Открыть крупнее: ${frame.title}`);
        open.addEventListener("click", () => viewer.open(frame, open));
        footer.append(open);
      }
      figure.append(footer);
      grid.append(figure);
    }

    board.append(headline, grid);
    if (viewer) board.append(viewer.dialog);
    return board;
  }

  function escapeText(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;"
    }[character]));
  }

  function exportHtml(day, escape = escapeText) {
    const frames = framesFor(day);
    if (!frames.length) return "";
    const style = selectStyle(day);
    const figures = frames.map(frame => {
      const vars = [];
      cropStyles(frame, (name, value) => vars.push(`${name}:${value}`));
      return `<figure style="${vars.join(";")}"><div class="ed-board-export__media"><span><img src="${escape(frame.data)}" alt="${escape(frame.title)}" loading="lazy" decoding="async"></span></div><figcaption><strong>${escape(frame.title)}</strong><small>${escape(frame.source)}</small></figcaption></figure>`;
    }).join("");
    const details = [style.name,style.reason].filter(Boolean).join(" · ");
    return `<section class="ed-board-export">
<style>
.ed-board-export{margin:28px 0}.ed-board-export h3{margin:0 0 8px}.ed-board-export p{margin:0 0 18px}
.ed-board-export__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.ed-board-export__grid figure{margin:0;padding:8px;background:#f4f5f0;border:1px solid #c3ccc4;border-radius:10px;min-width:0;color:#28352f}
.ed-board-export__media{height:clamp(130px,24vw,255px);position:relative;overflow:hidden;border-radius:6px;background:#d1d9d0;container-type:size}
.ed-board-export__media span{display:block;position:absolute;overflow:hidden;width:max(100cqw,calc(100cqh * var(--ed-ratio)));aspect-ratio:var(--ed-ratio);left:50%;top:50%;transform:translate(-50%,-50%)}
.ed-board-export__media img{position:absolute;max-width:none!important;max-height:none!important;width:var(--ed-iw)!important;height:var(--ed-ih)!important;left:var(--ed-x);top:var(--ed-y);object-fit:fill!important}
.ed-board-export__grid figcaption{padding:9px 2px 3px;font-size:.88rem}.ed-board-export__grid small{display:block;margin-top:3px;color:#50615a}
@media(max-width:480px){.ed-board-export__grid{grid-template-columns:1fr}.ed-board-export__media{height:175px}}
</style>
<h3>Фотографии для мудборда</h3>${details ? `<p>${escape(details)}</p>` : ""}<div class="ed-board-export__grid">${figures}</div></section>`;
  }

  return Object.freeze({section, framesFor, exportHtml});
})();

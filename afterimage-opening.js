/* The cinematic welcome screen belongs to one saved memory at a time. */
const AfterimageOpening = (() => {
  const dateFormat = new Intl.DateTimeFormat("en-US", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC"
  });
  let current = null;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function memoryDate(day) {
    const raw = day?.date;
    const date = raw instanceof Date ? raw
      : typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(raw)
        ? new Date(raw + "T00:00:00Z") : null;
    if (!date || !Number.isFinite(date.getTime())) return "";
    if (typeof raw === "string" && date.toISOString().slice(0, 10) !== raw) return "";
    return dateFormat.format(date).toUpperCase();
  }

  function memoryNumber(value) {
    if (!Number.isSafeInteger(value) || value < 1) return "—";
    return String(value).padStart(3, "0");
  }

  function photoSources(day) {
    if (!Array.isArray(day?.pictures)) return [];
    return day.pictures.map(picture => picture?.data).filter(source => {
      if (typeof source !== "string" || !source) return false;
      if (/^data:image\/(?:avif|gif|jpeg|png|svg\+xml|webp)[;,]/iu.test(source)) return true;
      if (!source.startsWith("blob:")) return false;
      try {
        return new URL(source).origin === window.location.origin;
      } catch {
        return false;
      }
    });
  }

  function finish(opening, reveal = false) {
    if (!opening || opening !== current) return;
    current = null;
    if (opening.dialog.open && typeof opening.dialog.close === "function") opening.dialog.close();
    opening.dialog.remove();
    if (!opening.hadScrollLock) document.documentElement.classList.remove("afterimage-opening-lock");
    if (reveal && typeof opening.onReveal === "function") {
      opening.onReveal();
    } else if (opening.previous?.isConnected) {
      opening.previous.focus({preventScroll: true});
    }
  }

  function open(day, {number, onReveal} = {}) {
    close();
    const dialog = element("dialog", "afterimage-opening");
    dialog.lang = "en";
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "afterimage-opening-title");
    dialog.setAttribute("aria-describedby", "afterimage-opening-copy");
    const visual = element("div", "afterimage-opening__visual");
    visual.setAttribute("aria-hidden", "true");
    const closeButton = element("button", "afterimage-opening__close", "×");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close memory opening");
    const stage = element("section", "afterimage-opening__stage");
    const stamp = element("p", "afterimage-opening__stamp");
    const date = memoryDate(day);
    if (date) {
      const timestamp = element("time", "", date);
      if (typeof day.date === "string") timestamp.dateTime = day.date;
      stamp.append(timestamp, element("span", "afterimage-opening__divider", " · "));
    }
    stamp.append(element("span", "", "MEMORY Nº " + memoryNumber(number)));
    const heading = element("h1", "afterimage-opening__title", "A MEMORY IS WAITING.");
    heading.id = "afterimage-opening-title";
    const copy = element("p", "afterimage-opening__copy", "Some moments stay longer than we expect.");
    copy.id = "afterimage-opening-copy";
    const reveal = element("button", "afterimage-opening__reveal", "OPEN MEMORY ");
    reveal.type = "button";
    reveal.autofocus = true;
    const arrow = element("span", "afterimage-opening__arrow", "↓");
    arrow.setAttribute("aria-hidden", "true");
    reveal.append(arrow);
    stage.append(stamp, heading, copy, reveal);
    dialog.append(visual, stage, closeButton);

    const images = photoSources(day);
    let frame = 0;
    let picture = null;
    let press = null;
    const controls = [closeButton, reveal];
    function showPicture(index) {
      if (!images.length) return;
      frame = (index + images.length) % images.length;
      const img = element("img", "afterimage-opening__photo");
      img.alt = "";
      img.decoding = "async";
      img.draggable = false;
      img.referrerPolicy = "no-referrer";
      const loaded = () => {
        if (picture === img && img.naturalWidth > 0) img.classList.add("is-developed");
      };
      img.addEventListener("load", loaded, {once: true});
      img.addEventListener("error", () => img.remove(), {once: true});
      if (picture) picture.remove();
      picture = img;
      visual.append(img);
      img.src = images[frame];
      if (img.complete) loaded();
    }
    showPicture(0);

    const opening = {dialog, previous: document.activeElement, onReveal, hadScrollLock: document.documentElement.classList.contains("afterimage-opening-lock")};
    current = opening;
    reveal.addEventListener("click", () => finish(opening, true));
    closeButton.addEventListener("click", () => finish(opening));
    dialog.addEventListener("cancel", event => {
      event.preventDefault();
      finish(opening);
    });
    dialog.addEventListener("close", () => finish(opening), {once: true});
    dialog.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish(opening);
        return;
      }
      if (images.length > 1 && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        showPicture(frame + (event.key === "ArrowRight" ? 1 : -1));
        return;
      }
      if (event.key !== "Tab") return;
      event.preventDefault();
      const active = controls.indexOf(document.activeElement);
      const next = active < 0 ? (event.shiftKey ? controls.length - 1 : 0)
        : (active + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
      controls[next].focus();
    });
    if (images.length > 1) {
      dialog.addEventListener("pointerdown", event => {
        if (event.isPrimary && event.pointerType !== "mouse" && !event.target.closest("button")) {
          press = {x: event.clientX, y: event.clientY, id: event.pointerId};
        }
      });
      dialog.addEventListener("pointercancel", () => { press = null; });
      dialog.addEventListener("pointerup", event => {
        if (!press || press.id !== event.pointerId) return;
        const dx = event.clientX - press.x;
        const dy = event.clientY - press.y;
        press = null;
        if (Math.abs(dx) >= 46 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          showPicture(frame + (dx < 0 ? 1 : -1));
        }
      });
    }
    document.body.append(dialog);
    document.documentElement.classList.add("afterimage-opening-lock");
    if (typeof dialog.showModal === "function") {
      try {
        dialog.showModal();
      } catch (error) {
        finish(opening);
        throw error;
      }
    } else {
      dialog.setAttribute("open", "");
      dialog.setAttribute("role", "dialog");
    }
    reveal.focus({preventScroll: true});
  }

  function close() {
    finish(current);
  }

  return { open, close };
})();

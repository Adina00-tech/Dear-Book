/* Optional letters stored with a diary entry. */
const AfterimageReflection = (function createAfterimageReflection() {
  const maxLength = 5000;
  const letters = [
    {key:"past", title:"Себе в прошлое", hint:"Что хочется сказать себе до этого дня?"},
    {key:"future", title:"Себе в будущее", hint:"Что из этого дня хочется помнить?"}
  ];
  let instance = 0;

  function values(day) {
    const source = day?.reflection;
    const clean = value => typeof value === "string" ? value.replace(/\r\n?/g,"\n").slice(0,maxLength) : "";
    const normalized = {past:clean(source?.past),future:clean(source?.future)};
    if (typeof source?.updatedAt === "string" && Number.isFinite(Date.parse(source.updatedAt))) {
      normalized.updatedAt = source.updatedAt;
    }
    return normalized;
  }

  const hasText = value => Boolean(value.trim());
  const authored = snapshot => letters.some(letter => hasText(snapshot[letter.key]));

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function button(style, label) {
    const node = el("button", style, label);
    node.type = "button";
    return node;
  }

  function section(day, {onSave} = {}) {
    let snapshot = values(day);
    let isSaving = false;
    const id = "afterimage-letters-" + ++instance;
    const board = el("section", "afterimage-reflection");
    const heading = el("h3", "afterimage-reflection__heading", "Письма себе");
    heading.id = id;
    board.setAttribute("aria-labelledby", id);

    const header = el("div", "afterimage-reflection__header");
    const headerCopy = el("div", "afterimage-reflection__headcopy");
    headerCopy.append(heading);
    header.append(headerCopy);
    board.append(header);
    if (typeof onSave === "function") {
      headerCopy.append(el("p", "afterimage-reflection__privacy", "Письма хранятся в этой записи в твоём браузере."));
    }

    const reading = el("div", "afterimage-reflection__grid");
    const reader = Object.fromEntries(letters.map(letter => {
      const card = el("div", "afterimage-reflection__letter");
      const title = el("h4", "afterimage-reflection__letter-title", letter.title);
      const text = el("p", "afterimage-reflection__letter-text");
      card.append(title, text);
      reading.append(card);
      return [letter.key, text];
    }));
    board.append(reading);

    function renderLetters() {
      for (const {key} of letters) {
        const content = snapshot[key];
        reader[key].textContent = hasText(content) ? content : "Пока пусто";
        reader[key].classList.toggle("is-empty", !hasText(content));
      }
    }
    renderLetters();

    if (typeof onSave !== "function") {
      board.hidden = !authored(snapshot);
      return board;
    }

    const edit = button("silver afterimage-reflection__button", authored(snapshot) ? "Изменить письма" : "Написать письма");
    const form = el("form", "afterimage-reflection__form");
    form.hidden = true;
    form.id = id + "-edit";
    form.setAttribute("aria-labelledby", id);
    edit.setAttribute("aria-expanded","false");
    edit.setAttribute("aria-controls", form.id);
    header.append(edit);

    const fields = el("div", "afterimage-reflection__grid");
    const editors = Object.fromEntries(letters.map(letter => {
      const wrap = el("div", "afterimage-reflection__field");
      const label = el("label", "afterimage-reflection__letter-title", letter.title);
      const input = el("textarea", "afterimage-reflection__input");
      input.id = id + "-" + letter.key;
      input.name = letter.key;
      input.rows = 5;
      input.maxLength = maxLength;
      input.placeholder = letter.hint;
      label.htmlFor = input.id;
      wrap.append(label, input);
      fields.append(wrap);
      return [letter.key,input];
    }));

    const actions = el("div", "afterimage-reflection__actions");
    const save = button("aqua afterimage-reflection__button", "Сохранить письма");
    save.type = "submit";
    const cancel = button("silver afterimage-reflection__button", "Отмена");
    actions.append(save,cancel);
    form.append(fields,actions);
    const status = el("p", "afterimage-reflection__status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    board.append(form,status);

    function statusText(text, type = "") {
      status.textContent = text;
      status.dataset.type = type;
    }

    function editing(isOpen) {
      form.hidden = !isOpen;
      edit.hidden = isOpen;
      reading.hidden = isOpen;
      edit.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) {
        const first = !hasText(snapshot.past) || hasText(snapshot.future) ? editors.past : editors.future;
        first.focus();
      } else if (board.isConnected) edit.focus();
    }

    function setSaving(value) {
      isSaving = value;
      form.setAttribute("aria-busy", String(value));
      save.disabled = value;
      cancel.disabled = value;
      for (const input of Object.values(editors)) input.disabled = value;
      save.textContent = value ? "Сохраняем…" : "Сохранить письма";
    }

    edit.addEventListener("click", () => {
      for (const {key} of letters) editors[key].value = snapshot[key];
      statusText("");
      editing(true);
    });

    cancel.addEventListener("click", () => {
      if (!isSaving) {
        statusText("");
        editing(false);
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (isSaving) return;
      const next = values({reflection:{past:editors.past.value,future:editors.future.value}});
      if (next.past === snapshot.past && next.future === snapshot.future) {
        editing(false);
        return;
      }
      next.updatedAt = new Date().toISOString();
      setSaving(true);
      statusText("");
      try {
        const persisted = await onSave(next);
        snapshot = next;
        renderLetters();
        edit.textContent = authored(snapshot) ? "Изменить письма" : "Написать письма";
        statusText(persisted === true ? "Письма сохранены." : "Письма доступны до закрытия вкладки. Их можно сохранить вместе с воспоминанием.");
        editing(false);
      } catch {
        statusText("Не удалось сохранить. Текст остался в редакторе.", "error");
      } finally {
        setSaving(false);
      }
    });
    return board;
  }

  function escapeText(text) {
    return String(text).replace(/[&<>"']/g, character => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
    }[character]));
  }

  function exportHtml(day, escape = escapeText) {
    const snapshot = values(day);
    if (!authored(snapshot)) return "";
    const content = letters.filter(({key}) => hasText(snapshot[key])).map(({key,title}) =>
      `<div style="min-width:0;padding:14px;border:1px solid #b8c3b8;border-radius:9px;background:#fcfdf9;color:#26362e"><h3 style="margin:0 0 8px">${escape(title)}</h3><p style="margin:0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6">${escape(snapshot[key])}</p></div>`
    ).join("");
    return `<section style="margin:24px 0"><h2 style="margin:0 0 12px">Письма себе</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:12px">${content}</div></section>`;
  }

  return Object.freeze({section,exportHtml,values});
})();

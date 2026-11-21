"use strict";

const AtmosphereDiary = (() => {
  const storageKey = "ottenki-dnya:atmosphere-draft:v1";
  const order = [
    ["place","Место"],["weather","Погода"],["rhythm","Ритм"],["texture","Текстура"],["sound","Звук"],
    ["colors","Цвета"],["memory","Момент"],["unspoken","Невыраженное"],["scene","Сцена"],["chapter","Глава"]
  ];

  function readDraft() {
    try {
      const draft = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      return draft?.schemaVersion === 1 ? draft : null;
    } catch {
      return null;
    }
  }

  function saveDraft(draft) {
    try {
      if (draft) sessionStorage.setItem(storageKey,JSON.stringify(draft));
      else sessionStorage.removeItem(storageKey);
    } catch {
      // The current form remains usable if browser storage is unavailable.
    }
  }

  function answerText(quiz, text = "") {
    if (text.trim()) return text;
    const answers = quiz?.answers || {};
    const details = [answers.memory,answers.unspoken,answers.place?.label,answers.weather?.label,
      answers.texture?.label,answers.scene?.label].filter((part)=>typeof part==="string"&&part.trim());
    return details.join(" ").slice(0,5000);
  }

  function localProfile(day, song) {
    if (!day.quiz?.completed) return null;
    return AtmosphereProfile.build({
      quiz:day.quiz,text:day.text,result:day.result,track:day.track,song,
      photos:(day.pictures || []).map((picture)=>picture.signals).filter(Boolean)
    });
  }

  function design(day, result) {
    const answers = day.quiz?.answers;
    const rhythm = answers?.rhythm?.id;
    const scene = answers?.scene?.id;
    const style = ({
      "through-window":"window","silent-scene":"still","nostalgic-montage":"montage",
      "long-walk":"drift","chaotic-sequence":"montage","unfinished-scene":"open"
    })[scene] || "";
    const texture = ({
      "soft-fabric":"fabric","cold-glass":"glass","crumpled-paper":"paper",
      sunlight:"light","smooth-water":"water",fragile:"fragile"
    })[answers?.texture?.id] || "";
    const fast = rhythm === "fast-chaotic" || rhythm === "montage" || style === "montage";
    const slow = rhythm === "slow-blurred" || rhythm === "monotone" || style === "still" || style === "drift";
    const factor = fast ? .74 : slow ? 1.26 : 1;
    const pacing = SongVibe.pacing(day.track);
    const hasBeat = Number.isFinite(pacing.beatMs) && pacing.beatMs > 0;
    const base = (Number.isFinite(pacing.frameMs) && pacing.frameMs > 0 ? pacing.frameMs/1000 : result.rhythm) * factor;
    const bounded = Math.min(14,Math.max(1.6,base));
    const seconds = hasBeat ? pacing.beatMs/1000 : 0;
    const minimum = hasBeat ? Math.ceil(1.6/seconds) : 0;
    const maximum = hasBeat ? Math.max(minimum,Math.floor(14/seconds)) : 0;
    const interval = hasBeat ? seconds*Math.max(minimum,Math.min(maximum,Math.round(bounded/seconds))) : bounded;
    const transition = Number.isFinite(pacing.transitionMs) ? pacing.transitionMs/1000 : interval/4;
    const motion = fast || (!slow && pacing.pace === "fast") ? "crisp" : slow || pacing.pace === "slow" ? "soft" :
      result.energy>.64 ? "crisp" : result.energy<.40 ? "soft" : "balanced";
    return {style,texture,interval,transition:Math.min(1.7,Math.max(.25,transition)),motion};
  }

  function node(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className=className;
    if (value !== undefined) element.textContent=value;
    return element;
  }

  function answerRows(quiz) {
    const answers=quiz?.answers || {};
    return order.map(([key,label]) => {
      const answer=answers[key];
      if (key==="colors") {
        return [label,(Array.isArray(answer)?answer:[]).map(({hex,label,association})=>
          [label || hex,association].filter(Boolean).join(" — ")).join(" · ")];
      }
      return [label,typeof answer==="string"?answer:answer?.label || ""];
    }).map(([label,value])=>[label,value.trim() || "Пропущено"]);
  }

  function structuredData(day, profile, song) {
    const {tempo,energy,tone,method} = day.track || {};
    return {
      schemaVersion:1,date:day.date,questions:day.quiz,
      writtenEntry:day.text || "",photos:(day.pictures||[]).map(({label,signals},i)=>({index:i+1,label,signals})),
      music:{title:day.track?.title,tempo,energy,tone,method,description:song?.description,
        rhythm:SongVibe.pacing(day.track),connection:song?.connection},
      atmosphere:profile,localAI:day.atmosphereAI || null
    };
  }

  function renderSection(day, profile, ai, onSaved, song) {
    const panel=node("section","atmosphere-reading");
    const head=node("header","atmosphere-reading-head");
    const caption=node("p","atmosphere-reading-kind", ai ? "Локальная модель · " + ai.model : "Интерпретация по ответам");
    head.append(node("h3","","Атмосфера дня"),caption);
    const grid=node("div","atmosphere-reading-grid");
    for(const [title,description] of [["В кадре",ai?.visual || profile.visual],["В звуке",ai?.sound || profile.sound]]){
      if (!description) continue;
      const item=node("div","atmosphere-read-card");
      item.append(node("h4","",title),node("p","",description));
      grid.append(item);
    }
    for(const [title,items] of [["Что перекликается",ai?.connections?.length ? ai.connections : profile.connections],
      ["Что остаётся в контрасте",ai?.tensions?.length ? ai.tensions : profile.tensions]]){
      if (!items?.length) continue;
      const item=node("div","atmosphere-read-card");
      const list=node("dl","");
      for(const entry of items.slice(0,3)) list.append(node("dt","",entry.title),node("dd","",entry.detail));
      item.append(node("h4","",title),list);
      grid.append(item);
    }
    const answerSet=node("details","atmosphere-reading-details");
    answerSet.append(node("summary","","Ответы теста"));
    const list=node("dl","atmosphere-answer-list");
    for(const [label,value] of answerRows(day.quiz)) list.append(node("dt","",label),node("dd","",value));
    answerSet.append(list);
    panel.append(head,grid,answerSet);

    if (typeof onSaved === "function" && typeof AtmosphereAI !== "undefined") {
      const tools=node("div","atmosphere-local-ai");
      const actions=node("div","atmosphere-ai-actions");
      const analyze=node("button","silver",ai?"Повторить локальный анализ":"Сопоставить с фото с помощью ИИ");
      analyze.type="button";
      const stop=node("button","text-button","Остановить");
      stop.type="button";
      stop.hidden=true;
      const guide=node("a","text-button","Как включить локальную модель");
      guide.href="ЛОКАЛЬНЫЙ-ИИ.md";
      guide.target="_blank";
      guide.rel="noopener";
      const status=node("p","status");
      status.setAttribute("role","status");
      actions.append(analyze,stop,guide);
      tools.append(actions,status);
      panel.append(tools);
      let controller=null;
      stop.addEventListener("click",()=>controller?.abort());
      analyze.addEventListener("click", async ()=>{
        if (controller) return;
        controller=new AbortController();
        analyze.disabled=true;
        stop.hidden=false;
        status.classList.remove("error");
        status.textContent="Локальная модель сопоставляет ответы, фотографии и звучание…";
        try {
          const readingForAI=await AtmosphereAI.analyze({
            quiz:day.quiz,text:day.text,pictures:day.pictures,track:day.track,
            song,profile,signal:controller.signal
          });
          if (controller.signal.aborted) return;
          await onSaved({...readingForAI,model:readingForAI.model || AtmosphereAI.defaultModel,created:Date.now()});
          status.textContent="Прочтение готово.";
        } catch (error) {
          if (controller.signal.aborted) status.textContent="Анализ остановлен.";
          else {
            status.classList.add("error");
            status.textContent=error?.message || "Локальная модель недоступна. Проверь запуск Ollama.";
          }
        } finally {
          controller=null;
          analyze.disabled=false;
          stop.hidden=true;
        }
      });
    }

    return panel;
  }

  return {readDraft,saveDraft,answerText,localProfile,design,answerRows,structuredData,renderSection};
})();

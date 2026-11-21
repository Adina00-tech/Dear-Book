"use strict";

(() => {
  const entry = makeReferenceEntry();
  const {result,track} = entry;
  const byId = (id) => document.getElementById(id);
  const make = (tag, value) => {
    const node = document.createElement(tag);
    if (value !== undefined) node.textContent = value;
    return node;
  };
  MoodTheme.apply(document.documentElement,result,track.vibe);
  byId("boardLead").textContent = result.description;
  byId("boardVibeTitle").textContent = track.vibe.label;
  byId("boardVibeCopy").textContent = track.vibe.description;
  byId("boardVibeEvidence").textContent = track.vibe.evidence;
  byId("boardAudio").src = URL.createObjectURL(track.blob);
  byId("boardPins").replaceChildren(PinterestMood.section(entry));
  byId("boardPictures").replaceChildren(EditorialBoard.section(entry,{title:"Четыре референса",readOnly:true}));
  for (const color of result.palette) {
    const cell = make("div");
    cell.className = "board-color";
    const chip = make("i");
    chip.style.setProperty("--swatch",color.hex);
    chip.setAttribute("aria-hidden","true");
    cell.append(chip,make("strong",color.name),make("code",color.hex.toUpperCase()),make("p",color.meaning),make("small",color.evidence));
    if (color.detail) {
      const detail = make("p",color.detail);
      detail.className = "board-color-detail";
      cell.append(detail);
    }
    byId("boardColors").append(cell);
  }
})();

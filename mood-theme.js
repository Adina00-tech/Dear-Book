"use strict";

const MoodTheme = (() => {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const unit = (value, fallback) => Number.isFinite(value) ? clamp(value, 0, 1) : fallback;
  const wrap = (hue) => ((hue % 360) + 360) % 360;
  const angle = (a,b) => ((b - a + 540) % 360) - 180;
  const byte = (value) => Math.round(clamp(value,0,255)).toString(16).padStart(2,"0");

  function hsl(h,s,l) {
    const a = s * Math.min(l,1-l);
    const channel = (offset) => {
      const k = (offset + wrap(h)/30)%12;
      return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
    };
    return "#" + byte(channel(0)) + byte(channel(8)) + byte(channel(4));
  }

  function rgb(hex) {
    if (typeof hex !== "string" || !/^#[0-9a-f]{6}$/i.test(hex)) return null;
    return [1,3,5].map((index) => parseInt(hex.slice(index,index+2),16)/255);
  }

  function measure(hex) {
    const values = rgb(hex);
    if (!values) return null;
    const [r,g,b] = values;
    const high = Math.max(r,g,b), low = Math.min(r,g,b);
    const chroma = high - low;
    const light = (high + low) / 2;
    if (!chroma) return {hue:150,sat:0,light};
    const hue = high === r ? (g-b)/chroma : high === g ? (b-r)/chroma+2 : (r-g)/chroma+4;
    return {hue:wrap(hue*60),sat:chroma/(1-Math.abs(2*light-1)),light};
  }

  function luminance(hex) {
    return rgb(hex).reduce((sum,c,index) => sum + [0.2126,0.7152,0.0722][index] *
      (c <= 0.04045 ? c/12.92 : ((c+0.055)/1.055)**2.4), 0);
  }

  function contrast(a,b) {
    const pair = [luminance(a),luminance(b)].sort((x,y) => y-x);
    return (pair[0]+0.05)/(pair[1]+0.05);
  }

  function readable(hue,sat,first,direction,backgrounds,minimum) {
    for (let step = 0; step < 30; step++) {
      const candidate = hsl(hue,sat,first+direction*step*0.026);
      if (backgrounds.every((color) => contrast(candidate,color) >= minimum)) return candidate;
    }
    return direction > 0 ? "#ffffff" : "#111111";
  }

  function build(result = null, song = null) {
    const colors = (result?.palette || []).map((color) => measure(color.hex)).filter(Boolean);
    const photograph = colors[1] ?? colors[0];
    const chromatic = colors.filter((color) => color.sat > .13);
    const base = photograph?.sat > .15 ? photograph : chromatic[0] || photograph;
    const songColor = measure(song?.hue);
    const story = colors[0]?.sat > .13 ? colors[0] : chromatic[1];
    const photoHue = base?.hue ?? songColor?.hue ?? 153;
    const storyOffset = story ? clamp(angle(photoHue,story.hue),-52,52) * .23 : 0;
    const mixedHue = wrap(photoHue + storyOffset + (songColor ? clamp(angle(photoHue,songColor.hue),-98,98) * .32 : 0));
    const accentHue = wrap(mixedHue + (songColor ? clamp(angle(mixedHue,songColor.hue),-48,48) * .76 : -5));
    const energy = unit(song?.energy,unit(result?.energy,.38));
    const brightness = unit(result?.brightness,base?.light ?? .67);
    const isCool = mixedHue >= 148 && mixedHue <= 284;
    const deep = Boolean(result && brightness < (song?.tone === "cool" ? .39 : .31) && (isCool || energy > .64));
    const texture = clamp(.10 + (base?.sat ?? .23) * .16 + energy * .04,.12,.25);
    const t = (sat,light) => hsl(mixedHue,sat,light);
    const a = (sat,light) => hsl(accentHue,sat,light);
    const surfaces = deep ? {
      bg:t(texture,.123), glow:t(texture+.07,.25), surface:t(texture,.18), panel:t(texture,.215),
      input:t(texture,.149), chrome:t(texture,.266), lower:t(texture,.225), hover:t(texture,.274),
      rim:t(texture,.39), line:t(texture,.305), shine:t(texture,.34), mask:t(texture,.10),
      buttonTop:a(.39+energy*.05,.75), buttonBottom:a(.34,.58), buttonRim:a(.32,.55)
    } : {
      bg:t(texture,.895), glow:t(texture+.04,.971), surface:t(texture,.967), panel:t(texture+.02,.923),
      input:t(texture,.983), chrome:t(texture,.965), lower:t(texture+.02,.858), hover:t(texture+.025,.925),
      rim:t(texture,.66), line:t(texture,.784), shine:"#fbfdfb", mask:t(texture,.16),
      buttonTop:a(.40+energy*.07,.888), buttonBottom:a(.34+energy*.1,.678), buttonRim:a(.34,.48)
    };
    const backgrounds = [surfaces.bg,surfaces.surface,surfaces.panel,surfaces.input,surfaces.lower,surfaces.hover,surfaces.chrome,surfaces.glow];
    const ink = readable(mixedHue,.20,deep?.94:.17,deep?1:-1,backgrounds,7);
    const muted = readable(mixedHue,.17,deep?.79:.36,deep?1:-1,backgrounds,4.6);
    const link = readable(accentHue,.46,deep?.83:.308,deep?1:-1,backgrounds,4.6);
    const focus = readable(accentHue,.56,deep?.77:.39,deep?1:-1,backgrounds,3.2);
    const error = readable(2,.54,deep?.86:.34,deep?1:-1,backgrounds,4.6);
    const buttonInk = readable(accentHue,.37,.15,-1,[surfaces.buttonTop,surfaces.buttonBottom],4.7);
    const tempo = song?.tempo && Number.isFinite(song.tempo) ? clamp(song.tempo,55,170) : 92;
    const wheel = clamp(46 - (tempo-70)*.21,23,51);
    const transition = Math.round(370 + (1-energy)*370);
    const css = {
      "--ink":ink,"--muted":muted,"--teal":link,"--paper":surfaces.bg,"--rim":surfaces.rim,
      "--m-bg":surfaces.bg,"--m-glow":surfaces.glow,"--m-surface":surfaces.surface,"--m-panel":surfaces.panel,
      "--m-input":surfaces.input,"--m-chrome":surfaces.chrome,"--m-lower":surfaces.lower,"--m-hover":surfaces.hover,
      "--m-rim":surfaces.rim,"--m-line":surfaces.line,"--m-shine":surfaces.shine,"--m-mask":surfaces.mask,
      "--m-button-top":surfaces.buttonTop,"--m-button-bottom":surfaces.buttonBottom,"--m-button-rim":surfaces.buttonRim,
      "--m-button-ink":buttonInk,"--m-focus":focus,"--m-error":error,"--m-orb":a(.36,deep?.58:.56),
      "--m-wheel-time":wheel.toFixed(2)+"s","--m-wheel-hit":clamp(3.8-(tempo-66)*.022,1.75,4).toFixed(2)+"s",
      "--m-transition":transition+"ms","--m-grain":deep?".11":".19"
    };
    return {css, deep, hue:mixedHue, accentHue, contrast:Math.min(...backgrounds.map((bg)=>contrast(ink,bg))),
      mutedContrast:Math.min(...backgrounds.map((bg)=>contrast(muted,bg)))};
  }

  function apply(root, result, song) {
    const theme = build(result,song);
    root.dataset.ambience=theme.deep?"deep":"light";
    if (!result) root.dataset.draft="empty";
    else delete root.dataset.draft;
    for (const [option,value] of Object.entries(theme.css)) root.style.setProperty(option,value);
    return theme;
  }

  return {build,apply,contrast};
})();

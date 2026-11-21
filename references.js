"use strict";
const ReferenceBoard = {
  "date": "2026-11-21",
  "title": "Стекло, бумага и туман",
  "text": "На столе остались кружка и проводные наушники. В тетради лежат очки, за окном дождь. Дорога между домами почти исчезает в тумане. Эти четыре референса держатся на мягком свете и вещах, которые легко не заметить.",
  "description": "Здесь день собирается из мелочей: свет на кружке, очки на бумаге, мокрая улица и телефон у стекла. Молочные детали дают передышку, графит удерживает внимание, а туман и дождевой синий оставляют между кадрами воздух.",
  "palette": [
    {
      "hex": "#c9c0b6",
      "name": "Молочный тауп",
      "meaning": "Тепло знакомых вещей.",
      "evidence": "Провод наушников, светлая посуда и ткань в первом коллаже.",
      "detail": "Матовые поверхности удерживают мягкий свет, как короткая пауза между делами."
    },
    {
      "hex": "#5c6550",
      "name": "Влажная олива",
      "meaning": "Тишина жилой улицы.",
      "evidence": "Листья и кусты темнеют по краям туманного проезда.",
      "detail": "Мягкая граница между листвой и туманом ведёт взгляд вглубь."
    },
    {
      "hex": "#5b5c60",
      "name": "Бумажный графит",
      "meaning": "Сосредоточенность с усталостью.",
      "evidence": "Очки, тетрадь и карандаш в тёмном коллаже.",
      "detail": "Мелкие линии и тесное кадрирование собирают внимание в одной точке."
    },
    {
      "hex": "#8b9eae",
      "name": "Синий мокрого стекла",
      "meaning": "Пауза за окном.",
      "evidence": "Капли на стекле и на экране телефона смягчают дальний свет.",
      "detail": "Чёткие капли и размытый фон передают ощущение, будто время на секунду остановилось."
    }
  ],
  "trackTitle": "Пауза между окнами",
  "vibe": {
    "label": "Тихий, чуть задумчивый",
    "description": "Мягкие клавиши оставляют длинные паузы, как между двумя случайными кадрами. Стеклянный обертон похож на далёкий свет за мокрым окном, а приглушённый щелчок собирает ритм.",
    "evidence": "Авторская зарисовка · 76 BPM · мягкая атака · редкие высокие акценты",
    "hue": "#899ca9",
    "energy": 0.24,
    "tempo": 76,
    "tone": "cool"
  }
};
ReferenceBoard.pictures = EditorialAssets.map(({label,data}) => ({label,data}));

function referenceAudio() {
  const rate = 22050;
  const beat = 60/ReferenceBoard.vibe.tempo;
  const length = Math.ceil(16*beat*rate);
  const pcm = new Float32Array(length);
  const tau = 2*Math.PI;
  const notes = [[0,55,.16],[2,62,.19],[4,65,.17],[6,69,.15],[8,60,.17],[10,64,.17],[12,67,.15],[14,62,.16]];
  for (const [at,note,volume] of notes) {
    const hz = 440*2**((note-69)/12);
    const start = Math.floor(at*beat*rate);
    const samples = Math.min(length-start,Math.floor(2.65*rate));
    for (let index=0;index<samples;index++) {
      const t=index/rate;
      const soft=(1-Math.exp(-t*34))*Math.exp(-t*2.05);
      const chime=(1-Math.exp(-t*70))*Math.exp(-t*7.4);
      pcm[start+index] += volume * (Math.sin(tau*hz*t + .19*Math.sin(tau*hz*2*t))*soft +
        .22*Math.sin(tau*hz*2.006*t)*chime + .13*Math.sin(tau*hz*3.009*t)*chime);
    }
  }
  for(const at of [1.5,5.5,9.5,13.5]){
    const start=Math.floor(at*beat*rate);
    for(let index=0;index<rate*.085;index++){
      const t=index/rate;
      pcm[start+index] += .048 * Math.sin(tau*193*t) * Math.exp(-t*62) * (1-Math.exp(-t*620));
    }
  }
  const buffer = new ArrayBuffer(44+length*2);
  const view = new DataView(buffer);
  const word = (offset,value) => [...value].forEach((char,index)=>view.setUint8(offset+index,char.charCodeAt(0)));
  word(0,"RIFF");view.setUint32(4,buffer.byteLength-8,true);word(8,"WAVE");word(12,"fmt ");
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
  word(36,"data");view.setUint32(40,length*2,true);
  for(let index=0;index<length;index++){
    const fade=Math.max(0,Math.min(1,(length-1-index)/(rate*.58)));
    view.setInt16(44+index*2,Math.round(32767*pcm[index]*fade),true);
  }
  return new Blob([buffer],{type:"audio/wav"});
}

function makeReferenceEntry() {
  const {title,text,date,description,palette,pictures,trackTitle,vibe} = ReferenceBoard;
  return {
    id:"reference-board",created:0,demo:true,reference:true,date,title,text,pictures,
    track:{title:trackTitle,tempo:vibe.tempo,energy:vibe.energy,tone:vibe.tone,method:"авторская зарисовка",
      vibe,source:"file",extension:"wav",blob:referenceAudio()},
    result:{title,description,palette,art:"Повседневная плёночная фотография",technique:"Рассеянный свет, приглушённая палитра и бытовой крупный план",
      rhythm:6.3,brightness:.78,contrast:.46,energy:vibe.energy,soundTone:vibe.tone,mood:"Тихий свет",
      textClue:"Знакомые предметы и пауза у окна.",photoClue:"Молочная посуда, туман во дворе, тёмная бумага и капли на стекле.",musicClue:"Медленные клавиши и короткие стеклянные обертоны."}
  };
}

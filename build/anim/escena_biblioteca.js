/* Escena de la biblioteca: el ninot entra caminant, agafa un llibre de l'estanteria, torna al seu lloc,
   l'obre i passa pàgines. El ninot és el del dibuix original, retallat en peces (cap i tronc, cames, braços, llibre)
   que es mouen; només són dibuixats de nou els braços mentre camina, el llibre tancat i la pàgina que gira.
   L'últim fotograma és el dibuix original.

   BibliotecaAnimada(figura, src) -> {play(), seek(t), ready, playing, speed, total}
   Totes les coordenades són píxels de la imatge original (441 x 585). */
(function(){
const INK = '#141312', LW = 3.6;
const SHOULDER = [29, 445], HIP = [30, 512], ARM_L = 45;         // punt d'on surten els braços, maluc, llargada del braç
const HAND1 = [52, 423], HAND2 = [78, 428];                       // on acaben els dos braços al dibuix original
const S0 = [70, 425], S1 = [81, 382];                             // llom del llibre obert (baix, dalt)
const TR = [111, 377], BR = [103, 415], TL = [57, 380], BL = [43, 417];   // cantonades de les pàgines dreta i esquerra
const TILT = Math.atan2(S1[0]-S0[0], S0[1]-S1[1]);                // inclinació del llibre
const SHELF_BOOK = {x: 131, y: 427, w: 13, h: 42};                // llibre afegit al forat del prestatge de baix
const DX_IN = -80, DX_SHELF = 57, STEP = 22, SWING = 26;          // entra des de fora, s'atura a l'estanteria
const LEG_L0 = -22, LEG_R0 = 37;                                  // angle (graus) de cada cama al dibuix original
const T = {in0: 0.4, in1: 2.9, reach: 3.4, grab: 3.7, pull: 4.1, back: 5.7, raise: 6.3, open: 6.9, flip: 0.45, flipGap: 0.28, flips: 4};
T.end = T.open + 0.3 + T.flips * (T.flip + T.flipGap) + 0.2;

const lerp = (a, b, t) => a + (b - a) * t, clamp = t => Math.max(0, Math.min(1, t));
const ease = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const rad = d => d * Math.PI / 180;

window.BibliotecaAnimada = function(fig, src){
  const cv = fig.querySelector('canvas'), ctx = cv.getContext('2d');
  let W, H, orig, base, spr = {}, paper = '#fdfbfb', raf = 0, playing = false, ready = false, t0 = 0;
  const api = {play, seek, speed: 1, total: T.end, onready: null, onstate: null, get playing(){ return playing; }, get ready(){ return ready; }};

  const img = new Image();
  img.onload = () => { prepare(); ready = true; ctx.drawImage(orig, 0, 0); if (api.onready) api.onready(); };
  img.src = src;

  function layer(){ const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }

  function prepare(){
    W = cv.width = img.naturalWidth; H = cv.height = img.naturalHeight;
    orig = layer(); orig.getContext('2d').drawImage(img, 0, 0);
    const id = orig.getContext('2d').getImageData(0, 0, W, H), d = id.data;
    const p0 = (470*W + 10)*4; paper = `rgb(${d[p0]},${d[p0+1]},${d[p0+2]})`;
    const bgMin = Math.min(d[p0], d[p0+1], d[p0+2]);
    // Retalla el ninot (tot el que hi ha a l'esquerra de l'estanteria, a baix) en peces
    const names = ['body', 'legL', 'legR', 'arms', 'book'], data = {};
    names.forEach(n => data[n] = new ImageData(W, H));
    const bd = new Uint8ClampedArray(d);
    const bookBottom = x => x <= 70 ? 417 + (x - 43) * 8 / 27 : 425 - (x - 70) * 10 / 33;
    for (let y = 351; y < H; y++) for (let x = 0; x < 116; x++){
      const p = (y*W + x)*4;
      if (bgMin - Math.min(d[p], d[p+1], d[p+2]) <= 3) continue;
      let n;
      if ((y < 398 && x < 46) || (x <= 33 && y < 512)) n = 'body';
      else if (y >= 512) n = x <= 28 + (y - 512) * 0.1 ? 'legL' : 'legR';
      else if (x >= 34 && y >= 419 && y > bookBottom(x) + 3) n = 'arms';
      else n = 'book';
      const o = data[n].data; o[p] = d[p]; o[p+1] = d[p+1]; o[p+2] = d[p+2]; o[p+3] = 255;
      bd[p] = d[p0]; bd[p+1] = d[p0+1]; bd[p+2] = d[p0+2];
    }
    names.forEach(n => { spr[n] = layer(); spr[n].getContext('2d').putImageData(data[n], 0, 0); });
    base = layer(); base.getContext('2d').putImageData(new ImageData(bd, W, H), 0, 0);   // escena sense el ninot
  }

  function line(a, b, alpha){
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.restore();
  }
  // llibre tancat (llom), centrat a (cx,cy) i girat rot radians
  function closedBook(cx, cy, rot, alpha){
    const w = SHELF_BOOK.w, h = SHELF_BOOK.h;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.fillStyle = paper; ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-w/2, -h/2 + 1); ctx.lineTo(w/2 - 1, -h/2); ctx.lineTo(w/2, h/2); ctx.lineTo(-w/2 + 0.5, h/2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1.3; ctx.beginPath();                                   // títol gargotejat al llom
    for (let i = 0; i < 9; i++){ const y = -h/2 + 7 + i * 3.4, x = (i % 2 ? 2.2 : -2.2); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
  }
  function sprite(s, dx, dy, pivot, rot, alpha){
    ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
    ctx.translate(dx, dy);
    if (rot){ ctx.translate(pivot[0], pivot[1]); ctx.rotate(rot); ctx.translate(-pivot[0], -pivot[1]); }
    ctx.drawImage(s, 0, 0); ctx.restore();
  }

  function render(t){
    if (t >= T.end){ ctx.drawImage(orig, 0, 0); return; }
    ctx.drawImage(base, 0, 0);

    // --- posició i pas ---
    let dx, wf;                       // desplaçament horitzontal i intensitat del pas (0 = dret, 1 = caminant)
    if (t < T.in1){ dx = lerp(DX_IN, DX_SHELF, seg(t, T.in0, T.in1)); wf = seg(t, T.in0, T.in0 + 0.15) * (1 - seg(t, T.in1 - 0.22, T.in1)); }
    else if (t < T.pull){ dx = DX_SHELF; wf = 0; }
    else if (t < T.back){ dx = lerp(DX_SHELF, 0, seg(t, T.pull, T.back)); wf = seg(t, T.pull, T.pull + 0.15) * (1 - seg(t, T.back - 0.22, T.back)); }
    else { dx = 0; wf = 0; }
    const ph = (dx - DX_IN) / STEP * Math.PI, sw = Math.sin(ph), bob = -2.2 * Math.abs(Math.cos(ph)) * wf;
    const A = [SHOULDER[0] + dx, SHOULDER[1] + bob];
    const armEnd = deg => [A[0] + ARM_L * Math.sin(rad(deg)), A[1] + ARM_L * Math.cos(rad(deg))];

    // --- cames (peces originals girant al maluc) i cos ---
    sprite(spr.legL, dx, bob, HIP, rad(wf * (LEG_L0 - SWING * sw)));
    sprite(spr.legR, dx, bob, HIP, rad(wf * (LEG_R0 + SWING * sw)));
    sprite(spr.body, dx, bob);

    // --- braços, llibre tancat ---
    let h1 = armEnd(-8 - 26 * sw * wf), h2 = armEnd(8 + 26 * sw * wf);   // pengen i es gronxen
    let bookC = null, bookRot = 0, bookAlpha = 1, vecAlpha = 1, sprAlpha = 0, openS = 0;
    const inShelf = [SHELF_BOOK.x + SHELF_BOOK.w/2, SHELF_BOOK.y + SHELF_BOOK.h/2];
    if (t < T.in1) bookC = inShelf;
    else if (t < T.grab){ h2 = armEnd(lerp(8, 87, ease(seg(t, T.in1, T.reach)))); bookC = inShelf; }       // allarga el braç
    else if (t < T.raise){                                                                                  // el treu i se l'emporta
      const a = lerp(87, 68, ease(seg(t, T.grab, T.pull)));
      h2 = armEnd(a); bookC = [h2[0] + 6.5, h2[1] + 3]; bookRot = rad((a - 87) * 0.45);
      if (t >= T.back){                                                                                     // el puja a la posició de llegir
        const e = ease(seg(t, T.back, T.raise));
        h1 = [lerp(h1[0], HAND1[0], e), lerp(h1[1], HAND1[1], e)];
        h2 = [lerp(h2[0], HAND2[0], e), lerp(h2[1], HAND2[1], e)];
        bookC = [lerp(bookC[0], (S0[0]+S1[0])/2, e), lerp(bookC[1], (S0[1]+S1[1])/2, e)]; bookRot = lerp(bookRot, TILT, e);
      }
    } else {                                                                                                // l'obre
      h1 = HAND1; h2 = HAND2; bookC = [(S0[0]+S1[0])/2, (S0[1]+S1[1])/2]; bookRot = TILT;
      const e = seg(t, T.raise, T.open);
      openS = lerp(0.14, 1, ease(e)); bookAlpha = 1 - seg(e, 0, 0.45); sprAlpha = seg(e, 0, 0.3); vecAlpha = 1 - sprAlpha;
    }
    if (openS){                                                         // llibre obert original, que s'obre des del llom
      const cx = (S0[0]+S1[0])/2, cy = (S0[1]+S1[1])/2;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(TILT); ctx.scale(openS, 1); ctx.rotate(-TILT); ctx.translate(-cx, -cy);
      ctx.drawImage(spr.book, 0, 0); ctx.restore();
    }
    if (bookC && bookAlpha > 0) closedBook(bookC[0], bookC[1], bookRot, bookAlpha);
    if (vecAlpha > 0){ line(A, h1, vecAlpha); line(A, h2, vecAlpha); }
    if (sprAlpha > 0) sprite(spr.arms, 0, 0, null, 0, sprAlpha);

    // --- passa pàgines ---
    const tf = t - T.open - 0.3;
    if (tf >= 0){
      const k = Math.floor(tf / (T.flip + T.flipGap)), u = (tf - k * (T.flip + T.flipGap)) / T.flip;
      if (k < T.flips && u < 1){
        const e = ease(u), lift = -15 * Math.sin(Math.PI * e);
        const F1 = [lerp(TR[0], TL[0], e), lerp(TR[1], TL[1], e) + lift], F0 = [lerp(BR[0], BL[0], e), lerp(BR[1], BL[1], e) + lift];
        ctx.save(); ctx.fillStyle = paper; ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(S0[0], S0[1]); ctx.lineTo(S1[0], S1[1]); ctx.lineTo(F1[0], F1[1]); ctx.lineTo(F0[0], F0[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }
  }

  function state(s){ if (api.onstate) api.onstate(s); }
  function play(){
    if (!ready) return;
    cancelAnimationFrame(raf);
    if (!api.force && matchMedia('(prefers-reduced-motion:reduce)').matches){ render(T.end); state('done'); return; }
    playing = true; t0 = performance.now(); state('playing');
    const speed = api.speed || 1;
    const frame = now => {
      const t = (now - t0) / 1000 * speed; render(t);
      if (t >= T.end){ playing = false; state('done'); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }
  function seek(t){ if (!ready) return; cancelAnimationFrame(raf); playing = false; render(t); }
  return api;
};
})();

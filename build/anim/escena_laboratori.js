/* Escena del laboratori.
   1) El científic entra caminant per l'esquerra, s'asseu al tamboret i abaixa el cap per mirar pel microscopi.
   2) A la lent de 100x apareix la corba, encara poc definida.
   3) El científic allarga el braç fins a la rodeta del microscopi, la fa girar, i la lent de 1000x es va enfocant.
   El cap, l'esquena, els braços i les cames són trossos del dibuix original que es mouen; només es dibuixen de nou
   el cos i les cames mentre camina i la marca que gira a la rodeta. L'últim fotograma és el dibuix original.

   LaboratoriAnimat(figura, src) -> {play(), seek(t), ready, playing, speed, total}
   Coordenades en píxels de la imatge original (1375 x 554). */
(function(){
const INK = '#141312', LW = 3.2;
const C2 = [665, 320], C3 = [1125, 320];           // un punt dins de cada lent
const NECK = [178, 252];                            // on el cap s'uneix amb l'esquena (eix de gir del cap)
const ARM_P = [150, 301], ARM_H = [225, 317];       // braç de sota: espatlla i mà al dibuix original
const KNOB = [288, 354], KNOB_GRIP = [279, 351];    // rodeta del microscopi i punt on hi arriba la mà
const FLOOR = 525, HIP_Y = 425, WALK_X0 = -45, WALK_X1 = 104, STEP = 30, SWING = 24, LEG = FLOOR - HIP_Y;
const T = {walk0: 0.3, walk1: 2.7, sit: 3.4, look0: 3.8, look1: 4.5, l2a: 4.8, l2b: 5.7, reach0: 6.0, reach1: 6.6, focus1: 9.6, back: 10.2};
T.end = T.back + 0.25;

const lerp = (a, b, t) => a + (b - a) * t, clamp = t => Math.max(0, Math.min(1, t)), seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const rad = d => d * Math.PI / 180;

window.LaboratoriAnimat = function(fig, src){
  const cv = fig.querySelector('canvas'), ctx = cv.getContext('2d');
  let W, H, orig, base, spr = {}, raf = 0, playing = false, ready = false, t0 = 0;
  const api = {play, seek, speed: 1, total: T.end, onready: null, onstate: null, dbg: null, get playing(){ return playing; }, get ready(){ return ready; }};

  const img = new Image();
  img.onload = () => { prepare(); ready = true; ctx.drawImage(orig, 0, 0); if (api.onready) api.onready(); };
  img.src = src;
  const canvas = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };

  function prepare(){
    W = cv.width = img.naturalWidth; H = cv.height = img.naturalHeight;
    orig = canvas(); orig.getContext('2d').drawImage(img, 0, 0);
    const d = orig.getContext('2d').getImageData(0, 0, W, H).data, N = W*H, queue = new Int32Array(N);
    const isDark = i => d[i*4] < 70 && d[i*4+1] < 70 && d[i*4+2] < 70;

    // --- Lents: interior de cada marc negre (s'omple des d'un punt de dins sense travessar el marc) ---
    const comp = new Int32Array(N).fill(-1), sizes = [];
    for (let s = 0; s < N; s++){
      if (!isDark(s) || comp[s] >= 0) continue;
      const id = sizes.length; let head = 0, tail = 0; queue[tail++] = s; comp[s] = id;
      while (head < tail){
        const i = queue[head++], x = i % W, y = (i/W)|0;
        if (x > 0 && isDark(i-1) && comp[i-1] < 0){ comp[i-1] = id; queue[tail++] = i-1; }
        if (x < W-1 && isDark(i+1) && comp[i+1] < 0){ comp[i+1] = id; queue[tail++] = i+1; }
        if (y > 0 && isDark(i-W) && comp[i-W] < 0){ comp[i-W] = id; queue[tail++] = i-W; }
        if (y < H-1 && isDark(i+W) && comp[i+W] < 0){ comp[i+W] = id; queue[tail++] = i+W; }
      }
      sizes.push(tail);
    }
    const frames = sizes.map((n, id) => [n, id]).sort((a, b) => b[0] - a[0]).slice(0, 2).map(a => a[1]);
    const isFrame = i => comp[i] === frames[0] || comp[i] === frames[1];
    function interior(c){
      const inside = new Uint8Array(N); let head = 0, tail = 0; const s = c[1]*W + c[0]; queue[tail++] = s; inside[s] = 1;
      while (head < tail){
        const i = queue[head++], x = i % W, y = (i/W)|0;
        for (const j of [x > 0 ? i-1 : -1, x < W-1 ? i+1 : -1, y > 0 ? i-W : -1, y < H-1 ? i+W : -1]){
          if (j < 0 || inside[j] || isFrame(j)) continue; inside[j] = 1; queue[tail++] = j;
        }
      }
      return inside;
    }
    const in2 = interior(C2), in3 = interior(C3);
    const pl = (200*W + 665)*4, lensPaper = [d[pl], d[pl+1], d[pl+2]];
    const pb = (300*W + 40)*4, paper = [d[pb], d[pb+1], d[pb+2]];

    // --- Peces: contingut de cada lent i trossos del científic ---
    const names = ['lens2', 'lens3', 'head', 'seated', 'arm'], data = {};
    names.forEach(n => data[n] = new ImageData(W, H));
    const bd = new Uint8ClampedArray(d);
    const put = (n, p, fill) => { const o = data[n].data; o[p] = d[p]; o[p+1] = d[p+1]; o[p+2] = d[p+2]; o[p+3] = 255; bd[p] = fill[0]; bd[p+1] = fill[1]; bd[p+2] = fill[2]; };
    const paperMin = Math.min(paper[0], paper[1], paper[2]), lensMin = Math.min(lensPaper[0], lensPaper[1], lensPaper[2]);
    for (let i = 0; i < N; i++){
      const p = i*4, x = i % W, y = (i/W)|0, mn = Math.min(d[p], d[p+1], d[p+2]), mx = Math.max(d[p], d[p+1], d[p+2]);
      if (in2[i] || in3[i]){ if (lensMin - mn > 3) put(in2[i] ? 'lens2' : 'lens3', p, lensPaper); continue; }
      if (x > 232 || y < 214 || y > 470 || paperMin - mn <= 0 || mx - mn > 60) continue;      // el científic és traç negre/gris, a l'esquerra
      let n = null;
      if (y <= 269 && x >= 174 && x <= 221 && (y < 255 || x < 213) && (y < 253 || x >= 178)) n = 'head';
      else if (y >= 253 && y <= 358 && x >= 124 && x <= (y < 281 ? 177 : 152)) n = 'seated';                 // esquena
      else if (y > 358 && y <= 362 && x >= 130 && x <= 139) n = 'seated';                                    // final de l'esquena, damunt del seient
      else if (y >= 281 && y <= 322 && x >= 153 && x <= 231) n = y > 297 + (x - 150) * 0.21 + 3 ? 'arm' : 'seated';   // braços
      else if (y >= 407 && ((x >= 130 && x <= 150 && y <= 462) || (x >= 151 && x <= 166 && y <= 468))) n = 'seated';  // cames
      if (n) put(n, p, paper);
    }
    names.forEach(n => { spr[n] = canvas(); spr[n].getContext('2d').putImageData(data[n], 0, 0); });
    base = canvas(); base.getContext('2d').putImageData(new ImageData(bd, W, H), 0, 0);
    api.dbg = {frames: frames.map(f => sizes[f]), paper, lensPaper};
  }

  function line(pts, alpha){
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); ctx.restore();
  }
  function blurred(layer, blur, alpha){
    ctx.save(); ctx.globalAlpha = clamp(alpha); if (blur > 0.15) ctx.filter = `blur(${blur.toFixed(2)}px)`;
    ctx.drawImage(layer, 0, 0); ctx.restore();
  }

  function render(t){
    if (t >= T.end){ ctx.drawImage(orig, 0, 0); return; }
    ctx.drawImage(base, 0, 0);

    // ---------- 1) el científic ----------
    const sit = ease(seg(t, T.walk1, T.sit));                 // 0 = dret (caminant), 1 = assegut
    // caminant: maluc i coll del ninot dret
    const hx = lerp(WALK_X0, WALK_X1, seg(t, T.walk0, T.walk1));
    const wf = seg(t, T.walk0, T.walk0 + 0.15) * (1 - seg(t, T.walk1 - 0.25, T.walk1));
    const ph = (hx - WALK_X0) / STEP * Math.PI, sw = Math.sin(ph), bob = -2.5 * Math.abs(Math.cos(ph)) * wf;
    const hip = [hx, HIP_Y + bob], neckW = [hx + 8, HIP_Y - 108 + bob];
    if (sit < 1 && t >= T.walk0){
      const a = 1 - sit, foot = deg => [hip[0] + LEG * Math.sin(rad(deg)), hip[1] + LEG * Math.cos(rad(deg))];
      const sh = [lerp(hip[0], neckW[0], 0.78), lerp(hip[1], neckW[1], 0.78)];
      line([neckW, hip], a);                                                    // tronc
      line([hip, foot(SWING * sw * wf + 4)], a); line([hip, foot(-SWING * sw * wf - 4)], a);   // cames
      line([sh, [sh[0] + 62 * Math.sin(rad(-SWING * sw * wf + 6)), sh[1] + 62 * Math.cos(rad(-SWING * sw * wf + 6))]], a);   // braç
    }
    // assegut: peces originals (esquena, braç de dalt, cames) que pugen al seu lloc
    if (sit > 0) { ctx.save(); ctx.globalAlpha = sit; ctx.drawImage(spr.seated, lerp(-22, 0, sit), lerp(26, 0, sit)); ctx.restore(); }
    // cap: sempre el del dibuix. Dret va sobre el coll del ninot; assegut gira al voltant del coll fins a l'ocular
    if (t >= T.walk0){
      const nx = lerp(neckW[0], NECK[0], sit), ny = lerp(neckW[1], NECK[1], sit);
      const rot = rad(lerp(lerp(-30, -34, sit), 0, ease(seg(t, T.look0, T.look1))));
      ctx.save(); ctx.translate(nx, ny); ctx.rotate(rot); ctx.translate(-NECK[0], -NECK[1]); ctx.drawImage(spr.head, 0, 0); ctx.restore();
    }
    // braç de sota: al seu lloc, o allargat fins a la rodeta mentre enfoca
    if (sit > 0){
      const r = ease(seg(t, T.reach0, T.reach1)) * (1 - ease(seg(t, T.focus1, T.back)));
      const turning = t > T.reach1 && t < T.focus1;
      const a0 = Math.atan2(ARM_H[1] - ARM_P[1], ARM_H[0] - ARM_P[0]), l0 = Math.hypot(ARM_H[0] - ARM_P[0], ARM_H[1] - ARM_P[1]);
      const a1 = Math.atan2(KNOB_GRIP[1] - ARM_P[1], KNOB_GRIP[0] - ARM_P[0]) + (turning ? rad(1.2) * Math.sin((t - T.reach1) * 9) : 0);
      const l1 = Math.hypot(KNOB_GRIP[0] - ARM_P[0], KNOB_GRIP[1] - ARM_P[1]);
      ctx.save(); ctx.globalAlpha = sit; ctx.translate(lerp(-22, 0, sit), lerp(26, 0, sit));
      ctx.translate(ARM_P[0], ARM_P[1]); ctx.rotate(lerp(a0, a1, r)); ctx.scale(lerp(1, l1 / l0, r), 1); ctx.rotate(-a0); ctx.translate(-ARM_P[0], -ARM_P[1]);
      ctx.drawImage(spr.arm, 0, 0); ctx.restore();
    }

    // ---------- 2) lent de 100x: apareix la corba, poc definida ----------
    if (t > T.l2a){ const u = seg(t, T.l2a, T.l2b); blurred(spr.lens2, 7 * (1 - ease(u)), 0.1 + 0.9 * ease(u)); }

    // ---------- 3) la rodeta gira i la lent de 1000x s'enfoca ----------
    if (t > T.reach1){
      const u = seg(t, T.reach1, T.focus1);
      if (u < 1){                                                                // marca que gira dins la rodeta i arcs de moviment
        const ang = (t - T.reach1) * 5.5;
        ctx.save(); ctx.strokeStyle = INK; ctx.lineCap = 'round';
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(KNOB[0], KNOB[1]); ctx.lineTo(KNOB[0] + 4.2 * Math.cos(ang), KNOB[1] + 4.2 * Math.sin(ang)); ctx.stroke();
        ctx.lineWidth = 1.6; ctx.globalAlpha = 0.75;
        for (const o of [0, Math.PI]){ ctx.beginPath(); ctx.arc(KNOB[0], KNOB[1], 14, ang + o, ang + o + 1.1); ctx.stroke(); }
        ctx.restore();
      }
      // desenfocament: baixa amb vaivens, com quan es busca el focus
      const blur = 22 * Math.pow(1 - u, 1.5) + 5 * Math.abs(Math.sin(u * Math.PI * 3)) * (1 - u);
      blurred(spr.lens3, blur, 0.25 + 1.1 * ease(u));
    }
  }

  function state(s){ if (api.onstate) api.onstate(s); }
  function play(){
    if (!ready) return;
    cancelAnimationFrame(raf);
    if (matchMedia('(prefers-reduced-motion:reduce)').matches){ render(T.end); state('done'); return; }
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

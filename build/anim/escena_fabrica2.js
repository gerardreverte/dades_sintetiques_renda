/* Escena de la segona fàbrica (generació de les microdades sintètiques).
   Com la primera, amb tres diferències: en prémer el botó es carreguen les tres bateries de la màquina (el verd puja),
   les targetes de paràmetres cauen a la tolva giravoltant, i els outputs surten en tren i s'apilen al munt de la dreta.
   1) Es dibuixa el cercle vermell sobre la finestra groga i la fletxa.
   2) La persona entra caminant, arriba a la màquina i prem el botó amb la paleta; les bateries es carreguen.
   3) La màquina treballa: surt fum, cauen els inputs per la tolva i surten els outputs per la cinta.
   Tot el que es mou són trossos del dibuix original; l'últim fotograma és el dibuix original.

   Fabrica2Animada(figura, src) -> {play(), seek(t), ready, playing, speed, total}
   Coordenades en píxels de la imatge original (1315 x 880). */
(function(){
const HIP = [480, 727], SHOULDER = [484, 642];
const LEG_L0 = -32, LEG_R0 = 35;
const DX_IN = -600, DX_MACHINE = 76, STEP = 42, SWING = 25, SWING_TOOL = 88;
const BUTTON = [644, 721];                               // tap vermell de la primera bateria
const CHIMNEY = [50, 152], SMOKE_S = 2.8;
const MACHINE = [605, 653, 771, 842];
const THROAT = [694, 654], DROP = 80;                    // boca de la tolva; alçada des d'on cau cada targeta
const EXIT_X = 772, BELT_BOTTOM = 715, BELT_STOP = 1086, SPEED = 300;
const ROLLERS = [776, 719, 1114, 737], INKC = '#141312', SPOKE = 0.95, NOTCH = 2.8;   // franja on hi ha les rodetes de la cinta
const BELT_X = [786, 838, 894, 954, 1014, 1074, 1132], BELT_SLANT = 0.28;      // vores de les sis targetes de la cinta
const STACK_Y = [694, 735, 769, 811];                                           // files del munt de la dreta
const STACK_COL = [[y => 1146 - (y - 696) * 0.29, y => 1212 - (y - 696) * 0.2], [y => 1222 - (y - 696) * 0.28, y => 1286 - (y - 696) * 0.16]];
const T = {c0: 0.3, c1: 1.2, a1: 2.0, w0: 2.2, w1: 4.8, sw1: 5.15, hold: 5.32, sw2: 5.7, b1: 6.4, batGap: 0.35, batDur: 0.5, numP: 1.4, numGap: 0.15, numCycles: 2, cardGap: 0.2};
T.run0 = T.sw1 + 2 * T.batGap + T.batDur; T.num0 = T.run0 + 0.05; T.card0 = T.run0 + 0.85;

const lerp = (a, b, t) => a + (b - a) * t, clamp = t => Math.max(0, Math.min(1, t)), seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const rad = d => d * Math.PI / 180;

window.Fabrica2Animada = function(fig, src){
  const cv = fig.querySelector('canvas'), ctx = cv.getContext('2d');
  let W, H, orig, od, base, spr = {}, nums = [], cards = [], bats = [], rollers = [], red, smoke, raf = 0, playing = false, ready = false, t0 = 0, lastT = 1e9;
  const api = {play, seek, speed: 1, total: 0, onready: null, onstate: null, dbg: null, get playing(){ return playing; }, get ready(){ return ready; }};

  const img = new Image();
  img.onload = () => { prepare(); ready = true; ctx.drawImage(orig, 0, 0); if (api.onready) api.onready(); };
  img.src = src;
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w || W; c.height = h || H; return c; };

  function prepare(){
    W = cv.width = img.naturalWidth; H = cv.height = img.naturalHeight;
    orig = canvas(); orig.getContext('2d').drawImage(img, 0, 0);
    od = orig.getContext('2d').getImageData(0, 0, W, H).data;
    const d = od, N = W*H, queue = new Int32Array(N);
    const pp = (100*W + 700)*4, paper = [d[pp], d[pp+1], d[pp+2]], pMin = Math.min(paper[0], paper[1], paper[2]);
    const mn = i => Math.min(d[i*4], d[i*4+1], d[i*4+2]);
    const hard = i => pMin - mn(i) > 40, soft = i => pMin - mn(i) > 2;

    // --- components connexos del traç ---
    const lab = new Int32Array(N).fill(-1), comps = [];
    for (let s = 0; s < N; s++){
      if (!hard(s) || lab[s] >= 0) continue;
      const id = comps.length; let head = 0, tail = 0, minx = W, maxx = 0, miny = H, maxy = 0; queue[tail++] = s; lab[s] = id;
      while (head < tail){
        const i = queue[head++], x = i % W, y = (i/W)|0;
        if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){
          const nx = x+dx, ny = y+dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny*W + nx; if (hard(j) && lab[j] < 0){ lab[j] = id; queue[tail++] = j; }
        }
      }
      comps.push({id, n: tail, minx, maxx, miny, maxy, px: queue.slice(0, tail)});
    }

    const bd = new Uint8ClampedArray(d), taken = new Uint8Array(N);
    const erase = i => { bd[i*4] = paper[0]; bd[i*4+1] = paper[1]; bd[i*4+2] = paper[2]; taken[i] = 1; };
    function sprite(pixels, fill){
      let minx = W, maxx = 0, miny = H, maxy = 0;
      for (const i of (fill || pixels)){ const x = i % W, y = (i/W)|0; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
      for (const i of pixels){ const x = i % W, y = (i/W)|0; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
      const w = maxx - minx + 1, h = maxy - miny + 1, im = new ImageData(w, h), o = im.data;
      if (fill) for (const i of fill){ const q = (((i/W)|0) - miny) * w + (i % W - minx); o[q*4] = paper[0]; o[q*4+1] = paper[1]; o[q*4+2] = paper[2]; o[q*4+3] = 255; }
      for (const i of pixels){ const q = ((((i/W)|0) - miny) * w + (i % W - minx)) * 4; o[q] = d[i*4]; o[q+1] = d[i*4+1]; o[q+2] = d[i*4+2]; o[q+3] = 255; erase(i); }
      if (fill) fill.forEach(erase);
      const c = canvas(w, h); c.getContext('2d').putImageData(im, 0, 0);
      return {c, x: minx, y: miny, w, h, cx: minx + w / 2, cy: miny + h / 2, minx, miny, maxx, maxy};   // centre exacte: en repòs la peça cau en píxels sencers
    }
    function grow(pixels, r){
      const mark = new Uint8Array(N), out = []; pixels.forEach(i => { mark[i] = 1; out.push(i); });
      for (const i of pixels){
        const x = i % W, y = (i/W)|0;
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++){
          const nx = x+dx, ny = y+dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny*W + nx; if (mark[j]) continue; mark[j] = 1;
          if (soft(j) && lab[j] < 0 && !taken[j]) out.push(j);
        }
      }
      return out;
    }
    const rect = (x0, y0, x1, y1, test) => { const out = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){ const i = y*W + x; if (soft(i) && (!test || test(x, y, i))) out.push(i); } return out; };
    // peça definida per una regió: traç de dins + interior en blanc (perquè tapi el que té a sota)
    function region(x0, y0, x1, y1, test){
      const fill = [], all = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){ if (!test(x, y)) continue; const i = y*W + x; fill.push(i); if (soft(i)) all.push(i); }
      return sprite(all, fill);
    }
    // targeta a partir del seu contorn: traç + interior en blanc
    function cardSprite(pixels){
      const rows = {}; pixels.forEach(i => { const x = i % W, y = (i/W)|0; const r = rows[y] || (rows[y] = [x, x]); if (x < r[0]) r[0] = x; if (x > r[1]) r[1] = x; });
      const fill = [], all = []; for (const y in rows) for (let x = rows[y][0]; x <= rows[y][1]; x++){ const i = y*W + x; fill.push(i); if (soft(i)) all.push(i); }
      return sprite(grow(all, 3), fill);
    }

    // --- 1) cercle vermell i fletxa (formen un sol traç): el cercle es dibuixa girant i la fletxa creix des del cercle ---
    const isRed = i => { const r = d[i*4], g = d[i*4+1], b = d[i*4+2]; return (r > 150 && g < 90 && b < 90) || (r - g > 18 && r - b > 18 && Math.abs(g - b) < 25); };
    const redPx = grow(rect(124, 214, 560, 442, (x, y, i) => isRed(i)), 3);
    let cx = 0, cy = 0, cn = 0; redPx.forEach(i => { const x = i % W, y = (i/W)|0; if (x <= 262 && y <= 330){ cx += x; cy += y; cn++; } }); cx /= cn; cy /= cn;
    let R = 0; redPx.forEach(i => { const x = i % W, y = (i/W)|0; if (x <= 262 && y <= 330) R += Math.hypot(x - cx, y - cy); }); R /= cn;
    const circle = [], arrow = []; redPx.forEach(i => (Math.hypot(i % W - cx, ((i/W)|0) - cy) <= R + 10 ? circle : arrow).push(i));
    const list = [];
    circle.forEach(i => { let a = Math.atan2(cx - i % W, cy - ((i/W)|0)); if (a < 0) a += 2*Math.PI; list.push([i, lerp(T.c0, T.c1, a / (2*Math.PI))]); });   // des de dalt, en sentit contrari a les agulles
    if (arrow.length){
      const start = arrow.reduce((a, i) => Math.hypot(i % W - cx, ((i/W)|0) - cy) < Math.hypot(a % W - cx, ((a/W)|0) - cy) ? i : a), inA = new Uint8Array(N), dist = new Int32Array(N).fill(-1);
      arrow.forEach(i => inA[i] = 1); let head = 0, tail = 0, maxD = 1; queue[tail++] = start; dist[start] = 0;
      while (head < tail){
        const i = queue[head++], x = i % W, y = (i/W)|0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++){
          const nx = x+dx, ny = y+dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny*W + nx; if (inA[j] && dist[j] < 0){ dist[j] = dist[i] + 1; if (dist[j] > maxD) maxD = dist[j]; queue[tail++] = j; }
        }
      }
      arrow.forEach(i => list.push([i, lerp(T.c1 + 0.05, T.a1, (dist[i] < 0 ? maxD : dist[i]) / maxD)]));
    }
    list.sort((a, b) => a[1] - b[1]);
    red = {px: Int32Array.from(list, a => a[0]), tm: Float32Array.from(list, a => a[1]), layer: canvas(), data: new ImageData(W, H), ptr: 0};
    red.ctx = red.layer.getContext('2d');
    { const isR = new Uint8Array(N), root = new Int32Array(N).fill(-1), dd = new Uint8Array(N); redPx.forEach(i => isR[i] = 1);   // sota el vermell: es reconstrueix una mica el traç tapat
      let head = 0, tail = 0;
      for (let i = 0; i < N; i++) if (!isR[i] && pMin - mn(i) > 55){ const x = i % W, y = (i/W)|0; if ((x > 0 && isR[i-1]) || (x < W-1 && isR[i+1]) || (y > 0 && isR[i-W]) || (y < H-1 && isR[i+W])){ root[i] = i; queue[tail++] = i; } }
      redPx.forEach(erase);
      while (head < tail){
        const i = queue[head++]; if (dd[i] >= 2) continue; const x = i % W, y = (i/W)|0;
        for (const j of [x > 0 ? i-1 : -1, x < W-1 ? i+1 : -1, y > 0 ? i-W : -1, y < H-1 ? i+W : -1]){
          if (j < 0 || !isR[j] || root[j] >= 0) continue; root[j] = root[i]; dd[j] = dd[i] + 1; const r = root[i]*4; bd[j*4] = d[r]; bd[j*4+1] = d[r+1]; bd[j*4+2] = d[r+2]; queue[tail++] = j;
        }
      }
    }

    // --- fum de la xemeneia ---
    { const px = rect(30, 14, 262, 150, (x, y, i) => Math.max(d[i*4], d[i*4+1], d[i*4+2]) - mn(i) < 30 && mn(i) > 105 && !taken[i]);
      let maxD = 1; const dist = i => Math.hypot(i % W - CHIMNEY[0], ((i/W)|0) - CHIMNEY[1]);
      px.forEach(i => { const q = dist(i); if (q > maxD) maxD = q; });
      const l = px.map(i => [i, T.run0 + SMOKE_S * dist(i) / maxD]).sort((a, b) => a[1] - b[1]);
      px.forEach(erase);
      smoke = {px: Int32Array.from(l, a => a[0]), tm: Float32Array.from(l, a => a[1]), layer: canvas(), data: new ImageData(W, H), ptr: 0};
      smoke.ctx = smoke.layer.getContext('2d');
    }

    // --- 2) persona ---
    const P = [440, 522, 596, 803];
    spr.head = sprite(rect(P[0], P[1], P[2], P[3], (x, y) => y < 573 && x < 511));
    spr.tool = sprite(rect(P[0], P[1], P[2], P[3], (x, y) => x >= 486 && y < 700 && !(y < 573 && x < 511)));     // braços i paleta
    spr.torso = sprite(rect(P[0], P[1], P[2], P[3], (x, y) => x < 486 && y >= 573 && y < 734));
    spr.legL = sprite(rect(P[0], P[1], P[2], P[3], (x, y) => y >= 734 && x < 480));
    spr.legR = sprite(rect(P[0], P[1], P[2], P[3], (x, y) => y >= 734 && x >= 480));

    // --- 3) inputs: les targetes de paràmetres de sobre la tolva ---
    const inC = comps.filter(c => c.n > 440 && c.n < 760 && c.minx >= 555 && c.maxx <= 860 && c.miny >= 325 && c.maxy <= 655 && c.maxx - c.minx > 60 && c.maxx - c.minx < 100);
    nums = inC.map(c => cardSprite(c.px)).sort((a, b) => b.cy - a.cy);          // de baix a dalt

    // --- 4) outputs: sis targetes a la cinta (enganxades) i sis al munt de la dreta ---
    const belt = [];
    for (let k = 0; k < 6; k++) belt.push(region(BELT_X[k] - 24, 654, BELT_X[k+1] + 6, BELT_BOTTOM, (x, y) => x >= 773 && x >= BELT_X[k] - 3 - (y - 656) * BELT_SLANT && x <= BELT_X[k+1] + 3 - (y - 656) * BELT_SLANT));   // de dalt fins a la línia de la cinta
    const stack = [];
    for (let r = 2; r >= 0; r--) for (let c = 0; c < 2; c++){                    // de la fila de baix a la de dalt
      const xl = STACK_COL[c][0], xr = STACK_COL[c][1];
      stack.push(region(1100, STACK_Y[r] - 2, 1295, STACK_Y[r+1] + 2, (x, y) => x >= xl(y) - 3 && x <= xr(y) + 3));
    }
    cards = stack.concat(belt.reverse());
    cards.forEach((c, k) => { c.bin = k < stack.length; c.start = T.card0 + k * T.cardGap; });


    // --- rodetes de la cinta: els forats tancats que hi ha dins la franja de la cinta ---
    { const [x0, y0, x1, y1] = ROLLERS, seen = new Uint8Array(N), wall = i => pMin - mn(i) > 12; rollers = [];   // paret: qualsevol gris, perquè els contorns mig oberts quedin tancats
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){
        const s = y*W + x; if (seen[s] || wall(s)) continue;
        let head = 0, tail = 0, open = false, sx = 0, sy = 0, a = x, b = x, c0 = y, c1 = y; queue[tail++] = s; seen[s] = 1;
        while (head < tail){
          const i = queue[head++], ix = i % W, iy = (i/W)|0; sx += ix; sy += iy; if (ix < a) a = ix; if (ix > b) b = ix; if (iy < c0) c0 = iy; if (iy > c1) c1 = iy;
          if (ix <= x0 || ix >= x1 || iy <= y0 || iy >= y1){ open = true; continue; }
          for (const j of [i-1, i+1, i-W, i+W]) if (!seen[j] && !wall(j)){ seen[j] = 1; queue[tail++] = j; }
        }
        if (!open && tail >= 8 && tail <= 600 && (b - a + 1) / 2 >= 3 && (b - a + 1) / 2 <= 7 && Math.abs((b - a) - (c1 - c0)) <= 3) rollers.push({x: sx / tail, y: sy / tail, r: (b - a + 1) / 2, ry: (c1 - c0 + 1) / 2});   // només les rodetes, no els espais entre elles
      }
    }

    // --- 5) bateries (el verd) i màquina ---
    const isGreen = i => d[i*4+1] - d[i*4] > 45 && d[i*4+1] - d[i*4+2] > 25;
    const gC = {}; rect(626, 732, 736, 764, (x, y, i) => isGreen(i)).forEach(i => { const k = Math.floor((i % W - 626) / 36); (gC[k] = gC[k] || []).push(i); });
    bats = Object.keys(gC).sort((a, b) => a - b).map(k => sprite(gC[k]));
    spr.machine = sprite(rect(MACHINE[0], MACHINE[1], MACHINE[2], MACHINE[3], (x, y, i) => !taken[i]));

    base = canvas(); base.getContext('2d').putImageData(new ImageData(bd, W, H), 0, 0);
    const cardEnd = Math.max(...cards.map(c => c.start + cardDur(c)));
    const numEnd = T.num0 + (nums.length - 1) * T.numGap + (T.numCycles + 0.45) * T.numP;
    T.run1 = Math.max(cardEnd, numEnd, T.run0 + SMOKE_S) + 0.15; T.end = T.run1 + 0.3; api.total = T.end;
    api.dbg = {rollers: rollers.map(r => [Math.round(r.x), Math.round(r.y), r.r, r.ry]), circle: circle.length, arrow: arrow.length, centre: [Math.round(cx), Math.round(cy), Math.round(R)], nums: nums.map(n => [n.x, n.y, n.w, n.h]), cards: cards.map(c => [c.x, c.y, c.w, c.h, c.bin]), bats: bats.map(b => [b.x, b.y, b.w, b.h]), total: T.end};
  }

  // targetes de sortida: surten per la dreta de la màquina i van per la cinta; les del munt hi cauen al final
  function cardDur(c){ const stop = c.bin ? BELT_STOP : c.x; return (stop - (EXIT_X - c.w)) / SPEED + (c.bin ? 0.45 : 0); }
  function cardPos(c, t){
    const u = t - c.start; if (u < 0) return null;
    const y0 = c.bin ? BELT_BOTTOM - c.h : c.y, x0 = EXIT_X - c.w, stop = c.bin ? BELT_STOP : c.x, ride = (stop - x0) / SPEED;
    if (u <= ride) return [lerp(x0, stop, u / ride), y0];
    if (!c.bin) return [c.x, c.y];
    const e = clamp((u - ride) / 0.45); return [lerp(stop, c.x, ease(e)), lerp(y0, c.y, e * e) - 14 * Math.sin(Math.PI * e)];   // un saltet abans de caure al munt
  }
  // targetes d'entrada: cauen des de dalt fins al seu lloc i d'allà a la boca de la tolva, giravoltant; l'última vegada s'hi queden
  function numState(n, k, t){
    const u = (t - T.num0 - k * T.numGap) / T.numP; if (u < 0) return null;
    const cyc = Math.floor(u), f = u - cyc, last = cyc >= T.numCycles, dir = k % 2 ? 1 : -1;
    if (last && (cyc > T.numCycles || f >= 0.45)) return [n.cx, n.cy, 1, 1, 0];
    if (f < 0.45){ const e = ease(f / 0.45); return [n.cx, lerp(n.cy - DROP, n.cy, e), 1, Math.min(1, e * 2.5), rad(dir * 16 * (1 - e))]; }
    if (f < 0.55) return [n.cx, n.cy, 1, 1, 0];
    const e = (f - 0.55) / 0.45;
    return [lerp(n.cx, THROAT[0], e * e), lerp(n.cy, THROAT[1] - 8, e), lerp(1, 0.3, e), 1 - seg(e, 0.72, 1), rad(dir * 55 * e)];
  }
  function draw(s, dx, dy, pivot, rot){
    ctx.save(); ctx.translate(dx || 0, dy || 0);
    if (rot){ ctx.translate(pivot[0], pivot[1]); ctx.rotate(rot); ctx.translate(-pivot[0], -pivot[1]); }
    ctx.drawImage(s.c, s.x, s.y); ctx.restore();
  }
  function reveal(L, t){            // capa que es va destapant píxel a píxel
    if (t < lastT){ L.data.data.fill(0); L.ptr = 0; }
    const o = L.data.data; let ch = L.ptr === 0;
    while (L.ptr < L.px.length && L.tm[L.ptr] <= t){ const q = L.px[L.ptr]*4; o[q] = od[q]; o[q+1] = od[q+1]; o[q+2] = od[q+2]; o[q+3] = 255; L.ptr++; ch = true; }
    if (ch) L.ctx.putImageData(L.data, 0, 0);
  }

  function render(t){
    if (t >= T.end){ ctx.drawImage(orig, 0, 0); lastT = t; return; }
    ctx.drawImage(base, 0, 0);
    const running = t >= T.run0 && t < T.run1;

    // fum
    reveal(smoke, t);
    if (t >= T.run0){
      const k = (1 - seg(t, T.run1 - 0.6, T.run1)) * seg(t, T.run0, T.run0 + 0.4), sx = 1 + 0.03 * k * Math.sin(t * 2.6), sy = 1 + 0.035 * k * Math.sin(t * 3.4 + 1);
      ctx.save(); ctx.translate(CHIMNEY[0], CHIMNEY[1]); ctx.scale(sx, sy); ctx.translate(-CHIMNEY[0], -CHIMNEY[1]); ctx.drawImage(smoke.layer, 0, 0); ctx.restore();
    }


    // rodetes de la cinta: giren mentre la màquina treballa
    if (running){
      const k = seg(t, T.run0, T.run0 + 0.3) * (1 - seg(t, T.run1 - 0.3, T.run1)), ang = t * 7;
      ctx.save(); ctx.globalAlpha = k; ctx.lineCap = 'round';
      rollers.forEach((r, q) => {
        const a = ang + q * 0.7, c = Math.cos(a), s = Math.sin(a);
        ctx.strokeStyle = INKC; ctx.lineWidth = 1.9; ctx.beginPath(); ctx.moveTo(r.x - r.r * c * SPOKE, r.y - r.ry * s * SPOKE); ctx.lineTo(r.x + r.r * c * SPOKE, r.y + r.ry * s * SPOKE); ctx.stroke();
        if (NOTCH){ ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r.x + (r.r + NOTCH) * c, r.y + (r.ry + NOTCH) * s, 1.7, 0, 2 * Math.PI); ctx.fill(); }
      });
      ctx.restore();
    }

    // outputs (només es veuen a la dreta de la sortida de la màquina)
    ctx.save(); ctx.beginPath(); ctx.rect(EXIT_X, 600, W - EXIT_X, H - 600); ctx.clip();
    cards.forEach(c => { const p = cardPos(c, t); if (p) ctx.drawImage(c.c, p[0], p[1]); });
    ctx.restore();

    // màquina (vibra mentre treballa) i bateries (el verd puja en prémer el botó)
    const jx = running ? Math.round(Math.sin(t * 61) * 1.2) : 0, jy = running ? Math.round(Math.cos(t * 47) * 1.2) : 0;
    ctx.drawImage(spr.machine.c, spr.machine.x + jx, spr.machine.y + jy);
    bats.forEach((b, k) => {
      const e = ease(seg(t, T.sw1 + k * T.batGap, T.sw1 + k * T.batGap + T.batDur)); if (e <= 0) return;
      const hh = Math.max(1, Math.round(b.h * e));
      ctx.drawImage(b.c, 0, b.h - hh, b.w, hh, b.x + jx, b.y + b.h - hh + jy, b.w, hh);
    });

    // inputs
    nums.forEach((n, k) => {
      const s = numState(n, k, t); if (!s) return;
      ctx.save(); ctx.globalAlpha = s[3]; ctx.translate(s[0], s[1]); ctx.rotate(s[4]); ctx.scale(s[2], s[2]); ctx.drawImage(n.c, -n.w / 2, -n.h / 2); ctx.restore();
    });

    // persona
    if (t >= T.w0){
      let dx, wf;
      if (t < T.w1){ dx = lerp(DX_IN, DX_MACHINE, seg(t, T.w0, T.w1)); wf = seg(t, T.w0, T.w0 + 0.15) * (1 - seg(t, T.w1 - 0.22, T.w1)); }
      else if (t < T.sw2){ dx = DX_MACHINE; wf = 0; }
      else { dx = lerp(DX_MACHINE, 0, seg(t, T.sw2, T.b1)); wf = seg(t, T.sw2, T.sw2 + 0.12) * (1 - seg(t, T.b1 - 0.2, T.b1)); }
      const ph = (dx - DX_IN) / STEP * Math.PI, sw = Math.sin(ph), bob = -2.5 * Math.abs(Math.cos(ph)) * wf;
      draw(spr.legL, dx, bob, HIP, rad(wf * (LEG_L0 - SWING * sw)));
      draw(spr.legR, dx, bob, HIP, rad(wf * (LEG_R0 + SWING * sw)));
      draw(spr.torso, dx, bob); draw(spr.head, dx, bob);
      const press = ease(seg(t, T.w1, T.sw1)) * (1 - ease(seg(t, T.hold, T.sw2)));
      draw(spr.tool, dx, bob, SHOULDER, rad(SWING_TOOL * press + 3 * sw * wf));
    }
    if (t >= T.sw1 && t < T.sw1 + 0.6){                    // el botó s'il·lumina en prémer-lo
      const e = (t - T.sw1) / 0.6;
      ctx.save(); ctx.strokeStyle = '#e02020'; ctx.globalAlpha = 1 - e; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(BUTTON[0], BUTTON[1], 6 + 22 * e, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
    }

    // cercle vermell i fletxa
    reveal(red, t); ctx.drawImage(red.layer, 0, 0);
    lastT = t;
  }

  function state(s){ if (api.onstate) api.onstate(s); }
  function play(){
    if (!ready) return;
    cancelAnimationFrame(raf);
    if (!api.force && matchMedia('(prefers-reduced-motion:reduce)').matches){ render(T.end); state('done'); return; }
    playing = true; t0 = performance.now(); lastT = 1e9; state('playing');
    const speed = api.speed || 1;
    const frame = now => {
      const t = (now - t0) / 1000 * speed; render(t);
      if (t >= T.end){ playing = false; state('done'); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }
  function seek(t){ if (!ready) return; cancelAnimationFrame(raf); playing = false; lastT = 1e9; render(t); }
  return api;
};
})();

/* Escena de la primera fàbrica (obtenció dels paràmetres).
   1) Es dibuixa el cercle vermell sobre la finestra groga de la fàbrica i la fletxa que en surt.
   2) La persona entra caminant per l'esquerra, arriba a la màquina i prem el primer botó amb la paleta que porta.
   3) La màquina es posa en marxa: els «inputs» (percentatges) cauen per la tolva i els «outputs» (targetes)
      surten per la cinta transportadora fins al seu lloc.
   Tot el que es mou són trossos del dibuix original; l'últim fotograma és el dibuix original.

   Fabrica1Animada(figura, src) -> {play(), seek(t), ready, playing, speed, total}
   Coordenades en píxels de la imatge original (1378 x 775). */
(function(){
const HIP = [469, 640], SHOULDER = [473, 563];           // maluc i espatlla de la persona al dibuix
const LEG_L0 = -27, LEG_R0 = 23;                         // angle (graus) de cada cama al dibuix
const DX_IN = -590, DX_MACHINE = 52, STEP = 40, SWING = 25, SWING_TOOL = 84;
const CHIMNEY = [42, 176], SMOKE_S = 2.8;                 // boca de la xemeneia i segons que triga a sortir tot el fum
const ROLLERS = [776, 636, 1130, 670], INKC = '#141312', SPOKE = 0.95, NOTCH = 0;   // franja on hi ha les rodetes de la cinta
const BUTTON = [620, 637];                               // primer botó vermell de la màquina
const MACHINE = [577, 566, 777, 752];                    // caixa de la màquina (vibra mentre treballa)
const THROAT = [665, 574], ENTRY_Y = 338;                // boca de la tolva i alçada on apareixen els inputs
const BELT_Y = 635, EXIT_X = 770, BELT_END = 1108, SPEED = 300;   // cinta: alçada de la base de les targetes, sortida, final
const T = {c0: 0.3, c1: 1.2, a1: 1.9, w0: 2.1, w1: 4.7, sw1: 5.05, hold: 5.22, sw2: 5.6, b1: 6.2, num0: 5.25, numP: 1.5, numGap: 0.13, numCycles: 2, card0: 6.0, cardGap: 0.36};

const lerp = (a, b, t) => a + (b - a) * t, clamp = t => Math.max(0, Math.min(1, t)), seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const rad = d => d * Math.PI / 180;

window.Fabrica1Animada = function(fig, src){
  const cv = fig.querySelector('canvas'), ctx = cv.getContext('2d');
  let W, H, orig, od, base, spr = {}, nums = [], cards = [], rollers = [], red, smoke, raf = 0, playing = false, ready = false, t0 = 0, lastT = 1e9;
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
      const id = comps.length; let head = 0, tail = 0, minx = W, maxx = 0, miny = H, maxy = 0, rs = 0; queue[tail++] = s; lab[s] = id;
      while (head < tail){
        const i = queue[head++], x = i % W, y = (i/W)|0;
        if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
        rs += d[i*4] - Math.max(d[i*4+1], d[i*4+2]);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){
          const nx = x+dx, ny = y+dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny*W + nx; if (hard(j) && lab[j] < 0){ lab[j] = id; queue[tail++] = j; }
        }
      }
      comps.push({id, n: tail, minx, maxx, miny, maxy, red: rs / tail, px: queue.slice(0, tail)});
    }

    const bd = new Uint8ClampedArray(d);                       // base: el dibuix sense les peces que es mouen
    const taken = new Uint8Array(N);                           // píxels que ja formen part d'alguna peça
    const erase = i => { bd[i*4] = paper[0]; bd[i*4+1] = paper[1]; bd[i*4+2] = paper[2]; taken[i] = 1; };
    // peça retallada a partir d'una llista de píxels (canvas petit + posició)
    function sprite(pixels, fill){
      let minx = W, maxx = 0, miny = H, maxy = 0;
      for (const i of pixels){ const x = i % W, y = (i/W)|0; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
      const w = maxx - minx + 1, h = maxy - miny + 1, im = new ImageData(w, h), o = im.data;
      if (fill) for (const i of fill){ const q = (((i/W)|0) - miny) * w + (i % W - minx); if (q >= 0 && q < w*h){ o[q*4] = paper[0]; o[q*4+1] = paper[1]; o[q*4+2] = paper[2]; o[q*4+3] = 255; } }
      for (const i of pixels){ const q = ((((i/W)|0) - miny) * w + (i % W - minx)) * 4; o[q] = d[i*4]; o[q+1] = d[i*4+1]; o[q+2] = d[i*4+2]; o[q+3] = 255; erase(i); }
      if (fill) fill.forEach(erase);
      const c = canvas(w, h); c.getContext('2d').putImageData(im, 0, 0);
      return {c, x: minx, y: miny, w, h, cx: (minx + maxx) / 2, cy: (miny + maxy) / 2, maxx, maxy, minx, miny};
    }
    // afegeix a una llista de píxels la vora suau que els envolta (píxels clars sense component propi, fins a r píxels)
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
    const withHalo = ids => { const px = []; ids.forEach(id => comps[id].px.forEach(i => px.push(i))); return grow(px, 4); };
    const rect = (x0, y0, x1, y1, test) => { const out = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){ const i = y*W + x; if (soft(i) && (!test || test(x, y, i))) out.push(i); } return out; };

    // --- 1) cercle vermell i fletxa ---
    const isRed = i => { const r = d[i*4], g = d[i*4+1], b = d[i*4+2]; return (r > 150 && g < 90 && b < 90) || (r - g > 18 && r - b > 18 && Math.abs(g - b) < 25); };   // vermell o rosat (vora del vermell)
    const circle = grow(rect(200, 268, 332, 396, (x, y, i) => isRed(i)), 3);
    let cxm = 0, cym = 0; circle.forEach(i => { cxm += i % W; cym += (i/W)|0; }); cxm /= circle.length; cym /= circle.length;
    const arrowC = comps.filter(c => c.red > 120 && c.n > 800 && c.miny > 370 && c.minx > 250 && c.minx < 330)[0];
    const arrow = arrowC ? withHalo([arrowC.id]) : [];
    const list = [];
    circle.forEach(i => { let a = Math.atan2(i % W - cxm, cym - ((i/W)|0)); if (a < 0) a += 2*Math.PI; list.push([i, lerp(T.c0, T.c1, a / (2*Math.PI))]); });   // des de dalt, en el sentit de les agulles
    if (arrow.length){                                                                                    // la fletxa creix des del cercle
      const start = arrow.reduce((a, i) => ((i/W)|0) < ((a/W)|0) ? i : a), inA = new Uint8Array(N), dist = new Int32Array(N).fill(-1);
      arrow.forEach(i => inA[i] = 1); let head = 0, tail = 0, maxD = 1; queue[tail++] = start; dist[start] = 0;
      while (head < tail){
        const i = queue[head++], x = i % W, y = (i/W)|0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){
          const nx = x+dx, ny = y+dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny*W + nx; if (inA[j] && dist[j] < 0){ dist[j] = dist[i] + 1; if (dist[j] > maxD) maxD = dist[j]; queue[tail++] = j; }
        }
      }
      arrow.forEach(i => list.push([i, lerp(T.c1 + 0.1, T.a1, Math.max(0, dist[i]) / maxD)]));
    }
    list.sort((a, b) => a[1] - b[1]);
    red = {px: Int32Array.from(list, a => a[0]), tm: Float32Array.from(list, a => a[1]), layer: canvas(), data: new ImageData(W, H), ptr: 0};
    red.ctx = red.layer.getContext('2d');
    // sota el cercle es reconstrueix el traç de la fàbrica que tapa (uns quants píxels des de cada costat)
    { const isR = new Uint8Array(N), root = new Int32Array(N).fill(-1), dd = new Uint8Array(N); circle.forEach(i => isR[i] = 1); arrow.forEach(i => isR[i] = 1);
      let head = 0, tail = 0;
      for (let i = 0; i < N; i++) if (!isR[i] && pMin - mn(i) > 55){ const x = i % W, y = (i/W)|0; if ((x > 0 && isR[i-1]) || (x < W-1 && isR[i+1]) || (y > 0 && isR[i-W]) || (y < H-1 && isR[i+W])){ root[i] = i; queue[tail++] = i; } }
      circle.forEach(erase); arrow.forEach(erase);
      while (head < tail){
        const i = queue[head++]; if (dd[i] >= 2) continue; const x = i % W, y = (i/W)|0;
        for (const j of [x > 0 ? i-1 : -1, x < W-1 ? i+1 : -1, y > 0 ? i-W : -1, y < H-1 ? i+W : -1]){
          if (j < 0 || !isR[j] || root[j] >= 0) continue; root[j] = root[i]; dd[j] = dd[i] + 1; const r = root[i]*4; bd[j*4] = d[r]; bd[j*4+1] = d[r+1]; bd[j*4+2] = d[r+2]; queue[tail++] = j;
        }
      }
    }

    // --- fum de la xemeneia: no hi és al principi i surt quan la màquina arrenca, creixent des de la boca ---
    { const px = rect(18, 20, 244, 174, (x, y, i) => Math.max(d[i*4], d[i*4+1], d[i*4+2]) - mn(i) < 30 && mn(i) > 105 && !taken[i]);
      let maxD = 1; const dist = i => Math.hypot(i % W - CHIMNEY[0], ((i/W)|0) - CHIMNEY[1]);
      px.forEach(i => { const q = dist(i); if (q > maxD) maxD = q; });
      const l = px.map(i => [i, T.sw1 + SMOKE_S * dist(i) / maxD]).sort((a, b) => a[1] - b[1]);
      px.forEach(erase);
      smoke = {px: Int32Array.from(l, a => a[0]), tm: Float32Array.from(l, a => a[1]), layer: canvas(), data: new ImageData(W, H), ptr: 0};
      smoke.ctx = smoke.layer.getContext('2d');
    }

    // --- 2) persona ---
    const P = [426, 438, 568, 724];
    spr.head = sprite(rect(P[0], P[1], P[2], P[3], (x, y) => y < 491 && x < 497));
    spr.tool = sprite(rect(P[0], P[1], P[2], P[3], (x, y) => x >= 479 && y < 636 && !(y < 491 && x < 497)));   // braços i paleta
    spr.torso = sprite(rect(P[0], P[1], P[2], P[3], (x, y) => x < 479 && y >= 491 && y < 644));
    spr.legL = sprite(rect(P[0], P[1], P[2], P[3], (x, y) => y >= 644 && x < 466));
    spr.legR = sprite(rect(P[0], P[1], P[2], P[3], (x, y) => y >= 644 && x >= 466));

    // --- 3) inputs: els percentatges de sobre la tolva, agrupats per proximitat ---
    const small = comps.filter(c => c.n < 400 && (c.minx + c.maxx) / 2 > 548 && (c.minx + c.maxx) / 2 < 746 && (c.miny + c.maxy) / 2 > 336 && (c.miny + c.maxy) / 2 < 566 && c.maxy < 566);
    const parent = small.map((_, k) => k), find = k => parent[k] === k ? k : (parent[k] = find(parent[k]));
    for (let a = 0; a < small.length; a++) for (let b = a + 1; b < small.length; b++){
      const A = small[a], B = small[b];
      if (A.minx - 13 <= B.maxx && B.minx - 13 <= A.maxx && A.miny + 4 <= B.maxy && B.miny + 4 <= A.maxy) parent[find(a)] = find(b);
    }
    const groups = {}; small.forEach((c, k) => (groups[find(k)] = groups[find(k)] || []).push(c.id));
    nums = Object.values(groups).map(ids => sprite(withHalo(ids))).filter(s => s.w > 14).sort((a, b) => b.cy - a.cy);   // de baix a dalt

    // --- 4) outputs: les targetes ---
    const cardC = comps.filter(c => c.n > 520 && c.n < 820 && c.minx >= 830 && c.miny >= 550 && c.miny <= 660 && c.maxx - c.minx > 75 && c.maxx - c.minx < 100);
    function cardSprite(pixels){            // traç de la targeta + interior en blanc (perquè tapi el que té a sota)
      const rows = {}; pixels.forEach(i => { const x = i % W, y = (i/W)|0; const r = rows[y] || (rows[y] = [x, x]); if (x < r[0]) r[0] = x; if (x > r[1]) r[1] = x; });
      const fill = [], all = []; for (const y in rows) for (let x = rows[y][0]; x <= rows[y][1]; x++){ const i = y*W + x; fill.push(i); if (soft(i)) all.push(i); }
      return sprite(grow(all, 3), fill);
    }
    cards = cardC.map(c => cardSprite(c.px));
    const wallR = y => 744 + (y - 564) * 0.36;                                                             // vora dreta de la paret de la màquina
    const c1 = rect(762, 552, 855, 636, (x, y, i) => hard(i) && x >= wallR(y) + 3 && x <= 855 - (y - 552) * 0.25);   // primera targeta (toca la màquina)
    cards.push(cardSprite(c1));
    // ordre de sortida: primer les del calaix (les de baix primer), després les de la cinta de dreta a esquerra
    const bin = cards.filter(c => c.minx > 1135).sort((a, b) => (b.miny - a.miny) || (a.minx - b.minx)), belt = cards.filter(c => c.minx <= 1135).sort((a, b) => b.minx - a.minx);
    cards = bin.concat(belt); cards.forEach((c, k) => { c.bin = k < bin.length; c.start = T.card0 + k * T.cardGap; });


    // --- rodetes de la cinta: els forats tancats que hi ha dins la franja de la cinta ---
    { const [x0, y0, x1, y1] = ROLLERS, seen = new Uint8Array(N), wall = hard; rollers = [];   // paret: qualsevol gris, perquè els contorns mig oberts quedin tancats
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){
        const s = y*W + x; if (seen[s] || wall(s)) continue;
        let head = 0, tail = 0, open = false, sx = 0, sy = 0, a = x, b = x, c0 = y, c1 = y; queue[tail++] = s; seen[s] = 1;
        while (head < tail){
          const i = queue[head++], ix = i % W, iy = (i/W)|0; sx += ix; sy += iy; if (ix < a) a = ix; if (ix > b) b = ix; if (iy < c0) c0 = iy; if (iy > c1) c1 = iy;
          if (ix <= x0 || ix >= x1 || iy <= y0 || iy >= y1){ open = true; continue; }
          for (const j of [i-1, i+1, i-W, i+W]) if (!seen[j] && !wall(j)){ seen[j] = 1; queue[tail++] = j; }
        }
        if (!open && tail >= 8 && tail <= 600 && (b - a + 1) / 2 >= 2.5 && (b - a + 1) / 2 <= 9) rollers.push({x: sx / tail, y: sy / tail, r: (b - a + 1) / 2, ry: (c1 - c0 + 1) / 2});   // només les rodetes, no els espais entre elles
      }
    }

    // --- 5) la màquina (vibra) ---
    spr.machine = sprite(rect(MACHINE[0], MACHINE[1], MACHINE[2], MACHINE[3], (x, y, i) => !taken[i]));

    base = canvas(); base.getContext('2d').putImageData(new ImageData(bd, W, H), 0, 0);
    // durada total
    const cardEnd = Math.max(...cards.map(c => c.start + cardDur(c)));
    const numEnd = T.num0 + (nums.length - 1) * T.numGap + (T.numCycles + 0.45) * T.numP;
    T.run1 = Math.max(cardEnd, numEnd) + 0.15; T.end = T.run1 + 0.3; api.total = T.end;
    api.dbg = {rollers: rollers.map(r => [Math.round(r.x), Math.round(r.y), r.r, r.ry]), circle: circle.length, arrow: arrow.length, nums: nums.map(n => [n.x, n.y, n.w, n.h]), cards: cards.map(c => [c.x, c.y, c.w, c.h, c.bin]), total: T.end};
  }

  // recorregut d'una targeta: surt per la dreta de la màquina, va per la cinta i, si és del calaix, hi cau al final
  function cardDur(c){ const stop = c.bin ? BELT_END : c.x; return (stop - (EXIT_X - c.w)) / SPEED + (c.bin ? 0.4 : 0); }
  function cardPos(c, t){
    const u = t - c.start; if (u < 0) return null;
    const y0 = BELT_Y - c.h, x0 = EXIT_X - c.w, stop = c.bin ? BELT_END : c.x, ride = (stop - x0) / SPEED;
    if (u <= ride){ const e = u / ride; return [lerp(x0, stop, e), lerp(y0, c.bin ? y0 : c.y, e)]; }
    if (!c.bin) return [c.x, c.y];
    const e = ease((u - ride) / 0.4); return [lerp(stop, c.x, e), lerp(y0, c.y, e * e)];
  }
  // recorregut d'un input: apareix a dalt, baixa fins al seu lloc, i continua cap a la boca de la tolva; l'última vegada s'hi queda
  function numState(n, k, t){
    const u = (t - T.num0 - k * T.numGap) / T.numP; if (u < 0) return null;
    const cyc = Math.floor(u), f = u - cyc, last = cyc >= T.numCycles;
    if (last && (cyc > T.numCycles || f >= 0.45)) return [n.x, n.y, 1, 1];
    if (f < 0.45){ const e = ease(f / 0.45); return [n.x, lerp(ENTRY_Y - n.h, n.y, e), 1, Math.min(1, e * 2.5)]; }
    if (f < 0.55) return [n.x, n.y, 1, 1];
    const e = (f - 0.55) / 0.45, s = lerp(1, 0.35, e);
    return [lerp(n.x, THROAT[0] - n.w * s / 2, e * e), lerp(n.y, THROAT[1] - n.h * s, e), s, 1 - seg(e, 0.7, 1)];
  }
  function draw(s, dx, dy, pivot, rot, alpha){
    ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
    ctx.translate(dx || 0, dy || 0);
    if (rot){ ctx.translate(pivot[0], pivot[1]); ctx.rotate(rot); ctx.translate(-pivot[0], -pivot[1]); }
    ctx.drawImage(s.c, s.x, s.y); ctx.restore();
  }

  function render(t){
    if (t >= T.end){ ctx.drawImage(orig, 0, 0); lastT = t; return; }
    ctx.drawImage(base, 0, 0);
    const running = t >= T.sw1 && t < T.run1;

    // fum: va sortint i es gronxa una mica mentre la màquina treballa
    if (t < lastT){ smoke.data.data.fill(0); smoke.ptr = 0; }
    if (t >= T.sw1){
      const o = smoke.data.data; let ch = false;
      while (smoke.ptr < smoke.px.length && smoke.tm[smoke.ptr] <= t){ const q = smoke.px[smoke.ptr]*4; o[q] = od[q]; o[q+1] = od[q+1]; o[q+2] = od[q+2]; o[q+3] = 255; smoke.ptr++; ch = true; }
      if (ch) smoke.ctx.putImageData(smoke.data, 0, 0);
      const k = (1 - seg(t, T.run1 - 0.6, T.run1)) * seg(t, T.sw1, T.sw1 + 0.4), sx = 1 + 0.03 * k * Math.sin(t * 2.6), sy = 1 + 0.035 * k * Math.sin(t * 3.4 + 1);
      ctx.save(); ctx.translate(CHIMNEY[0], CHIMNEY[1]); ctx.scale(sx, sy); ctx.translate(-CHIMNEY[0], -CHIMNEY[1]); ctx.drawImage(smoke.layer, 0, 0); ctx.restore();
    }


    // rodetes de la cinta: giren mentre la màquina treballa
    if (running){
      const k = seg(t, T.sw1, T.sw1 + 0.3) * (1 - seg(t, T.run1 - 0.3, T.run1)), ang = t * 7;
      ctx.save(); ctx.globalAlpha = k; ctx.lineCap = 'round';
      rollers.forEach((r, q) => {
        const a = ang + q * 0.7, c = Math.cos(a), s = Math.sin(a);
        ctx.strokeStyle = INKC; ctx.lineWidth = 1.9; ctx.beginPath(); ctx.moveTo(r.x - r.r * c * SPOKE, r.y - r.ry * s * SPOKE); ctx.lineTo(r.x + r.r * c * SPOKE, r.y + r.ry * s * SPOKE); ctx.stroke();
        if (NOTCH){ ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r.x + (r.r + NOTCH) * c, r.y + (r.ry + NOTCH) * s, 1.7, 0, 2 * Math.PI); ctx.fill(); }
      });
      ctx.restore();
    }

    // outputs (per darrere de la paret de la màquina: només es veuen a la dreta de la sortida)
    ctx.save(); ctx.beginPath(); ctx.moveTo(747, 540); ctx.lineTo(W, 540); ctx.lineTo(W, H); ctx.lineTo(772, H); ctx.lineTo(772, 646); ctx.closePath(); ctx.clip();
    for (let k = cards.length - 1; k >= 0; k--){ const p = cardPos(cards[k], t); if (p) ctx.drawImage(cards[k].c, p[0], p[1]); }
    ctx.restore();

    // màquina (vibra mentre treballa)
    const jx = running ? Math.round(Math.sin(t * 61) * 1.2) : 0, jy = running ? Math.round(Math.cos(t * 47) * 1.2) : 0;
    ctx.drawImage(spr.machine.c, spr.machine.x + jx, spr.machine.y + jy);

    // inputs
    nums.forEach((n, k) => { const s = numState(n, k, t); if (!s) return; ctx.save(); ctx.globalAlpha = s[3]; ctx.drawImage(n.c, s[0], s[1], n.w * s[2], n.h * s[2]); ctx.restore(); });

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
      const press = ease(seg(t, T.w1, T.sw1)) * (1 - ease(seg(t, T.hold, T.sw2)));          // abaixa la paleta fins al botó i la torna a pujar
      draw(spr.tool, dx, bob, SHOULDER, rad(SWING_TOOL * press + 3 * sw * wf));
    }
    // el botó s'il·lumina en prémer-lo
    if (t >= T.sw1 && t < T.sw1 + 0.6){
      const e = (t - T.sw1) / 0.6;
      ctx.save(); ctx.strokeStyle = '#e02020'; ctx.globalAlpha = 1 - e; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(BUTTON[0], BUTTON[1], 6 + 22 * e, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
    }

    // cercle vermell i fletxa
    if (t < lastT){ red.data.data.fill(0); red.ptr = 0; }
    const o = red.data.data; let changed = red.ptr === 0;
    while (red.ptr < red.px.length && red.tm[red.ptr] <= t){ const q = red.px[red.ptr]*4; o[q] = od[q]; o[q+1] = od[q+1]; o[q+2] = od[q+2]; o[q+3] = 255; red.ptr++; changed = true; }
    if (changed) red.ctx.putImageData(red.data, 0, 0);
    ctx.drawImage(red.layer, 0, 0);
    lastT = t;
  }

  function state(s){ if (api.onstate) api.onstate(s); }
  function play(){
    if (!ready) return;
    cancelAnimationFrame(raf);
    if (matchMedia('(prefers-reduced-motion:reduce)').matches){ render(T.end); state('done'); return; }
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

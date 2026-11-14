/* Escena del pas 6 (població sota el llindar).
   1) Els personatges de l'esquerra entren caminant per les vores de la imatge fins al seu lloc.
   2) Es treuen les butxaques, que són buides, i apareix escrit el cartell de sobre.
   3) El mateix amb els personatges de la dreta, que entren tots per la vora dreta.
   Al final les butxaques tornen a dins i queda el dibuix original.

   Cada personatge és un titella fet amb els trossos ORIGINALS del dibuix d'en Mon: cos (cap + tronc amb la samarreta),
   dos braços (partits pel colze), dues cames (partides pel genoll) i dos peus. El codi separa les peces tot sol a partir
   de les regions tancades del dibuix (cap, tronc, buit de cada braç, peus) i del traç que les envolta. Quan el titella
   està quiet, les peces encaixen exactament amb el dibuix. Només les butxaques són dibuixades de nou.

   PoblacioAnimada(figura, src) -> {play(), seek(t), ready, playing, speed, total}
   Coordenades en píxels de la imatge original (1379 x 559). */
(function(){
const root = typeof window !== 'undefined' ? window : globalThis;
const INK = '#141312';
const TOP = 212, TEXT_SPLIT = 116;                 // els personatges són per sota de TOP; les dues línies del cartell se separen a TEXT_SPLIT
const SPEED = 210, SLOT = 0.38, POCKET = 0.5, SIGN = 1.4;   // velocitat del pas (px/s), separació entre arribades
const SWING = 0.42, ARM = 0.17;                    // obertura de les cames i balanceig dels braços (radians)
const PUPPET_PANELS = [0, 1];                      // panells amb titelles
const lerp = (a, b, t) => a + (b - a) * t, clamp = t => Math.max(0, Math.min(1, t)), seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const back = t => { t = clamp(t); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };   // surt amb un petit rebot

/* ---------- anàlisi del dibuix: separa les peces de cada personatge ---------- */
function analyse(d, W, H){
  const N = W*H, mnA = new Uint8Array(N), mxA = new Uint8Array(N);
  for (let i = 0; i < N; i++){ const r = d[i*4], g = d[i*4+1], b = d[i*4+2]; mnA[i] = Math.min(r, g, b); mxA[i] = Math.max(r, g, b); }
  const pp = 210*W + 300, paper = [d[pp*4], d[pp*4+1], d[pp*4+2]], pMin = mnA[pp];
  const wall = new Uint8Array(N), ink = new Uint8Array(N);            // wall: traç o color; ink: només traç negre/gris
  for (let i = 0; i < N; i++){ const sat = mxA[i] - mnA[i]; wall[i] = (pMin - mnA[i] > 12 || sat > 40) ? 1 : 0; ink[i] = (pMin - mxA[i] > 12 && sat < 40) ? 1 : 0; }
  const X = i => i % W, Y = i => (i / W) | 0;
  const nbs = [0, 0, 0, 0];
  const nb = i => { const x = i % W, y = (i / W) | 0; nbs[0] = x > 0 ? i-1 : -1; nbs[1] = x < W-1 ? i+1 : -1; nbs[2] = y > 0 ? i-W : -1; nbs[3] = y < H-1 ? i+W : -1; return nbs; };

  // línia que separa els dos panells
  const colN = new Int32Array(W); for (let i = 0; i < N; i++) if (pMin - mnA[i] > 60) colN[i % W]++;
  let d0 = W, d1 = 0; for (let x = Math.round(W*0.4); x < W*0.6; x++) if (colN[x] > H*0.55){ if (x < d0) d0 = x; if (x > d1) d1 = x; }
  const panelOf = x => x < d0 ? 0 : 1;

  // fons: tot el blanc connectat amb la vora de la imatge
  const bg = new Uint8Array(N), queue = new Int32Array(N); let head = 0, tail = 0;
  for (let i = 0; i < N; i++){ const x = i % W, y = (i/W)|0; if ((x === 0 || y === 0 || x === W-1 || y === H-1) && !wall[i]){ bg[i] = 1; queue[tail++] = i; } }
  while (head < tail){ const i = queue[head++]; nb(i); for (let k = 0; k < 4; k++){ const j = nbs[k]; if (j >= 0 && !bg[j] && !wall[j]){ bg[j] = 1; queue[tail++] = j; } } }
  const fig = new Uint8Array(N);                                       // píxels dels personatges
  for (let i = 0; i < N; i++){ const x = i % W; fig[i] = (!bg[i] && ((i/W)|0) >= TOP && (x < d0 - 2 || x > d1 + 2)) ? 1 : 0; }

  // regions tancades (tot el que no és traç ni fons): caps, troncs, buits dels braços, peus...
  const comp = new Int32Array(N).fill(-1), cs = [];
  for (let s = 0; s < N; s++){
    if (comp[s] >= 0 || !fig[s] || ink[s]) continue;
    const id = cs.length, px = [s]; comp[s] = id; let sx = 0, sy = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let h = 0; h < px.length; h++){
      const i = px[h], x = i % W, y = (i/W)|0; sx += x; sy += y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      nb(i); for (let k = 0; k < 4; k++){ const j = nbs[k]; if (j >= 0 && comp[j] < 0 && fig[j] && !ink[j]){ comp[j] = id; px.push(j); } }
    }
    cs.push({id, n: px.length, cx: sx / px.length, cy: sy / px.length, x0, y0, x1, y1, px});
  }
  let heads = cs.filter(c => c.n >= 455 && c.cy > 245 && c.cy < 300 && c.x1 - c.x0 < 90 && c.y1 - c.y0 < 90).sort((a, b) => a.cx - b.cx);
  for (let k = heads.length - 1; k > 0; k--) if (heads[k].cx - heads[k-1].cx < 22) heads.splice(heads[k].n < heads[k-1].n ? k : k-1, 1);
  const isHead = new Set(heads.map(h => h.id));

  // creixement pel traç: des d'uns píxels d'origen, avança per píxels de traç fins a `steps` passos
  const dist = new Int16Array(N).fill(-1);
  function grow(src, steps, pass){
    const q = [];
    for (const i of src) if (dist[i] < 0){ dist[i] = 0; q.push(i); }
    for (let h = 0; h < q.length; h++){
      const i = q[h]; if (dist[i] >= steps) continue;
      nb(i); for (let k = 0; k < 4; k++){ const j = nbs[k]; if (j >= 0 && dist[j] < 0 && ink[j] && (!pass || pass(j))){ dist[j] = dist[i] + 1; q.push(j); } }
    }
    return q;
  }
  const clear = q => { for (const i of q) dist[i] = -1; };
  const rowAvg = (c, y) => { let s = 0, n = 0; for (const i of c.px) if (((i/W)|0) === y){ s += i % W; n++; } return n ? s / n : c.cx; };
  const runs = (y, xa, xb) => { const out = []; let a = -1; for (let x = Math.max(0, xa); x <= Math.min(W-1, xb) + 1; x++){ const on = x <= xb && ink[y*W + x]; if (on && a < 0) a = x; if (!on && a >= 0){ out.push([a, x-1]); a = -1; } } return out; };

  // els personatges del panell dret són més petits: totes les mides es multipliquen per l'escala del panell
  const med = a => { const o = a.slice().sort((x, y) => x - y); return o.length ? o[o.length >> 1] : 1; };
  const hRef = med(heads.filter(h => panelOf(h.cx) === 0).map(h => h.n)) || 1000;
  const scOf = [0, 1].map(p => Math.min(1, Math.sqrt(med(heads.filter(h => panelOf(h.cx) === p).map(h => h.n)) / hRef)));
  const chars = [], stats = [];
  heads.forEach((hd, hk) => {
    const panel = panelOf(hd.cx);
    if (!PUPPET_PANELS.includes(panel)) return;
    const sc = scOf[panel], S = v => Math.max(2, Math.ceil(v * sc)), st = {k: hk, sc: +sc.toFixed(2), head: hd.n}; stats.push(st);
    // tronc: la primera regió gran sota el cap
    let T = null; const hx = Math.round(hd.cx);
    for (let y = hd.y1 + 1; y < hd.y1 + S(40) && !T; y++){ const c = comp[y*W + hx]; if (c >= 0 && c !== hd.id && cs[c].n >= 300*sc*sc && !isHead.has(c)) T = cs[c]; }
    // si un dibuix de la samarreta parteix el tronc (la bicicleta), s'hi ajunta el tros de sota
    for (let tries = 0; T && T.y1 - hd.y1 < 75*sc && tries < 3; tries++){
      let o = null;
      for (let y = T.y1 + 1; y <= Math.min(H - 1, T.y1 + S(30)) && !o; y++) for (const ox of [0, -S(8), S(8), -S(16), S(16)]){ const c = comp[y*W + hx + ox]; if (c >= 0 && c !== T.id && c !== hd.id && !isHead.has(c) && cs[c].n >= 300*sc*sc){ o = cs[c]; break; } }
      if (!o) break;
      for (const i of o.px) comp[i] = T.id;
      T.cx = (T.cx*T.n + o.cx*o.n) / (T.n + o.n); T.cy = (T.cy*T.n + o.cy*o.n) / (T.n + o.n); T.n += o.n; T.px = T.px.concat(o.px);
      T.x0 = Math.min(T.x0, o.x0); T.y0 = Math.min(T.y0, o.y0); T.x1 = Math.max(T.x1, o.x1); T.y1 = Math.max(T.y1, o.y1); o.n = 0; o.px = [];
    }
    if (!T){ st.err = 'sense tronc'; return; }
    st.torso = T.n;
    // cos = cap + tronc + el traç que els envolta + els cabells
    const body = new Set(hd.px); for (const i of T.px) body.add(i);
    let q = grow(hd.px.concat(T.px), S(6)); for (const i of q) body.add(i); clear(q);
    q = grow(hd.px, S(28), j => ((j/W)|0) < hd.cy); for (const i of q) body.add(i); clear(q);
    // buits dels braços: regions que toquen el tronc, a esquerra i a dreta
    const adj = new Set(); q = grow(T.px, S(9));
    for (const i of q){ nb(i); for (let k = 0; k < 4; k++){ const j = nbs[k]; if (j >= 0 && comp[j] >= 0 && comp[j] !== T.id && !isHead.has(comp[j])) adj.add(comp[j]); } }
    clear(q);
    let AL = null, AR = null;
    adj.forEach(id => { const c = cs[id]; if (c.n < 60*sc*sc || c.n > 1500 || c.cy < T.y0 || c.cy > T.y1 + 5) return; if (c.cx < T.cx){ if (!AL || c.n > AL.n) AL = c; } else if (!AR || c.n > AR.n) AR = c; });
    adj.forEach(id => { const c = cs[id]; if (c !== AL && c !== AR && c.n > 0 && c.n < 200*sc*sc && c.x0 >= T.x0 - 4 && c.x1 <= T.x1 + 4 && c.y0 >= T.y0 && c.y1 <= T.y1 + 4) for (const i of c.px) body.add(i); });   // forats petits (rodes, dits)
    st.armL = AL ? AL.n : 0; st.armR = AR ? AR.n : 0;
    // profunditat dins del tronc (per trobar el tros de braç dibuixat per sobre de la samarreta)
    const bx0 = Math.max(0, T.x0 - 12), by0 = Math.max(0, T.y0 - 12), bw = Math.min(W-1, T.x1 + 12) - bx0 + 1, bh = Math.min(H-1, T.y1 + 12) - by0 + 1;
    const depth = new Int16Array(bw*bh).fill(-1), dq = [];
    const inS = (x, y) => { const i = y*W + x; return comp[i] === T.id || ink[i]; };
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (x === 0 || y === 0 || x === bw-1 || y === bh-1 || !inS(bx0 + x, by0 + y)){ depth[y*bw + x] = 0; dq.push(y*bw + x); }
    for (let h = 0; h < dq.length; h++){ const p = dq[h], x = p % bw, y = (p/bw)|0; for (const [ex, ey] of [[-1,0],[1,0],[0,-1],[0,1]]){ const u = x + ex, v = y + ey; if (u < 0 || v < 0 || u >= bw || v >= bh) continue; const r = v*bw + u; if (depth[r] < 0){ depth[r] = depth[p] + 1; dq.push(r); } } }
    const depthAt = i => { const x = i % W - bx0, y = ((i/W)|0) - by0; return (x < 0 || y < 0 || x >= bw || y >= bh) ? 0 : depth[y*bw + x]; };

    const parts = {body: null}, piv = {}, DEEP = S(8);
    // el braç és només la línia de fora i la mà. El traç que queda ENTRE el buit del braç i el tronc és la vora del tronc i no es mou
    // (td: cap a on és el tronc; a l'alçada de la mà sí que s'agafa, perquè la mà hi va dibuixada a sobre)
    const between = (i, A, td) => { if (((i/W)|0) >= A.y1 - S(3)) return false; let t = false, a = false; for (let k = 1; k <= S(7); k++){ if (comp[i + td*k] === T.id) t = true; if (comp[i - td*k] === A.id) a = true; } return t && a; };
    // braç esquerre (va per darrere del cos): la línia de fora i la mà
    if (AL){
      const L = new Set(); q = grow(AL.px, S(6)); const lin = []; for (const i of q) if (ink[i] && !between(i, AL, 1)){ L.add(i); lin.push(i); } clear(q);
      q = grow(lin, S(5), j => ((j/W)|0) >= AL.y1 - S(8)); for (const i of q) L.add(i); clear(q);
      const ey = Math.round((AL.y0 + AL.y1) / 2); let ex = W; L.forEach(i => { if (((i/W)|0) === ey && ink[i] && i % W < ex) ex = i % W; }); if (ex === W) ex = AL.x0;
      piv.shB = [rowAvg(AL, AL.y0), AL.y0 - 3*sc]; piv.elB = [ex + 2*sc, ey]; piv.handB = [rowAvg(AL, AL.y1), AL.y1];
      parts.armBU = [...L].filter(i => ((i/W)|0) <= ey + 2); parts.armBL = [...L].filter(i => ((i/W)|0) >= ey - 2);
    }
    // braç dret (va per davant del cos): la línia de fora, la mà i el tros dibuixat sobre la samarreta
    const inpaint = new Map();
    if (AR){
      const F = new Set(), arc = []; q = grow(AR.px, S(6)); for (const i of q) if (ink[i] && !between(i, AR, -1)){ F.add(i); arc.push(i); } clear(q);
      q = grow(arc, S(5), j => ((j/W)|0) >= AR.y1 - S(8)); for (const i of q) F.add(i); clear(q);
      q = grow(arc, S(24), j => ((j/W)|0) <= AR.y0 + S(10)); for (const i of q) if (depthAt(i) >= DEEP || dist[i] <= S(8)) F.add(i); clear(q);
      const ey = Math.round((AR.y0 + AR.y1) / 2); let ex = -1; F.forEach(i => { if (((i/W)|0) === ey && ink[i] && i % W > ex && i % W > AR.cx) ex = i % W; }); if (ex < 0) ex = AR.x1 + 3;
      piv.shF = [rowAvg(AR, AR.y0) - 5*sc, AR.y0 - 3*sc]; piv.elF = [ex - 2*sc, ey]; piv.handF = [rowAvg(AR, AR.y1), AR.y1];
      parts.armFU = [...F].filter(i => ((i/W)|0) <= ey + 2); parts.armFL = [...F].filter(i => ((i/W)|0) >= ey - 2);
      // el tros de braç que queda dins del tronc s'esborra del cos i es repinta amb el color del voltant
      const hole = [...F].filter(i => depthAt(i) >= DEEP && body.has(i)), hs = new Set(hole), src = new Map(), bq = [];
      for (const i of hole){ nb(i); for (let k = 0; k < 4; k++){ const j = nbs[k]; if (j >= 0 && !hs.has(j) && !ink[j] && comp[j] === T.id && !src.has(i)){ src.set(i, j); bq.push(i); } } }
      for (let h = 0; h < bq.length; h++){ const i = bq[h]; nb(i); for (let k = 0; k < 4; k++){ const j = nbs[k]; if (j >= 0 && hs.has(j) && !src.has(j)){ src.set(j, src.get(i)); bq.push(j); } } }
      src.forEach((v, i) => inpaint.set(i, v)); st.hole = inpaint.size;
    }
    // cames: sota la vora de la samarreta, se segueix cada traç fila a fila fins al peu
    const legs = []; let start = null, sy = 0;
    let hx0 = W, hx1 = 0; for (const i of T.px) if (((i/W)|0) >= T.y1 - S(12)){ const x = i % W; if (x < hx0) hx0 = x; if (x > hx1) hx1 = x; }     // amplada de la vora de la samarreta
    for (let y = T.y1 + S(10); y <= T.y1 + S(22) && !start; y++){
      const r = runs(y, hx0 - S(8), hx1 + S(8)).filter(r => r[1] - r[0] >= 1 && r[1] - r[0] <= S(9) && !body.has(y*W + r[0]) && (r[0] + r[1]) / 2 >= hx0 - 3 && (r[0] + r[1]) / 2 <= hx1 + 3);
      if (r.length >= 2){ const m = (hx0 + hx1) / 2; r.sort((a, b) => Math.abs((a[0] + a[1]) / 2 - m) - Math.abs((b[0] + b[1]) / 2 - m)); start = r.slice(0, 2).sort((a, b) => a[0] - b[0]); sy = y; }
    }
    st.legs = start ? 2 : 0;
    const used = new Set();
    if (start) start.forEach((r0, side) => {
      const rows = [];
      const follow = (dy) => { let a = r0[0], b = r0[1]; for (let y = sy + (dy > 0 ? 0 : -1), n = 0; n < 140 && y > 0 && y < H; y += dy, n++){
        let best = null, bo = 0; for (const r of runs(y, a - 4, b + 4)){ const o = Math.min(r[1], b + 1) - Math.max(r[0], a - 1) + 1; if (o > bo){ bo = o; best = r; } }
        if (!best || best[1] - best[0] > S(12)){
          // la cama es creua amb un altre traç: se salta el creuament seguint la mateixa direcció
          if (dy < 0 || rows.length >= (sc < 0.9 ? 48 : 60) || rows.length < 5) break;
          const r1 = rows[rows.length - 1], r0 = rows[rows.length - 11] || rows[0], slope = ((r1[1] + r1[2]) - (r0[1] + r0[2])) / 2 / Math.max(1, r1[0] - r0[0]), wd = r1[2] - r1[1];
          let found = 0;
          for (let look = 1; look <= S(14) && !found; look++){ const pc = (r1[1] + r1[2]) / 2 + slope * look; for (const r of runs(y + look, Math.round(pc) - 4, Math.round(pc) + 4)) if (r[1] - r[0] <= S(9) && Math.abs((r[0] + r[1]) / 2 - pc) <= 3){ found = look; a = r[0]; b = r[1]; } }
          if (!found) break;
          for (let k = 0; k < found; k++){ const pc = (r1[1] + r1[2]) / 2 + slope * (k + 1) * 0 + slope * k; rows.push([y + k, Math.round(pc - wd / 2), Math.round(pc + wd / 2)]); }
          y += found - 1; continue;
        }
        a = best[0]; b = best[1]; dy > 0 ? rows.push([y, a, b]) : rows.unshift([y, a, b]); } };
      follow(1); follow(-1);
      if (rows.length < 20*sc) return;
      const top = rows[0], end = rows[rows.length - 1], mid = rows[rows.length >> 1], ctr = r => [(r[1] + r[2]) / 2, r[0]];
      // peu: la regió tancada que hi ha just sota el final de la cama
      let F = null; const ax = Math.round((end[1] + end[2]) / 2);
      for (let dy = 1; dy <= S(18) && !F; dy++) for (const ox of [0, -2, 2, -4, 4, -6, 6, -8, 8, -10, 10, -13, 13, -16, 16]){ if (Math.abs(ox) > S(16)) continue; const y = end[0] + dy, x = ax + ox; if (y >= H || x < 0 || x >= W) continue; const c = comp[y*W + x]; if (c >= 0 && cs[c].n >= 6 && cs[c].n <= 900 && c !== T.id){ F = cs[c]; break; } }
      const foot = new Set(); if (F){ for (const i of F.px) foot.add(i); q = grow(F.px, S(7)); for (const i of q) foot.add(i); clear(q); }
      else { const e0 = []; for (let x = end[1]; x <= end[2]; x++) e0.push(end[0]*W + x); q = grow(e0, S(26), j => ((j/W)|0) >= end[0]); for (const i of q) foot.add(i); clear(q); }   // peu sense interior tancat: només el traç
      const pxOf = (a, b) => { const o = []; for (const r of rows) if (r[0] >= a && r[0] <= b) for (let x = r[1]; x <= r[2]; x++){ const i = r[0]*W + x; if (!foot.has(i) || r[0] < end[0] - 3) o.push(i); } return o; };
      const leg = {thigh: pxOf(top[0], mid[0] + 2), shin: pxOf(mid[0] - 2, end[0]), foot: [...foot], top: ctr(top), knee: ctr(mid), ankle: ctr(end), side};
      leg.len = Math.hypot(leg.ankle[0] - leg.top[0], leg.ankle[1] - leg.top[1]); leg.rest = Math.atan2(leg.ankle[0] - leg.top[0], leg.ankle[1] - leg.top[1]);
      leg.floor = F ? F.y1 + 4 : end[0]; legs.push(leg); st['leg' + side] = rows.length + '/' + (F ? F.n : 0);
      for (const k of ['thigh', 'shin', 'foot']) for (const i of leg[k]) used.add(i);
    });
    parts.body = body;
    chars.push({k: hk, panel, sc, cx: hd.cx, parts, piv, legs, inpaint, T, hd, used});
  });

  // amos de cada píxel; el que queda sense amo (traç o color) s'afegeix a la peça que té més a prop
  const own = new Int32Array(N).fill(-1), lists = [];
  const claim = (arr, ci, name) => { const id = lists.length; lists.push({ci, name, extra: []}); for (const i of arr) if (own[i] < 0) own[i] = id; };
  chars.forEach((c, ci) => {
    claim(c.parts.body, ci, 'body');
    for (const n of ['armBU', 'armBL', 'armFU', 'armFL']) if (c.parts[n]) claim(c.parts[n], ci, n);
    c.legs.forEach((l, li) => { for (const n of ['thigh', 'shin', 'foot']) claim(l[n], ci, 'leg' + li + n); });
  });
  const visible = i => ink[i] || wall[i];
  const lq = []; for (let i = 0; i < N; i++) if (own[i] >= 0) lq.push(i);
  let extra = 0;
  for (let h = 0; h < lq.length; h++){ const i = lq[h]; nb(i); for (let k = 0; k < 4; k++){ const j = nbs[k]; if (j >= 0 && own[j] < 0 && fig[j] && visible(j) && PUPPET_PANELS.includes(panelOf(j % W))){ own[j] = own[i]; lists[own[i]].extra.push(j); lq.push(j); extra++; } } }
  let lost = 0;
  for (let i = 0; i < N; i++) if (own[i] < 0 && fig[i] && visible(i) && PUPPET_PANELS.includes(panelOf(i % W)) && chars.length){
    let best = 0, bd = 1e9; chars.forEach((c, ci) => { const dd = Math.abs(c.cx - i % W); if (dd < bd){ bd = dd; best = ci; } });
    chars[best].parts.body.add(i); own[i] = -2; lost++;
  }
  lists.forEach(l => { if (!l.extra.length) return; const c = chars[l.ci];
    if (l.name === 'body') l.extra.forEach(i => c.parts.body.add(i));
    else if (l.name.startsWith('arm')) c.parts[l.name] = c.parts[l.name].concat(l.extra);
    else { const m = /leg(\d)(\w+)/.exec(l.name), leg = c.legs[+m[1]]; leg[m[2]] = leg[m[2]].concat(l.extra); } });
  chars.forEach(c => { c.parts.body = [...c.parts.body]; });
  return {W, H, paper, pMin, mnA, ink, bg, fig, d0, d1, chars, stats, extra, lost, heads: heads.map(h => [Math.round(h.cx), Math.round(h.cy), h.n])};
}
root.PoblacioAnalyse = analyse;
if (typeof window === 'undefined') return;

window.PoblacioAnimada = function(fig, src){
  const cv = fig.querySelector('canvas'), ctx = cv.getContext('2d');
  let W, H, orig, od, base, rightLayer, chars = [], panels = [], signs = [], paperCss = '#f9f9f9', T = {}, raf = 0, playing = false, ready = false, t0 = 0, lastT = 1e9;
  const api = {play, seek, speed: 1, total: 0, onready: null, onstate: null, dbg: null, get playing(){ return playing; }, get ready(){ return ready; }};

  const img = new Image();
  img.onload = () => { prepare(); ready = true; ctx.drawImage(orig, 0, 0); if (api.onready) api.onready(); };
  img.src = src;
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w || W; c.height = h || H; return c; };

  function prepare(){
    W = cv.width = img.naturalWidth; H = cv.height = img.naturalHeight;
    orig = canvas(); orig.getContext('2d').drawImage(img, 0, 0);
    od = orig.getContext('2d').getImageData(0, 0, W, H).data;
    const d = od, N = W*H, A = analyse(d, W, H), paper = A.paper, pMin = A.pMin, d0 = A.d0, d1 = A.d1;
    paperCss = `rgb(${paper[0]},${paper[1]},${paper[2]})`;
    panels = [[0, d0 - 3], [d1 + 3, W]];

    // peça retallada del dibuix original; a les vores del traç, negre amb transparència (perquè no quedi serrell clar)
    const mark = new Int32Array(N); let stamp = 0;
    function sprite(px, repl){
      if (!px || !px.length) return null;
      stamp++; let x0 = W, y0 = H, x1 = 0, y1 = 0;
      for (const i of px){ mark[i] = stamp; const x = i % W, y = (i/W)|0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const w = x1 - x0 + 1, h = y1 - y0 + 1, im = new ImageData(w, h), o = im.data;
      for (const i of px){
        const x = i % W, y = (i/W)|0, q = ((y - y0)*w + (x - x0))*4, s = repl && repl.has(i) ? repl.get(i) : i;
        o[q] = d[s*4]; o[q+1] = d[s*4+1]; o[q+2] = d[s*4+2]; o[q+3] = 255;
        if (s === i && A.ink[i]){
          const edge = (x > 0 && mark[i-1] !== stamp) || (x < W-1 && mark[i+1] !== stamp) || (y > 0 && mark[i-W] !== stamp) || (y < H-1 && mark[i+W] !== stamp);
          if (edge){ o[q] = 20; o[q+1] = 19; o[q+2] = 18; o[q+3] = Math.round(255 * clamp((pMin - A.mnA[i]) / (pMin - 20))); }
        }
      }
      const c = canvas(w, h); c.getContext('2d').putImageData(im, 0, 0);
      return {cv: c, x: x0, y: y0, x1, y1};
    }
    chars = A.chars.map(c => {
      const P = c.parts, o = {panel: c.panel, sc: c.sc, cx: c.cx, piv: c.piv, body: sprite(P.body, c.inpaint)};
      for (const n of ['armBU', 'armBL', 'armFU', 'armFL']) o[n] = sprite(P[n]);
      o.legs = c.legs.map(l => ({thigh: sprite(l.thigh), shin: sprite(l.shin), foot: sprite(l.foot), top: l.top, knee: l.knee, ankle: l.ankle, rest: l.rest, len: l.len, floor: l.floor}));
      o.hip = o.legs.length === 2 ? [(o.legs[0].top[0] + o.legs[1].top[0]) / 2, o.legs[0].top[1]] : [c.T.cx, c.T.y1];
      o.step = 2 * (o.legs.length ? (o.legs[0].len + o.legs[o.legs.length - 1].len) / 2 : 80) * Math.sin(SWING);   // avanç per pas
      o.floorY = o.legs.length ? Math.max(...o.legs.map(l => l.floor)) : c.T.y1;
      o.bx0 = Math.min(o.body.x, ...['armBU', 'armBL'].map(n => o[n] ? o[n].x : W), ...o.legs.map(l => l.foot ? l.foot.x : W));
      o.bx1 = Math.max(o.body.x1, ...['armFU', 'armFL'].map(n => o[n] ? o[n].x1 : 0), ...o.legs.map(l => l.foot ? l.foot.x1 : 0));
      return o;
    });

    // fons sense personatges ni cartells
    const bd = new Uint8ClampedArray(d), er = new Uint8Array(A.fig);
    for (let pass = 0; pass < 3; pass++){ const add = []; for (let i = 0; i < N; i++) if (!er[i] && ((i/W)|0) >= TOP){ const x = i % W; if (x >= d0 - 2 && x <= d1 + 2) continue; if ((x > 0 && er[i-1]) || (x < W-1 && er[i+1]) || er[i-W] || (i + W < N && er[i+W])) add.push(i); } add.forEach(i => er[i] = 1); }
    const rl = new ImageData(W, H);
    for (let i = 0; i < N; i++) if (er[i]){
      if (i % W > d1 + 2){ rl.data[i*4] = d[i*4]; rl.data[i*4+1] = d[i*4+1]; rl.data[i*4+2] = d[i*4+2]; rl.data[i*4+3] = 255; }
      bd[i*4] = paper[0]; bd[i*4+1] = paper[1]; bd[i*4+2] = paper[2];
    }
    rightLayer = canvas(); rightLayer.getContext('2d').putImageData(rl, 0, 0);

    // cartells: s'escriuen d'esquerra a dreta, primer la línia de dalt i després la de baix
    const mn = i => A.mnA[i];
    signs = panels.map(pn => {
      const px = []; let a1 = W, b1 = 0, a2 = W, b2 = 0;
      for (let y = 0; y < TOP - 6; y++) for (let x = pn[0]; x < pn[1]; x++){ const i = y*W + x; if (pMin - mn(i) <= 0) continue; px.push(i); if (pMin - mn(i) > 40){ if (y < TEXT_SPLIT){ if (x < a1) a1 = x; if (x > b1) b1 = x; } else { if (x < a2) a2 = x; if (x > b2) b2 = x; } } }
      const L1 = b1 - a1, L = L1 + (b2 - a2);
      px.forEach(i => { bd[i*4] = paper[0]; bd[i*4+1] = paper[1]; bd[i*4+2] = paper[2]; });
      const pos = px.map(i => { const x = i % W, y = (i/W)|0; return [i, clamp((y < TEXT_SPLIT ? x - a1 : L1 + x - a2) / L)]; }).sort((a, b) => a[1] - b[1]);
      const layer = canvas(); return {px: Int32Array.from(pos, a => a[0]), u: Float32Array.from(pos, a => a[1]), layer, ctx: layer.getContext('2d'), data: new ImageData(W, H), ptr: 0, t0: 0};
    });
    base = canvas(); base.getContext('2d').putImageData(new ImageData(bd, W, H), 0, 0);

    // --- temps: panell esquerre (entren, butxaques, cartell); després apareix el dret i el seu cartell ---
    let t = 0.3;
    panels.forEach((pn, p) => {
      const mine = chars.filter(c => c.panel === p); if (!mine.length) return;
      const order = mine.map((c, k) => k).sort((a, b) => ((a * 7) % mine.length) - ((b * 7) % mine.length));   // ordre barrejat
      const mid = (pn[0] + pn[1]) / 2, slot = SLOT * (p ? 0.75 : 1);
      order.forEach((k, q) => {
        const c = mine[k];
        // panell esquerre: la meitat entra per l'esquerra i l'altra per la dreta (creuant el panell buit);
        // panell dret: tots per la dreta, perquè no passin per davant del grup que ja és al seu lloc
        c.dx = (p === 0 && c.cx < mid) ? -(c.bx1 + 20) : W - c.bx0 + 20;
        c.dur = Math.abs(c.dx) / (SPEED * c.sc); c.start = q * slot - c.dur;
      });
      const first = Math.min(...mine.map(c => c.start)); mine.forEach(c => c.start += t - first);
      const arrived = Math.max(...mine.map(c => c.start + c.dur));
      mine.forEach((c, k) => { c.pocket = arrived + 0.35 + 0.05 * k; });
      signs[p].t0 = arrived + 0.35 + 0.05 * (mine.length - 1) + POCKET + 0.25; t = signs[p].t0 + SIGN + 0.4;
    });
    T.tuck = t + 0.3; T.xf = T.tuck + 0.45; T.end = T.xf + 0.4; api.total = T.end;
    chars.sort((a, b) => a.floorY - b.floorY);                     // els de la fila del davant es pinten al final
    api.dbg = {stats: A.stats, extra: A.extra, lost: A.lost, heads: A.heads, divider: [d0, d1], total: T.end};
  }

  // ---------- titella ----------
  const rot = (p, a) => { if (!a) return; ctx.translate(p[0], p[1]); ctx.rotate(a); ctx.translate(-p[0], -p[1]); };
  const put = s => { if (s) ctx.drawImage(s.cv, s.x, s.y); };
  function arm(up, low, sh, el, a, bend){
    if (!up) return;
    ctx.save(); rot(sh, a); put(up); rot(el, bend); put(low); ctx.restore();
  }
  function pocketFlap(p, side, k, sc){                    // butxaca treta: una llengüeta blanca amb el traç gruixut d'en Mon
    if (k <= 0 || !p) return;
    ctx.save(); ctx.translate(p[0] + side * 2 * sc, p[1] - 3 * sc); ctx.rotate(side * 0.45); ctx.scale(k * sc, k * sc);
    ctx.fillStyle = paperCss; ctx.strokeStyle = INK; ctx.lineWidth = 4.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4, -3); ctx.quadraticCurveTo(side * 17, -7, side * 16, 9); ctx.quadraticCurveTo(side * 14, 24, side * 2, 21); ctx.quadraticCurveTo(-5 * side, 13, -4, -3); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();
  }
  // dx: desplaçament; wf: 0 = quiet (dibuix original), 1 = caminant; ph: fase del pas; dir: +1 cap a la dreta; pk: butxaques (0..1)
  function drawChar(c, dx, wf, ph, dir, pk, lift){
    const P = c.piv, bob = (-3 * Math.abs(Math.sin(ph)) * wf + lift) * c.sc;
    ctx.save(); ctx.translate(dx, bob); rot(c.hip, dir * 0.04 * wf);            // cos una mica inclinat cap endavant
    const sB = dir * ARM * Math.sin(ph + Math.PI), sF = dir * ARM * Math.sin(ph);   // cada braç va al revés que la cama del seu costat
    arm(c.armBU, c.armBL, P.shB, P.elB, -sB * wf + 0.13 * pk, -dir * (0.08 + 0.06 * Math.sin(ph + Math.PI)) * wf);
    c.legs.forEach((l, k) => {
      const pl = ph + k * Math.PI, th = dir * SWING * Math.sin(pl), flex = 0.95 * Math.max(0, Math.cos(pl));   // el genoll es doblega quan la cama va cap endavant
      const a1 = -(th - l.rest) * wf, a2 = dir * flex * wf;
      ctx.save(); rot(l.top, a1); put(l.thigh); rot(l.knee, a2); put(l.shin);
      if (wf > 0.02){ ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(l.knee[0], l.knee[1], 2.7 * c.sc, 0, 2 * Math.PI); ctx.fill(); }   // genoll
      rot(l.ankle, -(a1 + a2) * 0.75); put(l.foot); ctx.restore();          // el peu es manté força pla
    });
    put(c.body);
    pocketFlap(P.handB, -1, pk, c.sc); pocketFlap(P.handF, 1, pk, c.sc);
    arm(c.armFU, c.armFL, P.shF, P.elF, -sF * wf - 0.13 * pk, -dir * (0.08 + 0.06 * Math.sin(ph)) * wf);
    ctx.restore();
  }

  function render(t){
    if (t >= T.end){ ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(orig, 0, 0); lastT = t; return; }
    ctx.drawImage(base, 0, 0);

    // cartells
    signs.forEach(S => {
      if (t < lastT){ S.data.data.fill(0); S.ptr = 0; }
      const u = (t - S.t0) / SIGN, o = S.data.data; let ch = S.ptr === 0;
      while (S.ptr < S.px.length && S.u[S.ptr] <= u){ const q = S.px[S.ptr]*4; o[q] = od[q]; o[q+1] = od[q+1]; o[q+2] = od[q+2]; o[q+3] = 255; S.ptr++; ch = true; }
      if (ch) S.ctx.putImageData(S.data, 0, 0);
      ctx.drawImage(S.layer, 0, 0);
    });

    // titelles
    chars.forEach(c => {
      if (t < c.start) return;
      const e = seg(t, c.start, c.start + c.dur), dir = c.dx < 0 ? 1 : -1;
      const wf = e < 1 ? Math.min(1, (1 - e) * c.dur * 3) : 0;          // en arribar, el pas s'apaga i queda com al dibuix
      const dx = e < 1 ? c.dx * (1 - e) : 0, ph = Math.abs(c.dx) * e / c.step * Math.PI;
      const pk = back(seg(t, c.pocket, c.pocket + POCKET)) * (1 - ease(seg(t, T.tuck, T.tuck + 0.4)));
      const lift = -3 * Math.sin(Math.PI * seg(t, c.pocket, c.pocket + POCKET));
      drawChar(c, wf > 0 ? dx : Math.round(dx), wf, ph, dir, pk, lift);
    });

    const f = seg(t, T.xf, T.end);                                       // al final es fon amb el dibuix original
    if (f > 0){ ctx.save(); ctx.globalAlpha = f; ctx.drawImage(orig, 0, 0); ctx.restore(); }
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

/* Dibuix animat: destapa una imatge seguint els seus traços, com si s'estigués dibuixant.
   No redibuixa res: cada píxel que apareix és de la imatge original, i l'últim fotograma és la imatge original.

   DibuixAnimat(figura, src, opcions) -> {play(), seek(t), ready, playing, dbg}
   opcions:
     mapS      durada (s) de cada mapa/panell           markS  durada (s) de cada marca final
     gapS      pausa entre escenes                       hand   true = mà amb llapis
     order     'layers' (contorns, rètols, colors) o 'near' (traços grans i després el més proper, pensat per a la mà)
     underlay  píxels que es reconstrueixen sota les marques (carretera o línia que la marca tapa)
     marks     {auto:true}  -> vermells de debò situats abans de l'última línia separadora (cercles i fletxes)
               {seeds:[[x,y],...], start:[x,y]|'left'} -> el traç vermell que passa per cada punt, en aquest ordre
*/
(function(){
const HAND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 925 559" aria-hidden="true">
  <defs>
    <linearGradient id="daBody" x1="0.1" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="#f3f1ee"/><stop offset="0.55" stop-color="#d2cfca"/><stop offset="1" stop-color="#99958f"/></linearGradient>
    <linearGradient id="daUnder" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#bdb9b3"/><stop offset="1" stop-color="#7f7b75"/></linearGradient>
    <linearGradient id="daThumb" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#f6f4f1"/><stop offset="0.6" stop-color="#dcd9d4"/><stop offset="1" stop-color="#aba7a1"/></linearGradient>
    <linearGradient id="daPencil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2463c"/><stop offset="0.45" stop-color="#c9241c"/><stop offset="1" stop-color="#8f1410"/></linearGradient>
    <linearGradient id="daSleeve" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d4c60"/><stop offset="1" stop-color="#232d3b"/></linearGradient>
  </defs>
  <g stroke="#2e2b28" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M786 236 L925 205 L925 548 L796 522 C778 440 776 320 786 236 Z" fill="url(#daSleeve)"/>
    <path d="M560 440 C470 448 428 468 409 491 C398 509 418 522 439 513 C462 503 484 491 560 486 Z" fill="url(#daUnder)"/>
    <path d="M540 396 C430 402 372 424 341 455 C322 476 335 499 359 495 C387 489 402 466 433 456 L540 450 Z" fill="url(#daUnder)"/>
    <path d="M520 326 C384 332 312 358 266 394 C240 415 228 446 245 463 C263 479 286 463 301 441 C331 410 392 400 520 400 Z" fill="url(#daUnder)"/>
    <path d="M262 311 C291 268 332 238 382 224 L470 250 L300 300 Z" fill="#8a8680" stroke="none"/>
    <path d="M800 255 C742 238 686 218 642 190 C602 162 572 122 522 108 C472 97 420 104 370 118 C310 135 262 170 232 215 C205 255 184 302 171 346 C163 374 174 393 197 389 C222 383 242 346 263 311 C291 268 332 238 382 224 C424 276 446 352 456 420 C464 470 482 506 524 511 C620 513 720 506 800 500 Z" fill="url(#daBody)"/>
  </g>
  <g transform="translate(88 440) rotate(-30.6)" stroke="#2e2b28" stroke-width="4" stroke-linejoin="round">
    <rect x="85" y="-15" width="650" height="30" fill="url(#daPencil)"/>
    <rect x="85" y="-9" width="650" height="5" fill="#f08a80" stroke="none" opacity=".7"/>
    <rect x="735" y="-15" width="52" height="30" fill="#c9ccd1"/>
    <path d="M748 -15 v30 M761 -15 v30 M774 -15 v30" stroke-width="2.5" fill="none"/>
    <path d="M787 -15 h22 a12 12 0 0 1 12 12 v6 a12 12 0 0 1 -12 12 h-22 z" fill="#ece9e4"/>
    <path d="M22 -5 L85 -15 L85 15 L22 5 Z" fill="#ead9bd"/>
    <path d="M0 0 L22 -5 L22 5 Z" fill="#2e2b28"/>
  </g>
  <path d="M668 262 C600 236 508 240 430 262 C370 280 300 285 248 292 C222 296 215 325 235 338 C262 352 330 348 390 345 C450 345 520 380 580 400 C628 412 664 380 672 330 Z" fill="url(#daThumb)"/>
  <g fill="none" stroke="#2e2b28" stroke-linecap="round" stroke-linejoin="round">
    <path d="M612 242 C548 236 484 247 430 262 C370 280 300 285 248 292 C222 296 215 325 235 338 C262 352 330 348 390 345 C436 345 476 362 512 378" stroke-width="5"/>
    <path d="M250 296 C240 300 236 322 246 332 C258 336 276 334 286 330 C290 318 288 304 282 296 C272 293 260 294 250 296 Z" fill="#fbfaf8" stroke-width="3"/>
    <path d="M176 338 C170 352 170 370 178 380 C188 384 198 380 202 372 C206 360 204 346 198 338 C190 334 182 334 176 338 Z" fill="#fbfaf8" stroke-width="3"/>
    <g stroke-width="3" opacity=".6">
      <path d="M236 206 C246 214 258 220 270 222 M246 190 C258 200 270 206 284 208"/>
      <path d="M384 268 C388 284 388 300 384 316 M400 264 C405 282 405 300 400 318"/>
      <path d="M512 112 C520 128 524 146 522 162 M548 126 C556 142 560 158 558 174"/>
      <path d="M330 366 C338 372 348 376 358 376 M392 428 C398 434 406 438 414 438 M452 468 C458 472 464 474 470 474"/>
    </g>
    <g stroke-width="2.5" opacity=".32">
      <path d="M646 236 l7 -9 M672 250 l8 -8 M700 258 l6 -9 M726 272 l8 -8 M752 280 l6 -9 M660 300 l8 -8 M690 316 l6 -9 M716 324 l8 -8 M744 340 l6 -9 M676 372 l7 -8 M706 384 l8 -8 M738 398 l6 -8 M622 262 l7 -8 M636 330 l6 -8 M764 316 l6 -8"/>
    </g>
  </g>
  <path d="M512 378 C470 362 430 347 390 347 C330 350 280 352 250 346 C290 372 360 372 420 372 C460 376 490 384 512 378 Z" fill="#000" opacity=".16"/>
  <path d="M430 505 C520 520 660 512 798 500 L798 470 C680 486 540 492 430 505 Z" fill="#000" opacity=".14"/>
</svg>`;

window.DibuixAnimat = function(fig, src, cfg){
  cfg = Object.assign({mapS:1.7, markS:1.1, gapS:0.25, hand:false, order:'layers', underlay:4, marks:{auto:true}}, cfg || {});
  const cv = fig.querySelector('canvas'), ctx = cv.getContext('2d', {willReadFrequently:true});
  let W, H, orig, out, paper, stages = [], total = 0, raf = 0, playing = false, ready = false, t0 = 0, speed = 1, ptr = [];
  let hand = null, hx = 0, hy = 0, handSeen = false, lastPx = -1;
  const api = {play, seek, speed: 1, onstate: null, dbg: null, get playing(){ return playing; }, get ready(){ return ready; }};

  const img = new Image();
  img.onload = () => { prepare(); ready = true; ctx.putImageData(orig, 0, 0); if (api.onready) api.onready(); };
  img.src = src;

  function prepare(){
    W = cv.width = img.naturalWidth; H = cv.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    orig = ctx.getImageData(0, 0, W, H);
    const d = orig.data, N = W*H;

    // 1) Classifica cada píxel: 0 = paper, 1 = tinta, 2 = vermell (candidat a marca final)
    const bgMin = Math.min(d[0], d[1], d[2]);
    const cls = new Uint8Array(N);
    for (let i=0, p=0; i<N; i++, p+=4){
      const r=d[p], g=d[p+1], b=d[p+2];
      if (r > 110 && ((r-g > 20 && r-b > 20) || (r-g > 4 && r-b > 4 && Math.abs(g-b) < 12))) cls[i] = 2;
      else if (bgMin - Math.min(r,g,b) > 3) cls[i] = 1;
    }

    // 2) Components connexos (8 veïns). L'ordre de l'emplenat (BFS) és l'ordre en què «creix» el traç.
    const lab = new Int32Array(N).fill(-1), queue = new Int32Array(N), comps = [];
    function bfs(start, id, k){   // emplena des de start; retorna quants píxels (queden a queue[0..n))
      let head = 0, tail = 0; queue[tail++] = start; lab[start] = id;
      while (head < tail){
        const i = queue[head++], ix = i % W, iy = (i/W)|0;
        for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++){
          if (!dx && !dy) continue;
          const nx=ix+dx, ny=iy+dy; if (nx<0||ny<0||nx>=W||ny>=H) continue;
          const j = ny*W + nx;
          if (cls[j] === k && lab[j] !== id){ lab[j] = id; queue[tail++] = j; }
        }
      }
      return tail;
    }
    for (let x=0; x<W; x++) for (let y=0; y<H; y++){
      const s = y*W + x; if (!cls[s] || lab[s] >= 0) continue;
      const k = cls[s], id = comps.length*2, n = bfs(s, id, k);
      let minx=W, maxx=0, miny=H, maxy=0, sat=0, redness=0;
      for (let q=0; q<n; q++){
        const i = queue[q], ix = i % W, iy = (i/W)|0, p = i*4;
        if (ix<minx) minx=ix; if (ix>maxx) maxx=ix; if (iy<miny) miny=iy; if (iy>maxy) maxy=iy;
        sat += Math.max(d[p],d[p+1],d[p+2]) - Math.min(d[p],d[p+1],d[p+2]);
        redness += d[p] - Math.max(d[p+1],d[p+2]);
      }
      comps.push({id, k, left: s, px: queue.slice(0, n), n, minx, maxx, miny, maxy, colour: sat/n > 40, redness: redness/n});
    }
    // torna a ordenar un component començant per un píxel concret (el BFS marca amb id+1 per no confondre's amb el primer)
    function reorder(c, start){ const n = bfs(start, c.id+1, c.k); c.px = queue.slice(0, n); for (let q=0; q<n; q++) lab[c.px[q]] = c.id; }
    const nearestPx = (c, x, y) => { let best = c.px[0], bd = 1e18; for (const i of c.px){ const dx = i % W - x, dy = ((i/W)|0) - y, dd = dx*dx + dy*dy; if (dd < bd){ bd = dd; best = i; } } return [best, Math.sqrt(bd)]; };
    const ink = comps.filter(c => c.k === 1), red = comps.filter(c => c.k === 2);

    // 3) Línies verticals que separen els mapes: columnes gairebé tot negres (les fletxes les poden tallar a trossos)
    const colCnt = new Int32Array(W);
    for (let i=0; i<N; i++) if (cls[i] === 1 && d[i*4] < 100) colCnt[i % W]++;
    const groups = [];
    for (let x=0; x<W; x++) if (colCnt[x] > 0.6*H){ const g = groups[groups.length-1]; if (g && x - g.b <= 2) g.b = x; else groups.push({a:x, b:x}); }
    const groupOf = c => (c.maxx - c.minx) < 0.02*W ? groups.findIndex(g => c.minx >= g.a-3 && c.maxx <= g.b+3) : -1;
    const isDiv = c => c.k === 1 && groupOf(c) >= 0;
    const divs = groups.map((g, gi) => {
      const list = []; ink.filter(c => groupOf(c) === gi).forEach(c => c.px.forEach(i => list.push(i)));
      const px = Int32Array.from(list).sort((a,b) => ((a/W)|0) - ((b/W)|0));   // de dalt a baix
      return {px, n: px.length, minx: g.a, maxx: g.b, miny: 0, maxy: H, colour: false};
    });
    const divX = groups.map(g => (g.a + g.b)/2);
    const panelOf = c => { const cx = (c.minx + c.maxx)/2; let k = 0; while (k < divX.length && cx > divX[k]) k++; return k; };

    // 4) Marques finals (cercles i fletxes, la ruta, les creuetes). La resta de vermells són part del dibuix (teulades…)
    let marks = [], specks = [];
    const M = cfg.marks || {};
    if (M.seeds){
      for (const [sx, sy] of M.seeds){
        let best = null, bd = 16;
        for (const c of red){ if (marks.includes(c) || sx < c.minx-16 || sx > c.maxx+16 || sy < c.miny-16 || sy > c.maxy+16) continue; const dd = nearestPx(c, sx, sy)[1]; if (dd < bd){ bd = dd; best = c; } }
        if (best) marks.push(best);
      }
      // trossets solts del mateix traç (dins del requadre de la marca): s'hi ajunten
      for (const c of red){
        if (marks.includes(c) || c.n > 80) continue;
        const cx = (c.minx+c.maxx)/2, cy = (c.miny+c.maxy)/2;
        const m = marks.find(m => cx >= m.minx-5 && cx <= m.maxx+5 && cy >= m.miny-5 && cy <= m.maxy+5);
        if (m){ (m.bits = m.bits || []).push(c); c.mark = true; }
      }
    } else if (M.auto){
      const lastDiv = divX.length ? divX[divX.length-1] : W;
      const all = red.filter(c => c.redness > 60 && c.minx < lastDiv);
      marks = all.filter(c => c.n >= 60).sort((a,b) => a.minx - b.minx); specks = all.filter(c => c.n < 60);
    }
    const isMark = new Uint8Array(N);
    marks.concat(specks).forEach(c => { c.mark = true; c.px.forEach(i => isMark[i] = 1); (c.bits || []).forEach(b => b.px.forEach(i => isMark[i] = 1)); });
    red.filter(c => !c.mark).forEach(c => c.colour = true);
    // la vora clara (suavitzat) que envolta cada marca apareix amb la marca, no amb el mapa
    marks.forEach(c => {
      const halo = [];
      for (const i of c.px){
        const ix = i % W, iy = (i/W)|0;
        for (let dy=-2; dy<=2; dy++) for (let dx=-2; dx<=2; dx++){
          const nx=ix+dx, ny=iy+dy; if (nx<0||ny<0||nx>=W||ny>=H) continue;
          const j = ny*W + nx;
          if (cls[j] && !isMark[j] && Math.min(d[j*4], d[j*4+1], d[j*4+2]) > 200){ isMark[j] = 1; halo.push(j); }
        }
      }
      c.halo = halo;
    });

    // punt d'inici de cada traç: un extrem de la línia (el píxel més llunyà del de més a l'esquerra)
    comps.forEach(c => { if (!c.mark && !isDiv(c) && c.n > 8) reorder(c, c.px[c.n-1]); });
    marks.forEach(c => {
      if (M.start === 'left' || M.auto) return;                       // ja comença pel punt de més a l'esquerra
      if (Array.isArray(M.start)) reorder(c, nearestPx(c, M.start[0], M.start[1])[0]);
      else if (c.n > 8) reorder(c, c.px[c.n-1]);
    });

    // 5) Sota les marques: es reconstrueix el traç que tapen (carretera, costa, línia) estenent el color veí uns quants píxels
    const base = new Uint8ClampedArray(d), root = new Int32Array(N).fill(-1), dist = new Uint8Array(N);
    { let head = 0, tail = 0;
      for (let i=0; i<N; i++) if (cls[i] && !isMark[i] && Math.min(d[i*4], d[i*4+1], d[i*4+2]) < 200){   // només tinta de debò
        const ix = i % W, iy = (i/W)|0;
        if ((ix>0 && isMark[i-1]) || (ix<W-1 && isMark[i+1]) || (iy>0 && isMark[i-W]) || (iy<H-1 && isMark[i+W])){ root[i] = i; queue[tail++] = i; }
      }
      while (head < tail){
        const i = queue[head++], ix = i % W, iy = (i/W)|0; if (dist[i] >= cfg.underlay) continue;
        for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
          const nx=ix+dx, ny=iy+dy; if (nx<0||ny<0||nx>=W||ny>=H) continue;
          const j = ny*W + nx; if (!isMark[j] || root[j] >= 0) continue;
          root[j] = root[i]; dist[j] = dist[i]+1; const r = root[i]*4;
          base[j*4]=d[r]; base[j*4+1]=d[r+1]; base[j*4+2]=d[r+2]; queue[tail++] = j;
        }
      }
    }

    // 6) Escenes: un mapa darrere l'altre i, al final, les marques
    stages = [];
    const nP = divX.length + 1, bigN = cfg.order === 'near' ? 0.003*N : 400;
    for (let k=0; k<nP; k++){
      const mine = comps.filter(c => !c.mark && !isDiv(c) && panelOf(c) === k);
      let list;
      if (cfg.order === 'near'){   // traços grans (carreteres, costa) i després sempre el traç més proper a l'anterior
        const big = mine.filter(c => c.n > bigN).sort((a,b) => b.n - a.n), rest = mine.filter(c => c.n <= bigN);
        const cxy = c => [(c.minx+c.maxx)/2, (c.miny+c.maxy)/2];
        let cur = rest.reduce((a,c) => (!a || c.minx+c.miny < a.minx+a.miny) ? c : a, null); const chain = [];
        while (cur){
          chain.push(cur); rest.splice(rest.indexOf(cur), 1);
          const [x0,y0] = cxy(cur); let bd = 1e18, nx = null;
          for (const c of rest){ const [x1,y1] = cxy(c), dd = (x1-x0)**2 + (y1-y0)**2; if (dd < bd){ bd = dd; nx = c; } }
          cur = nx;
        }
        list = big.concat(chain);
      } else {
        const big = mine.filter(c => !c.colour && c.n > bigN).sort((a,b) => b.n - a.n);
        const small = mine.filter(c => !c.colour && c.n <= bigN).sort((a,b) => a.minx - b.minx);
        list = big.concat(small, mine.filter(c => c.colour).sort((a,b) => a.minx - b.minx));
      }
      if (k > 0) list.unshift(divs[k-1]);
      stages.push(makeStage(list, cfg.mapS, base, isMark));
    }
    // els píxels reconstruïts apareixen alhora que el traç del qual copien el color
    { const tmAll = new Float32Array(N).fill(-1), stOf = new Int16Array(N).fill(-1);
      stages.forEach((s, k) => { for (let q=0; q<s.px.length; q++){ tmAll[s.px[q]] = s.tm[q]; stOf[s.px[q]] = k; } });
      const extra = stages.map(() => []);
      for (let j=0; j<N; j++) if (isMark[j] && root[j] >= 0 && stOf[root[j]] >= 0) extra[stOf[root[j]]].push(j);
      stages.forEach((s, k) => {
        if (!extra[k].length) return;
        const n = s.px.length + extra[k].length, px = new Int32Array(n), tm = new Float32Array(n);
        px.set(s.px); tm.set(s.tm); extra[k].forEach((j, q) => { px[s.px.length+q] = j; tm[s.px.length+q] = tmAll[root[j]]; });
        const ord = Array.from({length:n}, (_, q) => q).sort((a,b) => tm[a] - tm[b]);
        s.px = Int32Array.from(ord, q => px[q]); s.tm = Float32Array.from(ord, q => tm[q]);
      });
    }
    marks.forEach(c => { const add = c.halo.slice(); (c.bits || []).forEach(b => b.px.forEach(i => add.push(i))); if (add.length){ const px = new Int32Array(c.n + add.length); px.set(c.px); px.set(add, c.n); c.px = px; c.n = px.length; } });
    marks.forEach((c, i) => stages.push(makeStage(i === marks.length-1 ? [c].concat(specks) : [c], cfg.markS, d)));
    let t = 0; stages.forEach(s => { s.start = t; t += s.dur + cfg.gapS; });
    total = t - cfg.gapS;

    // 7) Paper: la imatge sense tinta. Cada píxel de tinta agafa el color del paper més proper (així no queden ombres)
    out = new ImageData(new Uint8ClampedArray(d), W, H);
    const o = out.data, done = new Uint8Array(N);
    let head = 0, tail = 0;
    for (let i=0; i<N; i++) if (!cls[i]){ done[i] = 1; queue[tail++] = i; }
    while (head < tail){
      const i = queue[head++], ix = i % W, iy = (i/W)|0;
      for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=ix+dx, ny=iy+dy; if (nx<0||ny<0||nx>=W||ny>=H) continue;
        const j = ny*W + nx; if (done[j]) continue;
        done[j] = 1; o[j*4]=o[i*4]; o[j*4+1]=o[i*4+1]; o[j*4+2]=o[i*4+2]; o[j*4+3]=255; queue[tail++] = j;
      }
    }
    paper = new Uint8ClampedArray(o);
    api.dbg = {W, H, comps: comps.length, marks: marks.map(c => [c.n, c.minx, c.miny, c.maxx, c.maxy]), divX, stages: stages.map(s => [s.px.length, +s.start.toFixed(2)]), total};

    if (cfg.hand){
      hand = document.createElement('div'); hand.className = 'da-hand'; hand.innerHTML = HAND_SVG;
      hand.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;opacity:0;transition:opacity .35s;will-change:transform;-webkit-mask-image:linear-gradient(90deg,#000 84%,transparent 100%);mask-image:linear-gradient(90deg,#000 84%,transparent 100%)';
      cv.parentNode.style.position = 'relative'; cv.parentNode.appendChild(hand);
    }
  }

  // Una escena = llista de píxels en ordre de dibuix + l'instant (0..1) en què apareix cadascun.
  // El temps de cada traç creix amb la seva mida, però suavitzat, perquè els traços petits no surtin de cop.
  function makeStage(list, dur, src, skip){
    const n = list.reduce((a,c) => a + c.n, 0); let px = new Int32Array(n), tm = new Float32Array(n);
    const wsum = list.reduce((a,c) => a + Math.pow(c.n, 0.6), 0);
    let k = 0, acc = 0;
    for (const c of list){
      const w = Math.pow(c.n, 0.6) / wsum;
      for (let i=0; i<c.n; i++){ if (skip && skip[c.px[i]]) continue; px[k] = c.px[i]; tm[k] = acc + w * (i+1)/c.n; k++; }
      acc += w;
    }
    if (k < n){ px = px.slice(0, k); tm = tm.slice(0, k); }
    return {px, tm, dur, src};
  }

  function placeHand(){
    const sc = cv.clientWidth / W, S = Math.max(130, Math.min(260, cv.clientWidth * 0.42));
    hand.style.width = S + 'px';
    hand.style.transform = `translate(${hx*sc - S*88/925}px, ${hy*sc - S*440/925}px)`;   // la punta del llapis és al (88,440) del viewBox
  }
  function state(s){ if (api.onstate) api.onstate(s); }
  function reset(){ out.data.set(paper); ptr = stages.map(() => 0); handSeen = false; }
  function finish(){ cancelAnimationFrame(raf); playing = false; ctx.putImageData(orig, 0, 0); if (hand) hand.style.opacity = 0; state('done'); }

  // avança fins a l'instant t; retorna el píxel revelat més proper a la mà (o -1)
  function advance(t){
    const o = out.data; let target = -1, bd = 1e18; lastPx = -1;
    stages.forEach((s, k) => {
      if (t < s.start) return;
      const p = Math.min(1, (t - s.start) / s.dur);
      let i = ptr[k]; const n = s.px.length, d = s.src;
      while (i < n && s.tm[i] <= p){
        const j = s.px[i], q = j*4; o[q]=d[q]; o[q+1]=d[q+1]; o[q+2]=d[q+2]; o[q+3]=d[q+3];
        lastPx = j;
        if (hand){ const dx = j % W - hx, dy = ((j/W)|0) - hy, dd = dx*dx + dy*dy; if (dd < bd){ bd = dd; target = j; } }
        i++;
      }
      ptr[k] = i;
    });
    return target;
  }
  function moveHand(target, snap){
    if (!hand || target < 0) return;
    const tx = target % W, ty = (target/W)|0;
    if (!handSeen || snap){ hx = tx; hy = ty; handSeen = true; hand.style.opacity = 1; }
    else { hx += (tx - hx) * 0.45; hy += (ty - hy) * 0.45; }
    placeHand();
  }

  function play(){
    if (!ready) return;
    cancelAnimationFrame(raf);
    if (matchMedia('(prefers-reduced-motion:reduce)').matches){ finish(); return; }
    reset(); playing = true; t0 = performance.now(); speed = api.speed || 1; state('playing');
    raf = requestAnimationFrame(frame);
  }
  function frame(now){
    const t = (now - t0) / 1000 * speed;
    moveHand(advance(t));
    ctx.putImageData(out, 0, 0);
    if (t >= total){ if (hand) hand.style.opacity = 0; raf = 0; setTimeout(() => { if (playing && !raf) finish(); }, hand ? 380 : 0); return; }
    raf = requestAnimationFrame(frame);
  }
  // per a proves: mostra l'estat a l'instant t (segons) sense animar
  function seek(t){ if (!ready) return; cancelAnimationFrame(raf); playing = false; reset(); advance(t); moveHand(t < total ? lastPx : -1, true); if (hand && t >= total) hand.style.opacity = 0; ctx.putImageData(out, 0, 0); }

  return api;
};
})();

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

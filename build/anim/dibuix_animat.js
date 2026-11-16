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
    if (!api.force && matchMedia('(prefers-reduced-motion:reduce)').matches){ finish(); return; }
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

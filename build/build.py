"""Genera web/index.html a partir dels dos .docx (ja descomprimits) i del template.

Ús: python build.py <dir_ca_descomprimit> <dir_en_descomprimit>
"""
import sys, re, html, json, csv, os
import xml.etree.ElementTree as ET

NS = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'm': 'http://schemas.openxmlformats.org/officeDocument/2006/math',
}
W = '{%s}' % NS['w']
M = '{%s}' % NS['m']
here = os.path.dirname(os.path.abspath(__file__))
web = os.path.dirname(here)

LINKS = {
    'lognormal': 'https://ideas.repec.org/a/bla/jorssc/v6y1957i3p228-230.html',
    'gamma': 'https://ideas.repec.org/p/pra/mprapa/69648.html',
    'ine': 'https://ine.es/dyngs/INEbase/en/operacion.htm?c=Estadistica_C&cid=1254736177088&menu=resultados&idp=1254735976608',
}

IMG_MAP = {  # target del docx -> fitxer web (per idioma)
    'ca': {'media/image7.png': 'img/fig7_ca.png', 'media/image9.png': 'img/fig9_ca.png'},
    'en': {'media/image7.emf': 'img/fig7_en.png', 'media/image9.emf': 'img/fig9_en.png'},
}
ALT = {
    'ca': {'img/fig7_ca.png': "Matriu d'errors d'estimació de la renda: files amb la distribució real, columnes amb la distribució estimada",
           'img/fig9_ca.png': 'Taula comparativa de l\'ajust Dagum vs. Pareto IV per als 10 primers municipis de Catalunya'},
    'en': {'img/fig7_en.png': 'Income estimation error matrix: rows show the true distribution, columns the fitted distribution',
           'img/fig9_en.png': 'Fit comparison table, Dagum vs. Pareto IV, for the first 10 municipalities of Catalonia'},
}


# amplada d'cada figura al Word (EMU); 5.73M = amplada completa del text
EMU = {'fig1': 5368925, 'fig2': 5728800, 'fig3': 3033905, 'fig4': 3044476, 'fig5': 1804702, 'fig6': 5713730,
       'fig7_ca': 3777834, 'fig7_en': 3554453, 'fig8': 5718810, 'fig9_ca': 5400040, 'fig9_en': 5731510,
       'fig10': 5465356, 'fig11': 5723761, 'fig15': 5391150}
BASE_PX = 620


def fig_width(u):
    k = re.search(r'img/(fig\w+?)\.(?:png|jpeg)', u).group(1)
    return max(260, round(EMU[k] / 5728800 * BASE_PX)) if k in EMU else None


RIBA_REF = '— Konstandinos Kavafis, «Ítaca», traducció de Carles Riba, a <em>Poemes</em>, vol. II, Curial, Barcelona, 1977, p. 71-73.'


def load_riba():
    """Versos de Carles Riba (build/riba.txt): dos blocs separats per una línia '---'. Si no hi és, es manté l'original."""
    p = os.path.join(here, 'riba.txt')
    if not os.path.exists(p):
        return None
    blocks = [b.strip() for b in re.split(r'^---\s*$', open(p, encoding='utf8').read(), flags=re.M) if b.strip()]
    return blocks if len(blocks) == 2 else None


def esc(s):
    return html.escape(s, quote=False)


# ---------- fórmules ----------
def latex_for(txt, lang, state):
    t = re.sub(r'\s+', '', txt)
    ind = 'indicadors' if lang == 'ca' else 'indicators'
    fr = 'frontera' if lang == 'ca' else 'boundary'
    L = r'L_{\text{%s}}' % ind
    P = r'P_{\text{%s}}' % fr
    if t.startswith('Ltotal'):
        return r'L_{\text{total}}(\theta)=%s(x(\theta))+%s(x(\theta))' % (L, P)
    if t.startswith('θ∈'):
        return r'\theta\in\mathbb{R}^{K}'
    if t == 'x(θ)':
        return r'x(\theta)'
    if t.startswith('Lindicadorsx=') or t.startswith('Lindicatorsx='):
        return r'%s(x)=\sum_{j=1}^{J} w_j\cdot\left(\frac{\hat I_j(x)-I_j}{I_j+\epsilon}\right)^{2}' % L
    if t.startswith('Pfronterax=') or t.startswith('Pboundaryx='):
        return (r'%s(x)=\lambda\cdot\sum_{k=1}^{K}\left[\left(\frac{\max(0,\,lb_k-x_k)}{ub_k-lb_k}\right)^{2}'
                r'+\left(\frac{\max(0,\,x_k-ub_k)}{ub_k-lb_k}\right)^{2}\right]' % P)
    if t in ('Pfrontera', 'Pboundary'):
        return P
    if t in ('Lindicadors', 'Lindicators'):
        return L
    if t == 'wj':
        return 'w_j'
    if t == 'Ij':
        state['ij'] = state.get('ij', 0) + 1
        return 'I_j' if state['ij'] % 2 == 1 else r'\hat I_j'
    if t == 'ϵ':
        return r'\epsilon'
    if t == 'λ':
        return r'\lambda'
    if t == 'lbk':
        return 'lb_k'
    if t == 'ubk':
        return 'ub_k'
    if t == 'xk':
        return 'x_k'
    if t.startswith('wGini'):
        return r'w_{\text{Gini}}=0'
    raise ValueError('fórmula desconeguda: %r' % txt)


# ---------- conversió inline ----------
def load(d):
    rels = ET.parse(d + '/word/_rels/document.xml.rels').getroot()
    rm = {r.get('Id'): r.get('Target') for r in rels}
    body = ET.parse(d + '/word/document.xml').getroot().find('w:body', NS)
    fn = {}
    try:
        for f in ET.parse(d + '/word/footnotes.xml').getroot():
            i = f.get(W + 'id')
            txt = ''.join(t.text or '' for t in f.iter(W + 't')).strip()
            if txt:
                fn[i] = re.sub(r'\s+', ' ', txt)
    except FileNotFoundError:
        pass
    return rm, body, fn


def run_html(r, rm, lang, state, imgs):
    out = ''
    rpr = r.find('w:rPr', NS)
    bold = ital = False
    va = None
    if rpr is not None:
        b = rpr.find('w:b', NS)
        bold = b is not None and b.get(W + 'val') not in ('0', 'false')
        i = rpr.find('w:i', NS)
        ital = i is not None and i.get(W + 'val') not in ('0', 'false')
        v = rpr.find('w:vertAlign', NS)
        va = v.get(W + 'val') if v is not None else None
    for el in r:
        t = el.tag
        if t == W + 't':
            out += esc(el.text or '')
        elif t == W + 'tab':
            out += ' '
        elif t == W + 'br':
            out += '<br>'
        elif t == W + 'footnoteReference':
            out += '<sup class="fnref"><a href="#fn%s" id="fnr%s">%s</a></sup>' % (el.get(W + 'id'), el.get(W + 'id'), el.get(W + 'id'))
            state['fn'].append(el.get(W + 'id'))
        elif t == W + 'drawing':
            for bl in el.iter('{%s}blip' % NS['a']):
                tgt = rm[bl.get('{%s}embed' % NS['r'])]
                imgs.append(IMG_MAP[lang].get(tgt) or 'img/fig%s.%s' % re.match(r'media/image(\d+)\.(\w+)', tgt).groups())
    if not out:
        return ''
    if va == 'superscript':
        out = '<sup>%s</sup>' % out
    elif va == 'subscript':
        out = '<sub>%s</sub>' % out
    if bold:
        out = '<strong>%s</strong>' % out
    if ital:
        out = '<em>%s</em>' % out
    return out


def para(p, rm, lang, state):
    """Retorna (html_inline, imatges, text_pla, només_fórmula)."""
    out, imgs, math_only, others = '', [], False, False
    nmath = 0

    def add_math(el):
        nonlocal nmath
        txt = ''.join(x.text or '' for x in el.iter(M + 't'))
        nmath += 1
        return txt

    def walk(parent):
        nonlocal out, others
        for ch in parent:
            if ch.tag == W + 'r':
                h = run_html(ch, rm, lang, state, imgs)
                if h:
                    out += h
                    if re.sub(r'<[^>]+>', '', h).strip():
                        others = True
            elif ch.tag == W + 'hyperlink':
                inner = ''
                for r in ch.findall('w:r', NS):
                    inner += run_html(r, rm, lang, state, imgs)
                url = rm.get(ch.get('{%s}id' % NS['r']), '')
                out += '<a href="%s" target="_blank" rel="noopener">%s</a>' % (html.escape(url.replace('&amp;', '&')), inner)
                others = True
            elif ch.tag == M + 'oMath':
                tex = latex_for(add_math(ch), lang, state)
                out += '\\(%s\\)' % tex
            elif ch.tag == M + 'oMathPara':
                walk(ch)

    walk(p)
    plain = re.sub(r'<[^>]+>', '', out).strip()
    if nmath == 1 and not others and not imgs:
        math_only = True
    return out, imgs, plain, math_only


def process(lang, d):
    rm, body, fns = load(d)
    state = {'fn': []}
    items = []  # (kind, payload)
    for ch in body:
        if ch.tag == W + 'tbl':
            rows = []
            for tr in ch.iter(W + 'tr'):
                for tc in tr.iter(W + 'tc'):
                    rows.append(re.sub(r'\s+', ' ', ''.join(t.text or '' for t in tc.iter(W + 't'))).strip())
            items.append(('list', rows))
            continue
        if ch.tag != W + 'p':
            continue
        st = ch.find('w:pPr/w:pStyle', NS)
        style = st.get(W + 'val') if st is not None else ''
        isnum = ch.find('w:pPr/w:numPr', NS) is not None
        h, imgs, plain, math_only = para(ch, rm, lang, state)
        if imgs and plain.startswith('Ramon'):
            h = ''
            plain = ''
        for im in imgs:
            items.append(('img', im))
        if math_only:
            items.append(('math', h.replace('\\(', '\\[').replace('\\)', '\\]')))
            continue
        if not plain:
            continue
        # el text de les fórmules compta com a text, i aquí no cal filtrar res més
        items.append((style, h, isnum))
    return items, fns, state['fn']


RIBA = load_riba()


def render(lang, items, fns, fnrefs):
    # Seccions: 0 = introducció, després una per cada h2
    def kind(it):
        if it[0] in ('img', 'math', 'list'):
            return it[0]
        return 'p'

    sections = []  # dict(title, html)
    cur = {'title': None, 'out': [], 'fns': []}
    pending_fig = None
    out = cur['out']
    i = 0
    n = len(items)
    title = sub = ''
    h2_styles = {'Subttol', 'Ttol3', 'Ttol5'} if lang == 'ca' else {'Ttol2'}
    h3_styles = {'Ttol4'} if lang == 'ca' else {'Ttol3'}
    ca_h3_extra = {'La selecció final'}
    seen_title = 0
    state_poem = [0]
    quote_starts = ('As you set out', 'Ithaka gave you') if lang == 'en' else ('As you set out', 'Ithaka gave you')

    def figure(imgs, cap):
        if cap:
            cap = esc(html.unescape(re.sub(r'<[^>]+>', '', cap)).strip())
        if len(imgs) > 1:
            body_ = ''.join('<img src="%s" loading="lazy" alt="%s">' % (u, cap or '') for u in imgs)
            return '<figure class="fig fig-row">%s%s</figure>' % (body_, '<figcaption>%s</figcaption>' % cap if cap else '')
        u = imgs[0]
        alt = ALT[lang].get(u, cap or '')
        cls = 'fig fig-table' if re.search(r'fig(7|9|15)', u) else 'fig'
        return '<figure class="%s" style="max-width:%spx"><img src="%s" loading="lazy" alt="%s">%s</figure>' % (
            cls, fig_width(u), u, html.escape(alt), '<figcaption>%s</figcaption>' % cap if cap else '')

    def flush_fns(sec_html_refs):
        s = ''
        for r in sec_html_refs:
            if r in fns:
                s += '<li id="fn%s">%s <a href="#fnr%s" class="back" aria-label="↩">↩</a></li>' % (r, esc(fns[r]), r)
        return '<aside class="footnotes"><ol start="%s">%s</ol></aside>' % (sec_html_refs[0], s) if s else ''

    sec_refs = []
    while i < n:
        it = items[i]
        k = kind(it)
        if k == 'p':
            style, h, isnum = it
            plain = re.sub(r'<[^>]+>', '', h).strip()
            if style == 'Ttol1':
                title = plain
                i += 1
                continue
            if style == 'Ttol2' and lang == 'ca':
                sub = plain
                i += 1
                continue
            if lang == 'en' and style == 'Ttol2' and not sub and not sections and cur['title'] is None and not any(o for o in out):
                sub = plain
                i += 1
                continue
            if style in h2_styles and not (lang == 'ca' and plain in ca_h3_extra):
                if cur['title'] is None:
                    cur['title'] = 'intro'
                cur['html'] = ''.join(out) + flush_fns(sec_refs)
                sections.append(cur)
                cur = {'title': plain, 'out': []}
                out = cur['out']
                sec_refs = []
                i += 1
                continue
            if style in h3_styles or (lang == 'ca' and plain in ca_h3_extra):
                out.append('<h3>%s</h3>' % h)
                i += 1
                continue
            # cites / poema
            if plain.startswith(quote_starts):
                stanzas = [h]
                cite = ''
                while i + 1 < n and kind(items[i + 1]) == 'p':
                    nxt = items[i + 1][1]
                    i += 1
                    if re.sub(r'<[^>]+>', '', nxt).strip().startswith('—'):
                        cite = nxt
                        break
                    stanzas.append(nxt)
                if lang == 'ca' and RIBA:
                    stanzas = ['<br>'.join(esc(l.strip()) for l in st.splitlines()) for st in re.split(r'\n\s*\n', RIBA[state_poem[0]])]
                    cite = RIBA_REF
                    state_poem[0] += 1
                out.append('<blockquote class="poem">%s%s</blockquote>' % (
                    ''.join('<p>%s</p>' % x for x in stanzas), '<footer>%s</footer>' % cite if cite else ''))
                i += 1
                continue
            if isnum:
                lis = []
                while i < n and kind(items[i]) == 'p' and items[i][2]:
                    lis.append('<li>%s</li>' % re.sub(r'^•\s*', '', items[i][1]))
                    i += 1
                out.append('<ul>%s</ul>' % ''.join(lis))
                continue
            if plain.endswith(':') and False:
                pass
            cls = ''
            out.append('<p%s>%s</p>' % (cls, h))
            for m_ in re.findall(r'id="fnr(\d+)"', h):
                sec_refs.append(m_)
            i += 1
            continue
        if k == 'img':
            imgs = [it[1]]
            j = i + 1
            while j < n and items[j][0] == 'img':
                imgs.append(items[j][1])
                j += 1
            cap = ''
            if j < n and kind(items[j]) == 'p' and re.match(r'(Imatge creada|Image created)', re.sub(r'<[^>]+>', '', items[j][1]).strip()):
                cap = items[j][1]
                j += 1
            out.append(figure(imgs, cap))
            i = j
            continue
        if k == 'math':
            out.append('<div class="eq">%s</div>' % it[1])
            i += 1
            continue
        if k == 'list':
            out.append('<ul class="grid-list">%s</ul>' % ''.join('<li>%s</li>' % esc(r) for r in it[1]))
            i += 1
            continue
    cur['html'] = ''.join(out) + flush_fns(sec_refs)
    sections.append(cur)
    return title, sub, sections


def linkify(h, lang):
    if lang == 'ca':
        h = h.replace('“The Odyssey”', '“L’Odissea”')
    h = h.replace('scale i shape a la Pareto IV)', 'scale, shape i inequality a la Pareto IV)')
    h = h.replace('scale and shape in Pareto IV)', 'scale, shape and inequality in Pareto IV)')
    if lang == 'ca':
        h = h.replace('“The Lognormal Distribution with Special Reference to its Uses in Economics”',
                      '<a href="%s" target="_blank" rel="noopener">“The Lognormal Distribution with Special Reference to its Uses in Economics”</a>' % LINKS['lognormal'])
        h = h.replace('“Measuring poverty with the Foster, Greer and Thorbecke indexes based on the Gamma distribution”',
                      '<a href="%s" target="_blank" rel="noopener">“Measuring poverty with the Foster, Greer and Thorbecke indexes based on the Gamma distribution”</a>' % LINKS['gamma'])
        if 'trobareu aquí' in h and 'href' not in h.split('trobareu')[1][:40]:
            h = h.replace('trobareu aquí', 'trobareu <a href="%s" target="_blank" rel="noopener">aquí</a>' % LINKS['ine'])
    return h


def main():
    dca, den = sys.argv[1], sys.argv[2]
    data = {}
    for lang, d in (('ca', dca), ('en', den)):
        items, fns, refs = process(lang, d)
        title, sub, secs = render(lang, items, fns, refs)
        for s in secs:
            s.pop('out', None)
            s['html'] = re.sub(r'\\\)(?=[A-Za-zÀ-ÿ])', lambda m: '\\) ', linkify(s['html'], lang))
        data[lang] = {'title': title, 'sub': sub, 'sections': secs}
    for l in data:
        print(l, data[l]['title'], '|', data[l]['sub'])
        for s in data[l]['sections']:
            print('   ', s['title'], len(s['html']))
    assert len(data['ca']['sections']) == len(data['en']['sections'])
    json.dump(data, open(os.path.join(here, 'content.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)


if __name__ == '__main__' and len(sys.argv) > 2:
    main()


def write_html():
    """Insereix contingut + dades dels municipis dins del template."""
    data = json.load(open(os.path.join(here, 'content.json'), encoding='utf8'))
    rows = {}
    for key, fn in (('d', 'parametres_dagum_municipis.csv'), ('p', 'parametres_paretoIV_municipis.csv')):
        for r in csv.DictReader(open(os.path.join(web, 'data', fn), encoding='utf8')):
            rows.setdefault(r['codi_mun'], {'c': r['codi_mun'], 'n': r['nom_mun']})
            if key == 'd':
                rows[r['codi_mun']]['d'] = [float(r['shape1']), float(r['shape2']), float(r['scale']), float(r['mean_abs_pp'])]
            else:
                rows[r['codi_mun']]['p'] = [float(r['scale']), float(r['shape']), float(r['inequality']), float(r['mean_abs_pp'])]
            rows[r['codi_mun']]['h' + key] = r['hit_bounds'] == 'TRUE'
    muns = sorted(rows.values(), key=lambda x: x['n'])
    tpl = open(os.path.join(here, 'template.html'), encoding='utf8').read()
    out = tpl.replace('/*__ARTICLE__*/null', json.dumps(data, ensure_ascii=False)).replace(
        '/*__MUNS__*/null', json.dumps(muns, ensure_ascii=False, separators=(',', ':')))
    open(os.path.join(web, 'index.html'), 'w', encoding='utf8').write(out)
    print('index.html', len(out) // 1024, 'KB')


if __name__ == '__main__' and len(sys.argv) > 1 and sys.argv[1] == '--html':
    write_html()

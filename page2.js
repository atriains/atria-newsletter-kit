/*
 * Flexible page 2 for Atria newsletters.
 * The issue JSON may include "page2": an array of rows. Each row is one
 * block or an array of blocks laid side by side. Block widths: "full"
 * (default), "half", "wide" (2/3), "narrow" (1/3); a row's widths must add
 * to one page width. Rows stack top to bottom; each row is as tall as its
 * tallest block. The build fails with a clear message if page 2 overflows.
 *
 * Block types (all keep the same tiles, colors, fonts, chips, and numbered
 * tabs as the fixed layouts):
 *   story     persona timeline + meter (full width)       { title, initial, introBold, intro, timeline[2-4], meter? }
 *   stats     2-3 big-number tiles                         { items:[{label,value,desc}] }
 *   callout   amber "heads up" box with icon items        { title, items:[{icon,title,body}] (2-4) }
 *   checklist dark box with check steps                    { title, steps:[{bold,text}] (3-6) }
 *   contact   white contact card (required, once)          { title, body }
 *   mythfact  myth vs fact rows                            { title, rows:[{myth,fact}] (2-4) }
 *   compare   comparison table                             { title, columns:[...], rows:[[...]] (2-6) }
 *   qa        questions and answers                        { title, items:[{q,a}] (2-4) }
 *   cards     2-4 icon cards                               { title?, cards:[{icon,label,title,body}] }
 *   text      short article section                        { title, paragraphs:[...] }
 */
module.exports = function makePage2(ctx) {
  const { pres, P, C, icon, consts } = ctx;
  const { WHITE, AMBER, AMBER_T, AMBER_D, NUM } = consts;
  const X0 = 0.5, FULL = 7.5, GAP = 0.2, TOP = 0.5, BOTTOM = 10.45, PAD = 0.3;
  const WIDTHS = { full: 1, half: 0.5, wide: 2 / 3, narrow: 1 / 3 };

  // rough text height (inches) for Segoe UI at font size fs in box width w
  const lines = (t, w, fs) => String(t || '').split('\n').reduce((n, p) => n + Math.max(1, Math.ceil(p.length / Math.max(1, (w * 72) / (0.47 * fs)))), 0);
  const th = (t, w, fs, ls = 1.15) => lines(t, w, fs) * fs * ls * 1.12 / 72;
  const HEAD = 0.86; // numbered tab row

  const T = {
    story: {
      h: (b, w) => 0.82 + Math.max(0.5, th(b.introBold + ' ' + b.intro, w - 1.0, 10.5)) + 1.85 + (b.meter ? 0.62 : 0) + 0.15,
      draw: async (s, b, x, y, w, h, n) => {
        const { tx, rr, rect } = C;
        if (n) C.tab(s, x + PAD, y + 0.28, n, b.title, { w: w - 1.2 });
        let yy = y + 0.82;
        s.addShape(pres.shapes.OVAL, { x: x + PAD, y: yy, w: 0.42, h: 0.42, fill: { color: AMBER }, line: { type: 'none' }, objectName: 'Avatar' });
        tx(s, b.initial || 'A', { x: x + PAD, y: yy, w: 0.42, h: 0.42, fontFace: NUM, fontSize: 16, bold: true, color: P.dark, align: 'center', valign: 'middle' });
        const ih = Math.max(0.5, th(b.introBold + ' ' + b.intro, w - 1.0, 10.5));
        tx(s, [{ text: b.introBold + ' ', options: { bold: true, color: P.dark } }, { text: b.intro }], { x: x + 0.85, y: yy - 0.02, w: w - 1.15, h: ih, fontSize: 10.5, valign: 'middle', lineSpacingMultiple: 1.05 });
        yy += ih + 0.2;
        const tl = b.timeline.slice(0, 4), cw = (w - 2 * PAD) / tl.length;
        s.addShape(pres.shapes.LINE, { x: x + PAD + 0.08, y: yy + 0.09, w: w - 2 * PAD - 0.2, h: 0, line: { color: P.pale, width: 2 }, objectName: 'Timeline' });
        tl.forEach((t, i) => {
          const tx0 = x + PAD + i * cw, last = i === tl.length - 1;
          s.addShape(pres.shapes.OVAL, { x: tx0, y: yy, w: 0.18, h: 0.18, fill: { color: last ? AMBER : P.mid }, line: { color: WHITE, width: 2 }, objectName: 'TDot' + i });
          tx(s, t.when.toUpperCase(), { x: tx0, y: yy + 0.29, w: cw - 0.15, h: 0.2, fontSize: 8.5, bold: true, color: P.mid, charSpacing: 1.5 });
          tx(s, t.amount, { x: tx0, y: yy + 0.49, w: cw - 0.1, h: 0.5, fontFace: NUM, fontSize: 27, bold: true, color: last ? AMBER_D : P.dark });
          tx(s, t.event, { x: tx0, y: yy + 1.0, w: cw - 0.1, h: 0.24, fontSize: 10, bold: true, color: P.dark });
          tx(s, t.detail, { x: tx0, y: yy + 1.25, w: cw - 0.15, h: 0.55, fontSize: 9 });
        });
        yy += 1.85;
        const m = b.meter; if (!m) return;
        tx(s, m.label.toUpperCase(), { x: x + PAD, y: yy, w: (w - 2 * PAD) / 2, h: 0.18, fontSize: 8, bold: true, color: P.mid, charSpacing: 1.5 });
        tx(s, (m.maxLabel || '').toUpperCase(), { x: x + w / 2, y: yy, w: w / 2 - PAD, h: 0.18, fontSize: 8, bold: true, color: AMBER_D, charSpacing: 1.5, align: 'right' });
        const bx = x + PAD, bw = w - 2 * PAD, by = yy + 0.23, bh = 0.26, cols = [P.accent, P.mid, P.dark];
        rr(s, { x: bx, y: by, w: bw, h: bh, rectRadius: 0.13, fill: { color: P.tint } }, 'Meter-track');
        let cx = bx; m.segments.forEach((sg, i) => { const sw = Math.max(bw * sg.value / m.max, 0.06); rect(s, { x: cx, y: by, w: sw, h: bh, fill: { color: cols[i % 3] } }, 'Meter' + i);
          if (sg.label) tx(s, sg.label, { x: cx + 0.1, y: by, w: Math.max(sw - 0.2, 0.5), h: bh, fontSize: 8.5, bold: true, color: WHITE, valign: 'middle', align: i === m.segments.length - 1 ? 'right' : 'left' }); cx += sw; });
      }, tile: WHITE, numbered: true,
    },
    stats: {
      h: () => 1.25,
      draw: async (s, b, x, y, w, h) => {
        const it = b.items.slice(0, 3), gw = (w - GAP * (it.length - 1)) / it.length, fills = [P.dark, P.mid, P.chipDark];
        it.forEach((sv, i) => {
          const sx = x + i * (gw + GAP);
          C.rr(s, { x: sx, y, w: gw, h, rectRadius: 0.2, fill: { color: fills[i] } }, 'Stat' + i);
          C.tx(s, sv.label, { x: sx + 0.3, y: y + 0.18, w: gw - 0.5, h: 0.24, fontSize: 10.5, bold: true, color: i ? P.pale : P.accent });
          const vw = Math.min(1.9, gw * 0.52);
          C.tx(s, sv.value, { x: sx + 0.3, y: y + 0.47, w: vw, h: 0.6, fontFace: NUM, fontSize: gw < 2.6 ? 26 : 32, bold: true, color: WHITE, valign: 'middle' });
          C.tx(s, sv.desc, { x: sx + 0.3 + vw, y: y + 0.47, w: gw - vw - 0.45, h: 0.6, fontSize: 9.5, color: WHITE, valign: 'middle' });
        });
      }, tile: null,
    },
    callout: {
      h: (b, w) => { const it = b.items.slice(0, 4), per = it.length === 4 ? 2 : it.length, cw = (w - 2 * PAD - 0.2 * (per - 1)) / per;
        const rows = Math.ceil(it.length / per), bh = Math.max(...it.map(i => th(i.body, cw, 9)));
        return HEAD + rows * (0.5 + bh + 0.1) + 0.15; },
      draw: async (s, b, x, y, w, h, n) => {
        C.tab(s, x + PAD, y + 0.28, n, b.title, { w: w - 1.2 });
        const it = b.items.slice(0, 4), per = it.length === 4 ? 2 : it.length, cw = (w - 2 * PAD - 0.2 * (per - 1)) / per;
        const bh = Math.max(...it.map(i => th(i.body, cw, 9)));
        for (let i = 0; i < it.length; i++) {
          const cx = x + PAD + (i % per) * (cw + 0.2), cy = y + HEAD + 0.05 + Math.floor(i / per) * (0.5 + bh + 0.1);
          await C.chip(s, cx, cy, 0.4, it[i].icon, WHITE, 'B07A10', 'CO' + i);
          C.tx(s, it[i].title, { x: cx + 0.5, y: cy, w: cw - 0.5, h: 0.4, fontSize: 10, bold: true, color: P.dark, valign: 'middle' });
          C.tx(s, it[i].body, { x: cx, y: cy + 0.46, w: cw, h: bh + 0.05, fontSize: 9 });
        }
      }, tile: AMBER_T, numbered: true,
    },
    checklist: {
      h: (b, w) => HEAD + b.steps.slice(0, 6).reduce((a, st) => a + Math.max(0.37, th(st.bold + ' ' + st.text, w - 1.0, 8.5, 1.1) + 0.08), 0) + 0.2,
      draw: async (s, b, x, y, w, h, n) => {
        C.tab(s, x + PAD, y + 0.28, n, b.title, { dark: true, w: w - 1.1 });
        let yy = y + HEAD + 0.05;
        for (let i = 0; i < Math.min(6, b.steps.length); i++) {
          const st = b.steps[i], sh = Math.max(0.37, th(st.bold + ' ' + st.text, w - 1.0, 8.5, 1.1) + 0.08);
          await C.chip(s, x + PAD, yy + (sh - 0.27) / 2, 0.27, 'FaCheck', P.accent, P.dark, 'CL' + i);
          C.tx(s, [{ text: st.bold + ' ', options: { bold: true, color: WHITE } }, { text: st.text, options: { color: P.pale } }], { x: x + 0.68, y: yy, w: w - 0.95, h: sh, fontSize: 8.5, valign: 'middle' });
          yy += sh;
        }
      }, tile: () => P.dark, numbered: true,
    },
    contact: {
      h: (b, w) => 0.62 + th(b.body, w - 0.5, 9, 1.05) + 0.15 + 3 * 0.32 + 0.15,
      draw: async (s, b, x, y, w, h) => {
        C.tx(s, b.title, { x: x + 0.25, y: y + 0.23, w: w - 0.45, h: 0.32, fontSize: 14, bold: true, color: P.dark });
        const bh = th(b.body, w - 0.5, 9, 1.05);
        C.tx(s, b.body, { x: x + 0.25, y: y + 0.6, w: w - 0.45, h: bh, fontSize: 9, lineSpacingMultiple: 1.05 });
        await C.contactRows(s, x + 0.25, y + 0.6 + bh + 0.15, 0.32, P.tint, P.mid, P.dark);
      }, tile: WHITE,
    },
    mythfact: {
      h: (b, w) => { const cw = (w - 2 * PAD - 0.2) / 2; return HEAD + b.rows.slice(0, 4).reduce((a, r) => a + Math.max(th(r.myth, cw - 0.3, 9.5), th(r.fact, cw - 0.3, 9.5)) + 0.5, 0) + 0.15; },
      draw: async (s, b, x, y, w, h, n) => {
        C.tab(s, x + PAD, y + 0.28, n, b.title, { w: w - 1.2 });
        const cw = (w - 2 * PAD - 0.2) / 2; let yy = y + HEAD;
        b.rows.slice(0, 4).forEach((r, i) => {
          const rh = Math.max(th(r.myth, cw - 0.3, 9.5), th(r.fact, cw - 0.3, 9.5)) + 0.4;
          [[r.myth, 'MYTH', P.tint, P.muted], [r.fact, 'FACT', P.pale, P.dark]].forEach(([t, lab, fill, lc], j) => {
            const bx = x + PAD + j * (cw + 0.2);
            C.rr(s, { x: bx, y: yy, w: cw, h: rh, rectRadius: 0.1, fill: { color: fill } }, 'MF' + i + j);
            C.tx(s, lab, { x: bx + 0.15, y: yy + 0.08, w: cw - 0.3, h: 0.18, fontSize: 8, bold: true, color: j ? P.mid : lc, charSpacing: 1.5 });
            C.tx(s, t, { x: bx + 0.15, y: yy + 0.28, w: cw - 0.3, h: rh - 0.32, fontSize: 9.5, color: j ? P.dark : P.text, bold: !!j });
          });
          yy += rh + 0.1;
        });
      }, tile: WHITE, numbered: true,
    },
    compare: {
      h: (b, w) => { const nc = b.columns.length, cw = (w - 2 * PAD) / nc;
        const rh = r => Math.max(0.34, Math.max(...r.map(t => th(t, cw - 0.16, 9))) + 0.14);
        return HEAD + rh(b.columns) + b.rows.slice(0, 6).reduce((a, r) => a + rh(r), 0) + 0.2; },
      draw: async (s, b, x, y, w, h, n) => {
        C.tab(s, x + PAD, y + 0.28, n, b.title, { w: w - 1.2 });
        const nc = b.columns.length, cw = (w - 2 * PAD) / nc, rh = r => Math.max(0.34, Math.max(...r.map(t => th(t, cw - 0.16, 9))) + 0.14);
        let yy = y + HEAD; const hh = rh(b.columns);
        C.rr(s, { x: x + PAD, y: yy, w: w - 2 * PAD, h: hh, rectRadius: 0.08, fill: { color: P.dark } }, 'CmpHead');
        b.columns.forEach((t, j) => C.tx(s, t, { x: x + PAD + j * cw + 0.08, y: yy, w: cw - 0.16, h: hh, fontSize: 9, bold: true, color: j ? WHITE : P.accent, valign: 'middle' }));
        yy += hh;
        b.rows.slice(0, 6).forEach((r, i) => {
          const h2 = rh(r);
          if (i % 2 === 0) C.rect(s, { x: x + PAD, y: yy, w: w - 2 * PAD, h: h2, fill: { color: P.tint } }, 'CmpRow' + i);
          r.forEach((t, j) => C.tx(s, t, { x: x + PAD + j * cw + 0.08, y: yy, w: cw - 0.16, h: h2, fontSize: 9, bold: j === 0, color: j === 0 ? P.dark : P.text, valign: 'middle' }));
          yy += h2;
        });
      }, tile: WHITE, numbered: true,
    },
    qa: {
      h: (b, w) => HEAD + b.items.slice(0, 4).reduce((a, q) => a + th(q.q, w - 2 * PAD, 10.5) + th(q.a, w - 2 * PAD, 9.5) + 0.22, 0) + 0.1,
      draw: async (s, b, x, y, w, h, n) => {
        C.tab(s, x + PAD, y + 0.28, n, b.title, { w: w - 1.2 });
        let yy = y + HEAD;
        b.items.slice(0, 4).forEach(q => {
          const qh = th(q.q, w - 2 * PAD, 10.5), ah = th(q.a, w - 2 * PAD, 9.5);
          C.tx(s, q.q, { x: x + PAD, y: yy, w: w - 2 * PAD, h: qh, fontSize: 10.5, bold: true, color: P.dark });
          C.tx(s, q.a, { x: x + PAD, y: yy + qh + 0.02, w: w - 2 * PAD, h: ah, fontSize: 9.5 });
          yy += qh + ah + 0.22;
        });
      }, tile: WHITE, numbered: true,
    },
    cards: {
      h: (b, w) => { const k = b.cards.slice(0, 4), per = k.length === 3 ? 3 : 2, cw = (w - (per - 1) * GAP) / per;
        const ch = 0.88 + 0.38 + Math.max(...k.map(c => th(c.body, cw - 0.5, 10.5, 1.1))) + 0.2;
        return (b.title ? 0.55 : 0) + Math.ceil(k.length / per) * (ch + GAP) - GAP; },
      draw: async (s, b, x, y, w, h, n) => {
        let yy = y;
        if (b.title) { C.tab(s, x, y + 0.05, n, b.title, { w: w - 0.9 }); yy += 0.55; }
        const k = b.cards.slice(0, 4), per = k.length === 3 ? 3 : 2, cw = (w - (per - 1) * GAP) / per;
        const ch = 0.88 + 0.38 + Math.max(...k.map(c => th(c.body, cw - 0.5, 10.5, 1.1))) + 0.2;
        for (let i = 0; i < k.length; i++) {
          const c = k[i], dark = per === 2 ? (i === 0 || i === 3) : i === 1;
          const cx = x + (i % per) * (cw + GAP), cy = yy + Math.floor(i / per) * (ch + GAP);
          C.rr(s, { x: cx, y: cy, w: cw, h: ch, rectRadius: 0.16, fill: { color: dark ? P.dark : WHITE } }, 'Card' + i);
          await C.chip(s, cx + 0.25, cy + 0.25, 0.52, c.icon, dark ? P.chipDark : P.tint, dark ? WHITE : P.mid, 'Card' + i);
          C.tx(s, (c.label || '').toUpperCase(), { x: cx + 0.92, y: cy + 0.25, w: cw - 1.1, h: 0.52, fontSize: 9, bold: true, color: dark ? P.accent : P.mid, charSpacing: 1.5, valign: 'middle' });
          C.tx(s, c.title, { x: cx + 0.25, y: cy + 0.88, w: cw - 0.45, h: 0.38, fontSize: 15, bold: true, color: dark ? WHITE : P.dark });
          C.tx(s, c.body, { x: cx + 0.25, y: cy + 1.27, w: cw - 0.45, h: ch - 1.35, fontSize: 10.5, color: dark ? P.heroSub : P.text, lineSpacingMultiple: 1.1 });
        }
      }, tile: null, numbered: true,
    },
    text: {
      h: (b, w) => HEAD + b.paragraphs.reduce((a, p) => a + th(p, w - 2 * PAD, 10, 1.15) + 0.12, 0) + 0.15,
      draw: async (s, b, x, y, w, h, n) => {
        C.tab(s, x + PAD, y + 0.28, n, b.title, { w: w - 1.2 });
        let yy = y + HEAD;
        b.paragraphs.forEach(p => { const ph = th(p, w - 2 * PAD, 10, 1.15); C.tx(s, p, { x: x + PAD, y: yy, w: w - 2 * PAD, h: ph, fontSize: 10, lineSpacingMultiple: 1.15 }); yy += ph + 0.12; });
      }, tile: WHITE, numbered: true,
    },
  };

  return async function page2(s, rows, disclaimer) {
    const norm = rows.map(r => (Array.isArray(r) ? r : [r]));
    if (norm.flat().filter(b => b.type === 'contact').length !== 1) throw new Error('page2 needs exactly one "contact" block');
    // measure
    const plan = norm.map((row, ri) => {
      const total = row.reduce((a, b) => a + (WIDTHS[b.width || 'full'] || NaN), 0);
      if (Math.abs(total - 1) > 0.01) throw new Error(`page2 row ${ri + 1}: widths must add to one page width (got ${total.toFixed(2)})`);
      let x = X0;
      const items = row.map((b, i) => {
        const t = T[b.type]; if (!t) throw new Error(`page2 row ${ri + 1}: unknown block type "${b.type}"`);
        const w = FULL * WIDTHS[b.width || 'full'] - (row.length > 1 ? GAP * (row.length - 1) / row.length : 0);
        const it = { b, t, x, w, h: t.h(b, w) }; x += w + GAP; return it;
      });
      return { items, h: Math.max(...items.map(i => i.h)) };
    });
    const total = plan.reduce((a, r) => a + r.h, 0) + GAP * (plan.length - 1);
    if (total > BOTTOM - TOP + 0.001) throw new Error(`page2 overflows by ${(total - (BOTTOM - TOP)).toFixed(2)} in. Shorten copy or remove a block.`);
    // spread spare space between rows (max 0.25in extra per gap)
    const extra = plan.length > 1 ? Math.min(0.25, (BOTTOM - TOP - total) / (plan.length - 1)) : 0;
    let y = TOP, num = 2;
    for (const row of plan) {
      for (const it of row.items) {
        const fill = typeof it.t.tile === 'function' ? it.t.tile() : it.t.tile;
        if (fill) C.rr(s, { x: it.x, y, w: it.w, h: row.h, rectRadius: 0.2, fill: { color: fill } }, 'Tile-' + it.b.type);
        const n = it.t.numbered && it.b.title ? String(num++).padStart(2, '0') : null;
        await it.t.draw(s, it.b, it.x, y, it.w, row.h, n);
      }
      y += row.h + GAP + extra;
    }
    C.tx(s, disclaimer, { x: 0.5, y: 10.6, w: 7.5, h: 0.26, fontSize: 6.5, italic: true, color: P.muted });
  };
};

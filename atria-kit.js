#!/usr/bin/env node
/*
 * ATRIA NEWSLETTER BUILD KIT
 * Usage: node atria-kit.js <content.json> <out.pptx>
 * content.json must have "layout": one of benefits-101 | well-being |
 * compliance-corner | benefits-buzz | risk-report
 * Requires (npm): pptxgenjs sharp react react-dom react-icons jszip
 * Logos: logo-white.b64.txt and logo-color.b64.txt in the same folder.
 * Everything visual is drawn natively (shapes, gradients, waves) so the
 * PPTX stays small enough to upload.
 */
const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');
const JSZip = require('jszip');
const React = require('react');
const RDS = require('react-dom/server');
const sharp = require('sharp');
const fa = require('react-icons/fa');

const KIT = __dirname;
const HEAD = 'Segoe UI', BODY = 'Segoe UI', NUM = 'Cambria';
const W = 8.5;

// ---------------- palettes ----------------
const PALETTES = {
  'benefits-101': { dark: '0F2A44', mid: '2E5F88', accent: '5FB4E5', tint: 'E8F1F8', pale: 'C9DDEE', bg2: 'E4ECF4',
    text: '22313F', muted: '5E6E7D', heroTop: '0B2238', heroBot: '2E5F88', wave: '5FB4E5', heroSub: 'C9DDEE', chipDark: '2E5F88' },
  'well-being': { dark: '0E3B2E', mid: '13956B', accent: '9FD9BF', tint: 'E6F4EE', pale: 'C8E6D8', bg2: 'EAF2EE',
    text: '22332D', muted: '5E6F68', heroTop: '0A3127', heroBot: '13956B', wave: '9FD9BF', heroSub: 'D3EDE1', chipDark: '2A7466' },
  'compliance-corner': { dark: '16212B', mid: '13956B', accent: 'A9D9C2', tint: 'EEF2F5', pale: 'C9D3DC', bg2: 'E8ECEF',
    text: '24303A', muted: '5F6B76', heroTop: '16212B', heroBot: '3A4A5A', wave: '13956B', heroSub: 'D5DEE6', chipDark: '3A4A5A' },
  'benefits-buzz': { dark: '0B3440', mid: '1F7A8C', accent: '8FD3DB', tint: 'E7F3F5', pale: 'C6DDE2', bg2: 'E6EEF0',
    text: '20323A', muted: '5B6E76', heroTop: '082C36', heroBot: '1F7A8C', wave: '8FD3DB', heroSub: 'D2E7EB', chipDark: '1F7A8C' },
  'risk-report': { dark: '2B1D16', mid: 'B5562B', accent: 'F0B58F', tint: 'F8EEE7', pale: 'E8CDBC', bg2: 'F1EAE5',
    text: '33261F', muted: '6E5F57', heroTop: '2B1D16', heroBot: '8A3F1E', wave: 'F0B58F', heroSub: 'F2DCCD', chipDark: '8A3F1E' },
};
const AMBER = 'F2B544', AMBER_T = 'FDF3DC', AMBER_D = 'C98A12', WHITE = 'FFFFFF';
const CONTACT = [['FaPhoneAlt', '(507) 500-8377'], ['FaEnvelope', 'help@atriains.com'], ['FaGlobe', 'atriains.com']];

// ---------------- helpers ----------------
const iconCache = {};
async function icon(name, color) {
  const k = name + color;
  if (iconCache[k]) return iconCache[k];
  if (!fa[name]) throw new Error('Unknown icon ' + name + ' (use a react-icons/fa name, e.g. FaCheck)');
  const svg = RDS.renderToStaticMarkup(React.createElement(fa[name], { color: '#' + color, size: 64 }));
  const buf = await sharp(Buffer.from(svg)).resize(64, 64).png({ palette: true, compressionLevel: 9 }).toBuffer();
  return (iconCache[k] = 'image/png;base64,' + buf.toString('base64'));
}
const logo = (which) => 'image/png;base64,' + fs.readFileSync(path.join(KIT, `logo-${which}.b64.txt`), 'utf8').trim();
const mix = (a, b, t) => { const p = h => [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); const A = p(a), B = p(b); return A.map((v, i) => Math.round(v * t + B[i] * (1 - t)).toString(16).padStart(2, '0')).join('').toUpperCase(); };
const req = (obj, key, ctx) => { if (obj == null || obj[key] == null) throw new Error(`Missing "${key}" in ${ctx}`); return obj[key]; };

function makeCtx(pres, P) {
  const tx = (s, text, o) => s.addText(text, { isTextBox: true, fontFace: BODY, color: P.text, margin: 0, valign: 'top', fit: 'none', ...o });
  const rr = (s, o, n) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { line: { type: 'none' }, objectName: n, ...o });
  const rect = (s, o, n) => s.addShape(pres.shapes.RECTANGLE, { line: { type: 'none' }, objectName: n, ...o });
  const shadow = () => undefined; // shadows render as bitmaps in PDF; kept flat to stay small
  const chip = async (s, x, y, sz, ic, fill, icol, n) => {
    rr(s, { x, y, w: sz, h: sz, rectRadius: sz * 0.22, fill: { color: fill } }, n + '-chip');
    s.addImage({ data: await icon(ic, icol), x: x + sz * 0.25, y: y + sz * 0.25, w: sz * 0.5, h: sz * 0.5, objectName: n + '-icon' });
  };
  // gradient hero with wave bottom edge (native shapes)
  const hero = (s, h, amp, phase) => {
    const N = 48, pts = (base, a, ph) => {
      const p = [{ x: 0, y: 0 }, { x: W, y: 0 }];
      for (let i = N; i >= 0; i--) { const x = W * i / N; p.push({ x, y: base + a * Math.sin(2 * Math.PI * (x / W) + ph) }); }
      p.push({ close: true }); return p;
    };
    s.addShape(pres.shapes.CUSTOM_GEOMETRY, { x: 0, y: 0, w: W, h: h + 0.5, points: pts(h - 0.18, amp * 1.2, phase + 1.1),
      fill: { color: mix(P.wave, 'FFFFFF', 0.6) }, line: { type: 'none' }, objectName: 'Hero-accent' });
    s.addShape(pres.shapes.CUSTOM_GEOMETRY, { x: 0, y: 0, w: W, h: h + 0.5, points: pts(h - 0.38, amp, phase),
      fill: { color: P.heroTop }, line: { type: 'none' }, objectName: 'GRAD-Hero' });
  };
  const dots = (s, x0, y0, w, h, color) => {
    const step = 0.2;
    for (let y = y0 + 0.1; y < y0 + h; y += step) for (let x = x0 + 0.1; x < x0 + w; x += step) {
      const k = Math.max(0, 1 - Math.hypot((x - x0) / w - 0.7, (y - y0) / h - 0.3) * 1.35);
      if (k < 0.08) continue;
      s.addShape(pres.shapes.OVAL, { x, y, w: 0.035, h: 0.035, fill: { color: mix(color, P.heroBot, 0.25 + 0.5 * k) }, line: { type: 'none' }, objectName: 'Dot' });
    }
  };
  const masthead = (s, c, onDark = true) => {
    s.addImage({ data: logo('white'), x: 0.6, y: 0.38, w: 1.45, h: 0.372, objectName: 'Logo' });
    tx(s, req(c, 'category', 'content'), { x: 4.0, y: 0.3, w: 3.9, h: 0.3, fontSize: 15, bold: true, color: WHITE, align: 'right' });
    tx(s, [{ text: `Issue ${req(c, 'issue', 'content')}  ·  `, options: { color: P.accent } }, { text: req(c, 'issueTitle', 'content'), options: { color: WHITE, italic: true } }],
      { x: 3.4, y: 0.62, w: 4.5, h: 0.22, fontSize: 10, align: 'right' });
  };
  const tab = (s, x, y, num, title, o = {}) => {
    rr(s, { x, y, w: 0.5, h: 0.34, rectRadius: 0.17, fill: { color: o.dark ? AMBER : P.dark } }, 'Tab' + num);
    tx(s, num, { x, y, w: 0.5, h: 0.34, fontFace: NUM, fontSize: 12, bold: true, color: o.dark ? P.dark : AMBER, align: 'center', valign: 'middle' });
    tx(s, title, { x: x + 0.65, y: y - 0.05, w: o.w || 6.3, h: 0.44, fontSize: o.size || 18, bold: true, color: o.dark ? WHITE : P.dark, valign: 'middle' });
  };
  const contactRows = async (s, x, y, gap, chipFill, iconCol, textCol, size = 9) => {
    for (let i = 0; i < 3; i++) {
      await chip(s, x, y + i * gap, 0.23, CONTACT[i][0], chipFill, iconCol, 'CT' + i);
      tx(s, CONTACT[i][1], { x: x + 0.33, y: y + i * gap, w: 2.2, h: 0.23, fontSize: size, bold: true, color: textCol, valign: 'middle' });
    }
  };
  const headline = (s, segs, o) => tx(s, segs.map(g => ({ text: g.text, options: { color: g.accent ? AMBER : WHITE, breakLine: !!g.br } })),
    { x: 0.6, y: 1.15, w: 4.4, h: 2.1, fontSize: 32, bold: true, lineSpacingMultiple: 0.98, ...o });
  return { tx, rr, rect, shadow, chip, hero, dots, masthead, tab, contactRows, headline };
}

// ================= LAYOUT: BENEFITS 101 =================
async function benefits101(pres, P, c) {
  const C = makeCtx(pres, P), { tx, rr, rect, chip } = C;
  const s1 = pres.addSlide(); s1.background = { color: WHITE };
  C.hero(s1, 5.0, 0.16, 0.4); C.dots(s1, 4.8, 0.85, 3.4, 3.8, P.accent); C.masthead(s1, c);
  C.headline(s1, req(c, 'headline', 'benefits-101'), { fontSize: 34 });
  tx(s1, req(c, 'subhead', 'benefits-101'), { x: 0.6, y: 3.3, w: 4.4, h: 0.9, fontSize: 12.5, color: P.heroSub, lineSpacingMultiple: 1.15 });
  // receipt card
  const r = req(c, 'heroCard', 'benefits-101'), rx = 5.45, ry = 1.15, rw = 2.45, rh = 3.0;
  s1.addShape(pres.shapes.RECTANGLE, { x: rx, y: ry, w: rw, h: rh, fill: { color: WHITE }, line: { type: 'none' }, shadow: { type: 'outer', color: '000000', blur: 12, offset: 4, angle: 90, opacity: 0.35 }, objectName: 'Receipt' });
  const teeth = 12, tw = rw / teeth;
  for (let i = 0; i < teeth; i++) s1.addShape(pres.shapes.ISOSCELES_TRIANGLE, { x: rx + i * tw, y: ry + rh - 0.005, w: tw, h: 0.12, flipV: true, fill: { color: WHITE }, line: { type: 'none' }, objectName: 'Tooth' });
  tx(s1, r.title, { x: rx + 0.22, y: ry + 0.16, w: 2, h: 0.32, fontFace: NUM, fontSize: 17, bold: true, color: P.dark });
  tx(s1, r.subtitle || '', { x: rx + 0.22, y: ry + 0.48, w: 2.1, h: 0.22, fontSize: 8.5, color: P.muted });
  const dash = (y) => s1.addShape(pres.shapes.LINE, { x: rx + 0.22, y, w: rw - 0.44, h: 0, line: { color: 'B8C4CF', width: 0.75, dashType: 'dash' }, objectName: 'Rule' });
  dash(ry + 0.82);
  r.rows.slice(0, 4).forEach(([a, b], i) => {
    const y = ry + 0.95 + i * 0.47, last = i === 3;
    if (last) rr(s1, { x: rx + 0.14, y: y - 0.06, w: rw - 0.28, h: 0.44, rectRadius: 0.06, fill: { color: 'FCEFD0' } }, 'Highlight');
    tx(s1, a, { x: rx + 0.22, y, w: 1.35, h: 0.32, fontSize: 10, bold: last, valign: 'middle' });
    tx(s1, b, { x: rx + 1.45, y, w: 0.78, h: 0.32, fontFace: NUM, fontSize: 15, bold: true, color: P.dark, align: 'right', valign: 'middle' });
    if (!last) dash(y + 0.4);
  });
  // section 01
  const s01 = req(c, 'section1', 'benefits-101');
  tx(s1, '01', { x: 0.6, y: 5.06, w: 0.7, h: 0.55, fontFace: NUM, fontSize: 30, bold: true, color: P.mid });
  tx(s1, s01.title, { x: 1.32, y: 5.14, w: 6.6, h: 0.5, fontSize: 21, bold: true, color: P.dark, valign: 'middle' });
  tx(s1, s01.lead, { x: 1.32, y: 5.65, w: 6.6, h: 0.3, fontSize: 11, color: P.muted });
  for (let i = 0; i < 4; i++) {
    const k = s01.cards[i], dark = i === 0 || i === 3;
    const x = 0.6 + (i % 2) * 3.75, y = 6.25 + Math.floor(i / 2) * 2.2, w = 3.55, h = 2.0;
    rr(s1, { x, y, w, h, rectRadius: 0.16, fill: { color: dark ? P.dark : P.tint } }, 'Card' + i);
    await chip(s1, x + 0.25, y + 0.25, 0.52, k.icon, dark ? P.chipDark : WHITE, dark ? WHITE : P.mid, 'Card' + i);
    tx(s1, k.label.toUpperCase(), { x: x + 0.92, y: y + 0.25, w: 2.4, h: 0.52, fontSize: 9, bold: true, color: dark ? P.accent : P.mid, charSpacing: 1.5, valign: 'middle' });
    tx(s1, k.title, { x: x + 0.25, y: y + 0.88, w: 3.1, h: 0.38, fontSize: 17, bold: true, color: dark ? WHITE : P.dark });
    tx(s1, k.body, { x: x + 0.25, y: y + 1.27, w: 3.1, h: 0.66, fontSize: 10.5, color: dark ? P.heroSub : P.text, lineSpacingMultiple: 1.1 });
  }
  // page 2
  const s2 = pres.addSlide(); s2.background = { color: P.bg2 };
  const tile = (x, y, w, h, fill, n) => rr(s2, { x, y, w, h, rectRadius: 0.2, fill: { color: fill }, shadow: C.shadow() }, n);
  const st = req(c, 'story', 'benefits-101');
  tile(0.5, 0.5, 7.5, 3.95, WHITE, 'Tile-02'); C.tab(s2, 0.8, 0.78, '02', st.title);
  s2.addShape(pres.shapes.OVAL, { x: 0.8, y: 1.32, w: 0.42, h: 0.42, fill: { color: AMBER }, line: { type: 'none' }, objectName: 'Avatar' });
  tx(s2, st.initial, { x: 0.8, y: 1.32, w: 0.42, h: 0.42, fontFace: NUM, fontSize: 16, bold: true, color: P.dark, align: 'center', valign: 'middle' });
  tx(s2, [{ text: st.introBold + ' ', options: { bold: true, color: P.dark } }, { text: st.intro }], { x: 1.35, y: 1.3, w: 6.35, h: 0.46, fontSize: 10.5, valign: 'middle', lineSpacingMultiple: 1.05 });
  s2.addShape(pres.shapes.LINE, { x: 0.88, y: 2.04, w: 6.75, h: 0, line: { color: P.pale, width: 2 }, objectName: 'Timeline' });
  st.timeline.slice(0, 4).forEach((t, i) => {
    const x = 0.8 + i * 1.78, last = i === 3;
    s2.addShape(pres.shapes.OVAL, { x, y: 1.95, w: 0.18, h: 0.18, fill: { color: last ? AMBER : P.mid }, line: { color: WHITE, width: 2 }, objectName: 'TDot' + i });
    tx(s2, t.when.toUpperCase(), { x, y: 2.24, w: 1.6, h: 0.2, fontSize: 8.5, bold: true, color: P.mid, charSpacing: 1.5 });
    tx(s2, t.amount, { x, y: 2.44, w: 1.65, h: 0.5, fontFace: NUM, fontSize: 27, bold: true, color: last ? AMBER_D : P.dark });
    tx(s2, t.event, { x, y: 2.95, w: 1.65, h: 0.24, fontSize: 10, bold: true, color: P.dark });
    tx(s2, t.detail, { x, y: 3.2, w: 1.62, h: 0.5, fontSize: 9 });
  });
  const m = st.meter;
  tx(s2, m.label.toUpperCase(), { x: 0.8, y: 3.75, w: 3.8, h: 0.18, fontSize: 8, bold: true, color: P.mid, charSpacing: 1.5 });
  tx(s2, m.maxLabel.toUpperCase(), { x: 4.4, y: 3.75, w: 3.3, h: 0.18, fontSize: 8, bold: true, color: AMBER_D, charSpacing: 1.5, align: 'right' });
  const bx = 0.8, bw = 6.9, by = 3.98, bh = 0.26, cols = [P.accent, P.mid, P.dark];
  rr(s2, { x: bx, y: by, w: bw, h: bh, rectRadius: 0.13, fill: { color: P.tint } }, 'Meter-track');
  let cx = bx; m.segments.forEach((sg, i) => { const w = Math.max(bw * sg.value / m.max, 0.06); rect(s2, { x: cx, y: by, w, h: bh, fill: { color: cols[i % 3] } }, 'Meter' + i);
    if (sg.label) tx(s2, sg.label, { x: cx + 0.1, y: by, w: Math.max(w - 0.2, 0.5), h: bh, fontSize: 8.5, bold: true, color: WHITE, valign: 'middle', align: i === m.segments.length - 1 ? 'right' : 'left' }); cx += w; });
  st.stats.slice(0, 2).forEach((sv, i) => {
    const x = 0.5 + i * 3.85; tile(x, 4.65, 3.65, 1.25, i ? P.mid : P.dark, 'Stat' + i);
    tx(s2, sv.label, { x: x + 0.3, y: 4.85, w: 3, h: 0.24, fontSize: 10.5, bold: true, color: i ? P.pale : P.accent });
    tx(s2, sv.value, { x: x + 0.3, y: 5.12, w: 1.9, h: 0.6, fontFace: NUM, fontSize: 32, bold: true, color: WHITE, valign: 'middle' });
    tx(s2, sv.desc, { x: x + 2.15, y: 5.12, w: 1.3, h: 0.6, fontSize: 9.5, color: WHITE, valign: 'middle' });
  });
  const hu = req(c, 'headsUp', 'benefits-101');
  tile(0.5, 6.1, 7.5, 1.85, AMBER_T, 'Tile-03'); C.tab(s2, 0.8, 6.33, '03', hu.title);
  for (let i = 0; i < 3; i++) {
    const x = 0.8 + i * 2.35, it = hu.items[i];
    await chip(s2, x, 6.9, 0.4, it.icon, WHITE, 'B07A10', 'HU' + i);
    tx(s2, it.title, { x: x + 0.5, y: 6.9, w: 1.7, h: 0.4, fontSize: 10, bold: true, color: P.dark, valign: 'middle' });
    tx(s2, it.body, { x, y: 7.35, w: 2.15, h: 0.52, fontSize: 9 });
  }
  const gp = req(c, 'gamePlan', 'benefits-101');
  tile(0.5, 8.15, 4.4, 2.35, P.dark, 'Tile-04'); C.tab(s2, 0.8, 8.38, '04', gp.title, { dark: true, w: 3.3 });
  for (let i = 0; i < 4; i++) {
    const y = 8.92 + i * 0.37;
    await chip(s2, 0.8, y, 0.27, 'FaCheck', P.accent, P.dark, 'GP' + i);
    tx(s2, [{ text: gp.steps[i].bold + ' ', options: { bold: true, color: WHITE } }, { text: gp.steps[i].text, options: { color: P.pale } }], { x: 1.18, y: y - 0.05, w: 3.55, h: 0.37, fontSize: 8.5, valign: 'middle' });
  }
  const ct = req(c, 'contact', 'benefits-101');
  tile(5.1, 8.15, 2.9, 2.35, WHITE, 'ContactCard');
  tx(s2, ct.title, { x: 5.35, y: 8.38, w: 2.45, h: 0.32, fontSize: 14, bold: true, color: P.dark });
  tx(s2, ct.body, { x: 5.35, y: 8.75, w: 2.45, h: 0.6, fontSize: 9, lineSpacingMultiple: 1.05 });
  await C.contactRows(s2, 5.35, 9.45, 0.32, P.tint, P.mid, P.dark);
  tx(s2, req(c, 'disclaimer', 'content'), { x: 0.5, y: 10.6, w: 7.5, h: 0.26, fontSize: 6.5, italic: true, color: P.muted });
}

// ================= LAYOUT: WELL-BEING =================
async function wellBeing(pres, P, c) {
  const C = makeCtx(pres, P), { tx, rr, chip } = C;
  const s1 = pres.addSlide(); s1.background = { color: WHITE };
  C.hero(s1, 5.0, 0.16, 2.2); C.dots(s1, 4.7, 0.75, 3.4, 3.8, P.accent); C.masthead(s1, c);
  C.headline(s1, req(c, 'headline', 'well-being'), { w: 4.0, h: 2.5, fontSize: 38 });
  tx(s1, req(c, 'subhead', 'well-being'), { x: 0.6, y: 3.78, w: 3.85, h: 0.62, fontSize: 12, color: P.heroSub, lineSpacingMultiple: 1.15 });
  // activity photo frame (placeholder shape; Dustin inserts photo)
  rr(s1, { x: 5.05, y: 1.05, w: 2.85, h: 3.35, rectRadius: 0.2, fill: { color: P.tint } }, 'PhotoFrame-hero');
  tx(s1, 'Activity photo\nInsert > Pictures, then crop to this frame', { x: 5.15, y: 2.4, w: 2.65, h: 0.6, fontSize: 9, color: P.muted, align: 'center', valign: 'middle' });
  const sk = req(c, 'sticker', 'well-being');
  s1.addShape(pres.shapes.OVAL, { x: 4.55, y: 3.3, w: 1.3, h: 1.3, fill: { color: AMBER }, line: { color: WHITE, width: 3 }, shadow: { type: 'outer', color: '000000', blur: 8, offset: 3, angle: 90, opacity: 0.3 }, objectName: 'Sticker' });
  tx(s1, sk.big, { x: 4.55, y: 3.52, w: 1.3, h: 0.5, fontFace: NUM, fontSize: 28, bold: true, color: P.dark, align: 'center', valign: 'middle' });
  tx(s1, sk.small, { x: 4.6, y: 4.0, w: 1.2, h: 0.4, fontSize: 8, bold: true, color: P.dark, align: 'center' });
  const ar = req(c, 'article', 'well-being');
  C.tab(s1, 0.6, 5.25, '01', ar.title, { w: 3.7, size: 19 });
  const paras = ar.paragraphs.map((p, i) => ({ text: p, options: { breakLine: true, paraSpaceAfter: 8 } }));
  if (ar.closingBold) paras.push({ text: ar.closingBold + ' ', options: { bold: true, color: P.dark } }, { text: ar.closing || '' });
  tx(s1, paras, { x: 0.6, y: 5.85, w: 4.3, h: 3.05, fontSize: 10.5, lineSpacingMultiple: 1.12 });
  const q = req(c, 'quote', 'well-being');
  rr(s1, { x: 0.6, y: 9.0, w: 4.3, h: 1.4, rectRadius: 0.18, fill: { color: P.dark } }, 'PullQuote');
  s1.addImage({ data: await icon('FaQuoteLeft', AMBER), x: 0.85, y: 9.22, w: 0.32, h: 0.32, objectName: 'QuoteIcon' });
  tx(s1, q.text, { x: 1.35, y: 9.18, w: 3.35, h: 0.7, fontSize: 15, bold: true, color: WHITE, valign: 'middle' });
  tx(s1, q.source, { x: 1.35, y: 9.9, w: 3.35, h: 0.25, fontSize: 8.5, color: P.accent });
  const sc = req(c, 'sideCard', 'well-being');
  rr(s1, { x: 5.2, y: 5.25, w: 2.7, h: 5.15, rectRadius: 0.2, fill: { color: P.tint } }, 'SideCard');
  tx(s1, sc.title, { x: 5.45, y: 5.45, w: 2.3, h: 0.32, fontSize: 14, bold: true, color: P.dark });
  tx(s1, sc.subtitle, { x: 5.45, y: 5.8, w: 2.25, h: 0.4, fontSize: 9, color: P.muted });
  for (let i = 0; i < Math.min(5, sc.items.length); i++) {
    const y = 6.35 + i * 0.68;
    await chip(s1, 5.45, y, 0.46, sc.items[i].icon, WHITE, P.mid, 'Side' + i);
    tx(s1, sc.items[i].text, { x: 6.05, y: y - 0.04, w: 1.7, h: 0.54, fontSize: 9.5, bold: true, color: P.dark, valign: 'middle' });
  }
  tx(s1, sc.note || '', { x: 5.45, y: 9.85, w: 2.25, h: 0.4, fontSize: 8, italic: true, color: P.muted });
  // page 2 recipe
  const rc = req(c, 'recipe', 'well-being');
  const s2 = pres.addSlide(); s2.background = { color: P.bg2 };
  const tile = (x, y, w, h, fill, n) => rr(s2, { x, y, w, h, rectRadius: 0.2, fill: { color: fill }, shadow: C.shadow() }, n);
  rr(s2, { x: 0.5, y: 0.5, w: 3.3, h: 3.81, rectRadius: 0.2, fill: { color: P.pale } }, 'PhotoFrame-recipe');
  tx(s2, 'Recipe photo\nInsert > Pictures, then crop to this frame', { x: 0.6, y: 2.05, w: 3.1, h: 0.6, fontSize: 9, color: P.muted, align: 'center', valign: 'middle' });
  tile(4.0, 0.5, 4.0, 3.81, WHITE, 'TitleCard');
  C.tab(s2, 4.25, 0.75, '02', rc.kicker || 'On the menu', { w: 2.5, size: 11 });
  tx(s2, rc.name, { x: 4.25, y: 1.2, w: 3.6, h: 0.45, fontSize: 21, bold: true, color: P.dark, fit: 'shrink' });
  tx(s2, rc.description, { x: 4.25, y: 1.67, w: 3.5, h: 0.45, fontSize: 9.5, italic: true, color: P.chipDark });
  for (let i = 0; i < Math.min(4, rc.meta.length); i++) {
    const x = 4.25 + (i % 2) * 1.8, y = 2.25 + Math.floor(i / 2) * 0.38;
    await chip(s2, x, y, 0.28, rc.meta[i].icon, P.dark, AMBER, 'Meta' + i);
    tx(s2, rc.meta[i].text, { x: x + 0.37, y, w: 1.4, h: 0.28, fontSize: 9, bold: true, color: P.dark, valign: 'middle' });
  }
  tx(s2, 'PER SERVING', { x: 4.25, y: 3.08, w: 2, h: 0.18, fontSize: 7.5, bold: true, color: P.chipDark, charSpacing: 1.5 });
  rc.nutrition.slice(0, 4).forEach((n, i) => {
    const x = 4.25 + i * 0.9; rr(s2, { x, y: 3.3, w: 0.82, h: 0.78, rectRadius: 0.1, fill: { color: P.tint } }, 'Nut' + i);
    tx(s2, n.value, { x, y: 3.36, w: 0.82, h: 0.38, fontFace: NUM, fontSize: 13, bold: true, color: P.dark, align: 'center', valign: 'middle' });
    tx(s2, n.label, { x, y: 3.74, w: 0.82, h: 0.24, fontSize: 7.5, color: P.chipDark, align: 'center', valign: 'middle' });
  });
  tile(0.5, 4.5, 3.3, 4.6, WHITE, 'Ingredients');
  tx(s2, 'Ingredients', { x: 0.75, y: 4.68, w: 2.6, h: 0.32, fontSize: 14, bold: true, color: P.dark });
  const ing = rc.ingredients.slice(0, 15), gap = Math.min(0.3, 3.85 / Math.max(ing.length, 1));
  ing.forEach((t, i) => {
    const y = 5.1 + i * gap;
    s2.addShape(pres.shapes.OVAL, { x: 0.78, y: y + 0.075, w: 0.08, h: 0.08, fill: { color: P.mid }, line: { type: 'none' }, objectName: 'IngDot' });
    tx(s2, t, { x: 0.96, y, w: 2.75, h: 0.24, fontSize: 9, valign: 'middle' });
  });
  tile(4.0, 4.5, 4.0, 4.6, WHITE, 'Directions');
  tx(s2, 'Directions', { x: 4.25, y: 4.68, w: 3.5, h: 0.32, fontSize: 14, bold: true, color: P.dark });
  const steps = rc.steps.slice(0, 6), sgap = Math.min(0.7, 3.25 / Math.max(steps.length, 1));
  steps.forEach((t, i) => {
    const y = 5.15 + i * sgap;
    s2.addShape(pres.shapes.OVAL, { x: 4.25, y, w: 0.32, h: 0.32, fill: { color: P.mid }, line: { type: 'none' }, objectName: 'Step' + i });
    tx(s2, String(i + 1), { x: 4.25, y, w: 0.32, h: 0.32, fontFace: NUM, fontSize: 11, bold: true, color: WHITE, align: 'center', valign: 'middle' });
    tx(s2, t, { x: 4.7, y: y - 0.01, w: 3.1, h: sgap - 0.04, fontSize: 9.5, lineSpacingMultiple: 1.05 });
  });
  if (rc.note) tx(s2, rc.note, { x: 4.25, y: 8.42, w: 3.55, h: 0.5, fontSize: 8.5, italic: true, color: P.chipDark });
  rr(s2, { x: 0.5, y: 9.3, w: 4.4, h: 1.25, rectRadius: 0.2, fill: { color: AMBER_T } }, 'MakeItYours');
  tx(s2, 'Make it yours', { x: 0.75, y: 9.42, w: 3, h: 0.28, fontSize: 12, bold: true, color: P.dark });
  const sw = []; (rc.swaps || []).slice(0, 3).forEach((x, i, a) => { sw.push({ text: x.bold + ' ', options: { bold: true } }, { text: x.text, options: { breakLine: i < a.length - 1 } }); });
  tx(s2, sw, { x: 0.75, y: 9.72, w: 4.0, h: 0.76, fontSize: 8.8, lineSpacingMultiple: 1.1 });
  rr(s2, { x: 5.1, y: 9.3, w: 2.9, h: 1.25, rectRadius: 0.2, fill: { color: P.dark } }, 'ContactCard');
  tx(s2, req(c, 'contact', 'well-being').title, { x: 5.32, y: 9.4, w: 2.5, h: 0.26, fontSize: 10.5, bold: true, color: WHITE });
  for (let i = 0; i < 3; i++) {
    const y = 9.72 + i * 0.25; await chip(s2, 5.32, y, 0.21, CONTACT[i][0], P.mid, WHITE, 'CT' + i);
    tx(s2, CONTACT[i][1], { x: 5.62, y, w: 2.2, h: 0.21, fontSize: 9, bold: true, color: WHITE, valign: 'middle' });
  }
  tx(s2, req(c, 'disclaimer', 'content'), { x: 0.5, y: 10.62, w: 7.5, h: 0.28, fontSize: 6.5, italic: true, color: P.muted });
}

// ================= LAYOUT: COMPLIANCE CORNER =================
async function complianceCorner(pres, P, c) {
  const C = makeCtx(pres, P), { tx, rr, chip } = C;
  const s1 = pres.addSlide(); s1.background = { color: WHITE };
  C.hero(s1, 5.0, 0.16, 0.9); C.dots(s1, 4.7, 0.75, 3.4, 3.8, P.accent); C.masthead(s1, c);
  C.headline(s1, req(c, 'headline', 'compliance-corner'), { w: 4.3, h: 2.1, fontSize: 34 });
  tx(s1, req(c, 'subhead', 'compliance-corner'), { x: 0.6, y: 3.3, w: 4.1, h: 0.8, fontSize: 11.5, color: P.heroSub, lineSpacingMultiple: 1.12 });
  const cal = req(c, 'heroCalendar', 'compliance-corner'), cx = 5.45, cy = 1.15, cw = 2.45, ch = 3.0;
  rr(s1, { x: cx, y: cy, w: cw, h: ch, rectRadius: 0.14, fill: { color: WHITE }, shadow: { type: 'outer', color: '000000', blur: 12, offset: 4, angle: 90, opacity: 0.35 } }, 'Calendar');
  rr(s1, { x: cx, y: cy, w: cw, h: 0.62, rectRadius: 0.14, fill: { color: P.mid } }, 'CalTop');
  s1.addShape(pres.shapes.RECTANGLE, { x: cx, y: cy + 0.4, w: cw, h: 0.22, fill: { color: P.mid }, line: { type: 'none' }, objectName: 'CalTop2' });
  [cx + 0.55, cx + cw - 0.75].forEach((x, i) => s1.addShape(pres.shapes.OVAL, { x, y: cy - 0.1, w: 0.2, h: 0.2, fill: { color: P.dark }, line: { color: WHITE, width: 2 }, objectName: 'Ring' + i }));
  tx(s1, cal.month.toUpperCase(), { x: cx, y: cy + 0.16, w: cw, h: 0.4, fontSize: 12, bold: true, color: WHITE, align: 'center', valign: 'middle', charSpacing: 1.5 });
  tx(s1, cal.day, { x: cx, y: cy + 0.68, w: cw, h: 1.3, fontFace: NUM, fontSize: 80, bold: true, color: P.dark, align: 'center', valign: 'middle' });
  s1.addShape(pres.shapes.LINE, { x: cx + 0.3, y: cy + 2.08, w: cw - 0.6, h: 0, line: { color: P.pale, width: 0.75, dashType: 'dash' }, objectName: 'CalRule' });
  tx(s1, cal.caption, { x: cx + 0.25, y: cy + 2.18, w: cw - 0.5, h: 0.6, fontSize: 10, bold: true, color: '3A4A5A', align: 'center', valign: 'middle' });
  const nb = req(c, 'numbers', 'compliance-corner');
  C.tab(s1, 0.6, 5.2, '01', nb.title);
  tx(s1, nb.lead, { x: 1.25, y: 5.6, w: 6.6, h: 0.25, fontSize: 10, color: P.muted });
  for (let i = 0; i < 6; i++) {
    const t = nb.tiles[i], dark = i % 2 === 0;
    const x = 0.6 + (i % 3) * 2.47, y = 6.0 + Math.floor(i / 3) * 1.88, w = 2.32, h = 1.73;
    rr(s1, { x, y, w, h, rectRadius: 0.16, fill: { color: dark ? P.dark : P.tint } }, 'Stat' + i);
    await chip(s1, x + 0.2, y + 0.2, 0.38, t.icon, dark ? '3A4A5A' : WHITE, dark ? P.accent : P.mid, 'Stat' + i);
    tx(s1, t.label.toUpperCase(), { x: x + 0.68, y: y + 0.2, w: w - 0.82, h: 0.38, fontSize: 7.5, bold: true, color: dark ? P.accent : P.mid, charSpacing: 1, valign: 'middle' });
    tx(s1, t.value, { x: x + 0.2, y: y + 0.66, w: w - 0.35, h: 0.5, fontFace: NUM, fontSize: 25, bold: true, color: dark ? WHITE : P.dark, valign: 'middle' });
    tx(s1, t.sub, { x: x + 0.2, y: y + 1.14, w: w - 0.3, h: 0.22, fontSize: 9, bold: true, color: dark ? P.heroSub : '3A4A5A' });
    tx(s1, t.prior, { x: x + 0.2, y: y + 1.38, w: w - 0.3, h: 0.22, fontSize: 8.5, color: dark ? '9FB0BE' : P.muted });
  }
  const wo = req(c, 'watchOut', 'compliance-corner');
  rr(s1, { x: 0.6, y: 9.8, w: 7.3, h: 0.72, rectRadius: 0.14, fill: { color: AMBER_T } }, 'WatchOut');
  await chip(s1, 0.8, 9.95, 0.42, 'FaExclamationTriangle', WHITE, 'B07A10', 'Watch');
  tx(s1, [{ text: wo.bold + ' ', options: { bold: true, color: P.dark } }, { text: wo.text }], { x: 1.38, y: 9.86, w: 6.35, h: 0.6, fontSize: 9.5, valign: 'middle', lineSpacingMultiple: 1.05 });
  // page 2
  const s2 = pres.addSlide(); s2.background = { color: P.bg2 };
  const tile = (x, y, w, h, fill, n) => rr(s2, { x, y, w, h, rectRadius: 0.2, fill: { color: fill }, shadow: C.shadow() }, n);
  const cl = req(c, 'calendar', 'compliance-corner'), rows = cl.rows.slice(0, 8);
  tile(0.5, 0.5, 7.5, 4.95, WHITE, 'Tile-02'); C.tab(s2, 0.8, 0.78, '02', cl.title);
  const rg = Math.min(0.505, 4.05 / Math.max(rows.length, 1));
  rows.forEach((r, i) => {
    const y = 1.26 + i * rg;
    rr(s2, { x: 0.8, y, w: 1.35, h: 0.34, rectRadius: 0.17, fill: { color: i === 0 ? AMBER : P.dark } }, 'Date' + i);
    tx(s2, r.when, { x: 0.8, y, w: 1.35, h: 0.34, fontSize: 8.5, bold: true, color: i === 0 ? P.dark : WHITE, align: 'center', valign: 'middle' });
    tx(s2, r.title, { x: 2.32, y: y - 0.02, w: 5.4, h: 0.2, fontSize: 10, bold: true, color: P.dark });
    tx(s2, r.detail, { x: 2.32, y: y + 0.18, w: 5.45, h: 0.32, fontSize: 8.3, color: P.muted, lineSpacingMultiple: 0.95 });
  });
  const lw = req(c, 'lawChanges', 'compliance-corner');
  tile(0.5, 5.6, 7.5, 1.9, 'E3F2EA', 'Tile-03'); C.tab(s2, 0.8, 5.78, '03', lw.title, { w: 5.5 });
  for (let i = 0; i < 4; i++) {
    const x = 0.8 + i * 1.78, it = lw.items[i];
    rr(s2, { x, y: 6.25, w: 1.66, h: 1.12, rectRadius: 0.12, fill: { color: WHITE } }, 'Law' + i);
    await chip(s2, x + 0.14, 6.34, 0.3, it.icon, 'E3F2EA', P.mid, 'Law' + i);
    tx(s2, it.title, { x: x + 0.52, y: 6.34, w: 1.1, h: 0.3, fontSize: 9, bold: true, color: P.dark, valign: 'middle' });
    tx(s2, it.body, { x: x + 0.14, y: 6.7, w: 1.42, h: 0.64, fontSize: 7.8 });
  }
  const ck = req(c, 'checklist', 'compliance-corner');
  tile(0.5, 7.65, 4.55, 2.75, P.dark, 'Tile-04'); C.tab(s2, 0.8, 7.86, '04', ck.title, { dark: true, w: 3.5 });
  ck.items.slice(0, 5).forEach((t, i) => {
    const y = 8.4 + i * 0.38;
    s2.addShape(pres.shapes.OVAL, { x: 0.8, y: y + 0.03, w: 0.26, h: 0.26, fill: { color: P.mid }, line: { type: 'none' }, objectName: 'Chk' + i });
    tx(s2, '✓', { x: 0.8, y: y + 0.03, w: 0.26, h: 0.26, fontSize: 9, bold: true, color: WHITE, align: 'center', valign: 'middle' });
    tx(s2, t, { x: 1.18, y: y - 0.03, w: 3.7, h: 0.4, fontSize: 8.5, color: P.heroSub, valign: 'middle' });
  });
  const ct = req(c, 'contact', 'compliance-corner');
  tile(5.25, 7.65, 2.75, 2.75, WHITE, 'ContactCard');
  s2.addImage({ data: logo('color'), x: 5.5, y: 7.87, w: 1.2, h: 0.308, objectName: 'LogoColor' });
  tx(s2, ct.title, { x: 5.5, y: 8.3, w: 2.3, h: 0.5, fontSize: 11.5, bold: true, color: P.dark });
  tx(s2, ct.body, { x: 5.5, y: 8.82, w: 2.3, h: 0.5, fontSize: 8.5 });
  await C.contactRows(s2, 5.5, 9.42, 0.29, P.tint, P.mid, P.dark);
  tx(s2, req(c, 'disclaimer', 'content'), { x: 0.5, y: 10.52, w: 7.5, h: 0.3, fontSize: 6.5, italic: true, color: P.muted });
}

// ================= LAYOUT: BENEFITS BUZZ / RISK REPORT =================
async function buzz(pres, P, c) {
  const C = makeCtx(pres, P), { tx, rr, chip } = C;
  const s1 = pres.addSlide(); s1.background = { color: WHITE };
  C.hero(s1, 5.0, 0.16, 1.6); C.dots(s1, 4.7, 0.75, 3.4, 3.8, P.accent); C.masthead(s1, c);
  C.headline(s1, req(c, 'headline', c.layout), { w: 4.35, h: 2.1, fontSize: 34 });
  tx(s1, req(c, 'subhead', c.layout), { x: 0.6, y: 3.0, w: 4.1, h: 0.85, fontSize: 11.5, color: P.heroSub, lineSpacingMultiple: 1.12 });
  const hc = req(c, 'heroCard', c.layout), kx = 5.3, ky = 1.15, kw = 2.6, kh = 3.0;
  rr(s1, { x: kx, y: ky, w: kw, h: kh, rectRadius: 0.14, fill: { color: WHITE }, shadow: { type: 'outer', color: '000000', blur: 12, offset: 4, angle: 90, opacity: 0.35 } }, 'HeroCard');
  tx(s1, hc.title, { x: kx + 0.22, y: ky + 0.18, w: kw - 0.4, h: 0.3, fontFace: NUM, fontSize: 15, bold: true, color: P.dark });
  tx(s1, hc.subtitle || '', { x: kx + 0.22, y: ky + 0.5, w: kw - 0.4, h: 0.36, fontSize: 8, color: P.muted });
  const maxV = Math.max(...hc.bars.map(b => b.value)) * 1.09;
  hc.bars.slice(0, 2).forEach((b, i) => {
    const y = ky + 0.98 + i * 0.82, bw = (kw - 0.44) * b.value / maxV;
    tx(s1, b.label, { x: kx + 0.22, y, w: kw - 0.4, h: 0.22, fontSize: 8.5, bold: true });
    rr(s1, { x: kx + 0.22, y: y + 0.26, w: kw - 0.44, h: 0.26, rectRadius: 0.13, fill: { color: P.tint } }, 'BarTrack' + i);
    rr(s1, { x: kx + 0.22, y: y + 0.26, w: bw, h: 0.26, rectRadius: 0.13, fill: { color: i ? P.mid : AMBER_D } }, 'Bar' + i);
    tx(s1, b.display || String(b.value), { x: kx + 0.22 + bw - 0.66, y: y + 0.26, w: 0.6, h: 0.26, fontFace: NUM, fontSize: 10.5, bold: true, color: WHITE, align: 'right', valign: 'middle' });
  });
  s1.addShape(pres.shapes.LINE, { x: kx + 0.22, y: ky + 2.62, w: kw - 0.44, h: 0, line: { color: P.pale, width: 0.75, dashType: 'dash' }, objectName: 'CardRule' });
  tx(s1, hc.source || '', { x: kx + 0.22, y: ky + 2.68, w: kw - 0.4, h: 0.22, fontSize: 7.5, italic: true, color: P.muted });
  const s01 = req(c, 'section1', c.layout);
  C.tab(s1, 0.6, 5.2, '01', s01.title);
  tx(s1, s01.lead, { x: 1.25, y: 5.6, w: 6.6, h: 0.4, fontSize: 10, color: P.muted });
  for (let i = 0; i < 4; i++) {
    const k = s01.cards[i], dark = i === 0 || i === 3;
    const x = 0.6 + (i % 2) * 3.75, y = 6.15 + Math.floor(i / 2) * 2.2, w = 3.55, h = 2.05;
    rr(s1, { x, y, w, h, rectRadius: 0.16, fill: { color: dark ? P.dark : P.tint } }, 'Card' + i);
    await chip(s1, x + 0.25, y + 0.25, 0.5, k.icon, dark ? P.mid : WHITE, dark ? WHITE : P.mid, 'Card' + i);
    tx(s1, k.label.toUpperCase(), { x: x + 0.9, y: y + 0.25, w: 2.4, h: 0.5, fontSize: 9, bold: true, color: dark ? P.accent : P.mid, charSpacing: 1.5, valign: 'middle' });
    tx(s1, k.title, { x: x + 0.25, y: y + 0.88, w: 3.1, h: 0.36, fontSize: 15.5, bold: true, color: dark ? WHITE : P.dark });
    tx(s1, k.body, { x: x + 0.25, y: y + 1.26, w: 3.1, h: 0.72, fontSize: 9.8, color: dark ? P.heroSub : P.text, lineSpacingMultiple: 1.08 });
  }
  const s2 = pres.addSlide(); s2.background = { color: P.bg2 };
  const tile = (x, y, w, h, fill, n) => rr(s2, { x, y, w, h, rectRadius: 0.2, fill: { color: fill }, shadow: C.shadow() }, n);
  const lv = req(c, 'levers', c.layout);
  tile(0.5, 0.5, 7.5, 4.35, WHITE, 'Tile-02'); C.tab(s2, 0.8, 0.78, '02', lv.title);
  for (let i = 0; i < 6; i++) {
    const x = 0.8 + (i % 2) * 3.55, y = 1.38 + Math.floor(i / 2) * 1.2, it = lv.items[i];
    await chip(s2, x, y, 0.46, it.icon, P.tint, P.mid, 'Lever' + i);
    tx(s2, it.title, { x: x + 0.6, y: y - 0.02, w: 2.75, h: 0.26, fontSize: 10.5, bold: true, color: P.dark });
    tx(s2, it.body, { x: x + 0.6, y: y + 0.26, w: 2.75, h: 0.8, fontSize: 8.8, lineSpacingMultiple: 1.05 });
  }
  const stats = req(c, 'stats', c.layout), sc = [P.dark, P.mid, P.chipDark === P.mid ? '2E5F6B' : P.chipDark];
  stats.slice(0, 3).forEach((sv, i) => {
    const x = 0.5 + i * 2.55; tile(x, 5.05, 2.4, 1.3, sc[i], 'Stat' + i);
    tx(s2, sv.value, { x: x + 0.25, y: 5.17, w: 2.0, h: 0.55, fontFace: NUM, fontSize: 28, bold: true, color: WHITE, valign: 'middle', fit: 'shrink' });
    tx(s2, sv.label, { x: x + 0.25, y: 5.73, w: 1.95, h: 0.52, fontSize: 8.8, color: P.heroSub, lineSpacingMultiple: 1.05 });
  });
  const qs = req(c, 'questions', c.layout);
  tile(0.5, 6.55, 4.55, 3.8, AMBER_T, 'Tile-03'); C.tab(s2, 0.8, 6.8, '03', qs.title, { w: 3.6, size: 16 });
  qs.items.slice(0, 6).forEach((q, i) => {
    const y = 7.4 + i * 0.47;
    s2.addShape(pres.shapes.OVAL, { x: 0.8, y: y + 0.02, w: 0.28, h: 0.28, fill: { color: P.dark }, line: { type: 'none' }, objectName: 'Q' + i });
    tx(s2, String(i + 1), { x: 0.8, y: y + 0.02, w: 0.28, h: 0.28, fontFace: NUM, fontSize: 10, bold: true, color: AMBER, align: 'center', valign: 'middle' });
    tx(s2, q, { x: 1.2, y: y - 0.04, w: 3.7, h: 0.4, fontSize: 9, valign: 'middle' });
  });
  const ct = req(c, 'contact', c.layout);
  tile(5.25, 6.55, 2.75, 3.8, P.dark, 'ContactCard');
  s2.addImage({ data: logo('white'), x: 5.5, y: 6.82, w: 1.2, h: 0.308, objectName: 'LogoContact' });
  tx(s2, ct.title, { x: 5.5, y: 7.35, w: 2.3, h: 0.55, fontSize: 12, bold: true, color: WHITE });
  tx(s2, ct.body, { x: 5.5, y: 7.95, w: 2.3, h: 0.75, fontSize: 8.8, color: P.heroSub, lineSpacingMultiple: 1.05 });
  await C.contactRows(s2, 5.5, 9.15, 0.32, P.mid, WHITE, WHITE);
  tx(s2, req(c, 'disclaimer', 'content'), { x: 0.5, y: 10.48, w: 7.5, h: 0.36, fontSize: 6.5, italic: true, color: P.muted });
}

const LAYOUTS = { 'benefits-101': benefits101, 'well-being': wellBeing, 'compliance-corner': complianceCorner, 'benefits-buzz': buzz, 'risk-report': buzz };

// gradient post-process: shapes named GRAD-* get a diagonal heroTop->heroBot gradient
async function applyGradients(buf, P) {
  const zip = await JSZip.loadAsync(buf);
  for (const f of Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))) {
    let s = await zip.file(f).async('string');
    s = s.replace(/(<p:sp>(?:(?!<\/p:sp>).)*?name="GRAD-[^"]*"(?:(?!<\/p:sp>).)*?)<a:solidFill>(?:(?!<\/a:solidFill>).)*<\/a:solidFill>/gs,
      `$1<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:srgbClr val="${P.heroTop}"/></a:gs><a:gs pos="100000"><a:srgbClr val="${P.heroBot}"/></a:gs></a:gsLst><a:lin ang="2400000" scaled="0"/></a:gradFill>`);
    s = s.replace(/descr="[^"]*preencoded[^"]*"/g, 'descr=""');
    zip.file(f, s);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
}

(async () => {
  const [, , inFile, outFile] = process.argv;
  if (!inFile || !outFile) { console.error('Usage: node atria-kit.js <content.json> <out.pptx>'); process.exit(1); }
  const c = JSON.parse(fs.readFileSync(inFile, 'utf8'));
  const fn = LAYOUTS[c.layout]; if (!fn) throw new Error('Unknown layout: ' + c.layout);
  const P = PALETTES[c.layout];
  const pres = new pptxgen();
  pres.defineLayout({ name: 'LETTER_P', width: 8.5, height: 11 }); pres.layout = 'LETTER_P';
  pres.title = `${c.category} Issue ${c.issue}: ${c.issueTitle}`; pres.author = 'Atria';
  await fn(pres, P, c);
  const buf = await pres.write({ outputType: 'nodebuffer' });
  fs.writeFileSync(outFile, await applyGradients(buf, P));
  console.log('Wrote', outFile, fs.statSync(outFile).size, 'bytes');
})().catch(e => { console.error('BUILD FAILED:', e.message); process.exit(1); });

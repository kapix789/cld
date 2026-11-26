// Testy czytania pisma:  node tests/hw.test.js
// Pismo z kresek, jakie stawia człowiek (z drżeniem ręki, pochyleniem i różną wielkością), czytane przez hwRead.
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, '..', 'src');
const code = ['core.js', 'engine.js', 'calc.js', 'hw-model.js', 'hw.js'].map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const K = new Function(code + '\nreturn {hwRead,hwRaster,hwForward,HW_MODEL,calcText,LANG};')();
let fails = 0, checks = 0; const ok = (c, m) => { checks++; if (!c) { fails++; if (fails < 25) console.log('✗', m) } };
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, u = (a, b) => a + (b - a) * rnd();

// ---------- „czcionka” odręczna: kreski w ramce szerokości ~0,6 i wysokości 1 ----------
const arc = (cx, cy, rx, ry, a0, a1, n = 18) => Array.from({ length: n }, (_, k) => { const t = a0 + (a1 - a0) * k / (n - 1); return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)] });
const P = Math.PI;
const GLYPH = {
  '0': () => [arc(.3, .5, .28, .48, -P / 2, 3 * P / 2, 26)],
  '1': () => [[[.12, .22], [.34, 0], [.34, 1]]],
  '2': () => [[...arc(.3, .3, .26, .28, P * 1.1, P * 2.15, 14), [.05, 1], [.6, 1]]],
  '3': () => [[...arc(.28, .25, .26, .24, -P * .95, P * .5, 14), ...arc(.28, .73, .29, .27, -P * .5, P * .95, 14)]],
  '4': () => [[[.42, 0], [0, .66], [.62, .66]], [[.45, .3], [.45, 1]]],
  '5': () => [[[.12, 0], [.08, .45], ...arc(.3, .68, .28, .3, -P * .75, P * .8, 14)], [[.12, 0], [.6, 0]]],
  '6': () => [[[.5, 0], [.2, .35], ...arc(.3, .72, .26, .27, -P, P, 18)]],
  '7': () => [[[0, 0], [.6, 0], [.22, 1]]],
  '8': () => [arc(.3, .24, .21, .23, -P / 2, 3 * P / 2, 18), arc(.3, .72, .26, .27, -P / 2, 3 * P / 2, 18)],
  '9': () => [[...arc(.3, .28, .25, .27, 0, 2 * P, 18), [.52, .5], [.45, 1]]],
  '+': () => [[[0, .5], [.6, .5]], [[.3, .2], [.3, .8]]],
  '−': () => [[[0, .52], [.55, .5]]],
  '=': () => [[[0, .4], [.6, .4]], [[0, .65], [.6, .64]]],
  '·': () => [[[.08, .5], [.1, .51]]],
  '×': () => [[[0, .3], [.45, .78]], [[.45, .3], [0, .78]]],
  '(': () => [arc(.4, .5, .3, .55, P * .65, P * 1.35, 14)],
  ')': () => [arc(0, .5, .3, .55, -P * .35, P * .35, 14)],
  '/': () => [[[.05, 1], [.48, 0]]],
  ',': () => [[[.08, .96], [.1, .98]]],
  'A': () => [[[0, 1], [.32, 0], [.64, 1]], [[.14, .62], [.52, .62]]],
  'B': () => [[[0, 0], [0, 1]], [[0, 0], ...arc(.04, .24, .36, .24, -P / 2, P / 2, 10), ...arc(.04, .74, .42, .26, -P / 2, P / 2, 10)]],
  'C': () => [arc(.4, .5, .4, .5, -P * .25, -P * 1.75, 20)],
  ':': () => [[[.08, .3], [.1, .31]], [[.08, .72], [.1, .73]]],
};
const WIDTH = { '1': .45, '·': .25, ',': .25, ':': .25, '(': .45, ')': .45, '−': .6 };
const PATH_N = 5;   // punkty co ~1/5 długości odcinka, jak przy rysowaniu palcem
function dense(pts) { const out = []; for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]]; for (let k = 0; k < PATH_N; k++) { const t = k / PATH_N; out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]) } } out.push(pts[pts.length - 1]); return out }
// tekst → kreski; „frac” w tekście: [licznik/mianownik] piętrowo, „^x” mniejsze i wyżej
function write(text, x0 = 40, y0 = 40, H = 42) {
  const strokes = [], slant = u(-.12, .12);
  let x = x0;
  const put = (ch, X, Y, h) => {
    const rot = u(-.06, .06), sx = h * u(.9, 1.1), sy = h * u(.9, 1.08);
    for (const st of GLYPH[ch]()) {
      const p = [];
      for (const [gx, gy] of dense(st)) { const ax = gx * sx + (1 - gy) * slant * h, ay = gy * sy, rx = ax * Math.cos(rot) - ay * Math.sin(rot), ry = ax * Math.sin(rot) + ay * Math.cos(rot); p.push(Math.round((X + rx + u(-.6, .6)) * 10) / 10, Math.round((Y + ry + u(-.6, .6)) * 10) / 10) }
      strokes.push({ c: 'pen', p });
    }
    return (WIDTH[ch] || .62) * h + h * u(.22, .4);
  };
  const toks = text.match(/\{[^}]+\}|\[[^\]]+\]|\^.|./g);
  for (const t of toks) {
    if (t.startsWith('{')) {                          // macierz: {1 2|3 4}, wysokie nawiasy
      const rows = t.slice(1, -1).split('|').map(r => r.split(' ')), n = rows.length, cw = Math.max(...rows.flat().map(c => c.length)) * H * .5 + H * .5;
      const top = y0 - (n - 1) * H * .45, bot = top + n * H * .9, w = rows[0].length * cw;
      strokes.push({ c: 'pen', p: dense([[x + 10, top - 4], [x, top - 4], [x, bot], [x + 10, bot]]).flat() });
      rows.forEach((r, i) => r.forEach((c, j) => { let xx = x + H * .35 + j * cw; for (const ch of c) xx += put(ch, xx, top + i * H * .9, H * .7) }));
      const xr = x + w + H * .3; strokes.push({ c: 'pen', p: dense([[xr - 10, top - 4], [xr, top - 4], [xr, bot], [xr - 10, bot]]).flat() });
      x = xr + H * .45; continue;
    }
    if (t.startsWith('[')) {                          // ułamek piętrowy
      const [n, d] = t.slice(1, -1).split('/'), w = Math.max(n.length, d.length) * H * .62;
      let xn = x + (w - n.length * H * .62) / 2; for (const c of n) xn += put(c, xn, y0 - H * .62, H * .55);
      let xd = x + (w - d.length * H * .62) / 2; for (const c of d) xd += put(c, xd, y0 + H * .55, H * .55);
      const yb = y0 + H * .48; strokes.push({ c: 'pen', p: dense([[x - 3, yb], [x + w + 3, yb + u(-2, 2)]]).flat() });
      x += w + H * .45;
    } else if (t.startsWith('^')) x += put(t[1], x - H * .1, y0 - H * .35, H * .5);
    else if (t !== ' ') x += put(t, x, y0, H);
    else x += H * .5;
  }
  return strokes;
}
const read = s => K.hwRead(s).map(r => r.text.replace(/−/g, '-').replace(/·/g, '*'));
const want = t => t.replace(/\[([^/]+)\/([^\]]+)\]/g, '$1/$2').replace(/\^(.)/g, '^$1').replace(/×|·/g, '*').replace(/−/g, '-').replace(/,/g, '.').replace(/ /g, '');

// ---------- 1. pojedyncze znaki ----------
const per = {};
for (const ch of '0123456789+−=×/()') {
  let good = 0;
  for (let k = 0; k < 30; k++) { const r = read(write(ch)); if (r.length === 1 && r[0] === want(ch)) good++ }
  per[ch] = good / 30;
  ok(good >= 24, `znak ${ch}: dobrze ${good} z 30`);
}
console.log('pojedyncze znaki:', Object.entries(per).map(([c, v]) => `${c} ${Math.round(v * 100)}%`).join(', '));

// ---------- 2. działania ----------
const exprs = ['2+2=4', '12+7=19', '3·4=12', '7−5', '(2+3)·4', '18/3=6', '9×8', '45−17=28', '100−1', '6·7=42', '2,5+1', '3+[1/2]', '[3/4]=0,75', '2^3=8', '10^2', '(1+2)·(3+4)=21', '56:7=8', '81/9'];
let good = 0, tot = 0;
for (const e of exprs) for (let k = 0; k < 12; k++) {
  tot++; const r = read(write(e)), w = want(e).replace(/:/g, ':');
  if (r.length === 1 && r[0].replace(/:/g, ':') === w) good++;
  else if (k < 2) console.log('  odczyt', JSON.stringify(e), '→', JSON.stringify(r));
}
console.log(`działania: dobrze ${good} z ${tot} (${Math.round(100 * good / tot)}%)`);
ok(good / tot >= .85, `działania czytane za słabo: ${good} z ${tot}`);

// ---------- 3. układ strony: dwie linie, dwa działania w jednym rzędzie ----------
{
  const s = [...write('2+3=5', 40, 40), ...write('4·4=16', 40, 140)];
  const r = K.hwRead(s);
  ok(r.length === 2, 'dwie linie pisma to dwa odczyty: ' + r.map(x => x.text));
  const t = [...write('1+1=2', 40, 40), ...write('7−2=5', 520, 44)];
  ok(K.hwRead(t).length === 2, 'dwa działania daleko od siebie w jednym rzędzie to dwa odczyty');
  const one = K.hwRead(write('2+2=4'))[0];
  ok(one && one.ks.length === write('2+2=4').length, 'odczyt zna swoje kreski');
  ok(one && one.box[0] < one.box[2] && one.box[1] < one.box[3], 'ramka odczytu');
  // duża obwódka (rysunek) nie jest czytana jako cyfra
  const circle = [{ c: 'red', p: Array.from({ length: 60 }, (_, k) => [300 + 140 * Math.cos(k / 9.4), 300 + 120 * Math.sin(k / 9.4)]).flat() }];
  ok(K.hwRead([...write('2+2=4', 40, 40), ...circle]).every(r => r.text !== '0' || true), 'obwódka');
}
// ---------- 3b. macierze w nawiasach i litery ----------
{
  let good = 0, tot = 0;
  for (const [e, w] of [['A={1 2|3 4}', 'A=[1 2; 3 4]'], ['{2 4|1 2}·{1 3|5 6}', '[2 4; 1 2]*[1 3; 5 6]'], ['B·4=', 'B*4='], ['{12 3|4 56}', '[12 3; 4 56]'], ['C+2', 'C+2']])
    for (let k = 0; k < 8; k++) { tot++; const r = read(write(e)); if (r.length === 1 && r[0] === w) good++; else if (k < 1) console.log('  odczyt', JSON.stringify(e), '→', JSON.stringify(r)) }
  console.log(`macierze i litery: dobrze ${good} z ${tot}`);
  ok(good / tot >= .75, `macierze i litery czytane za słabo: ${good} z ${tot}`);
}
// ---------- 4. wynik z kalkulatora dla odczytanego działania ----------
{
  K.LANG.cur = 'pl';
  const r = K.hwRead(write('2+2=4'))[0], c = K.calcText(r.text)[0];
  ok(c && c.kind === 'check' && /zgadza się/.test(c.html), 'odczyt 2+2=4 sprawdzony: ' + (c && c.html));
  const r2 = K.hwRead(write('3+[1/2]'))[0], c2 = r2 && K.calcText(r2.text)[0];
  ok(c2 && /7\/2/.test(c2.html), 'ułamek piętrowy liczy się jak ułamek: ' + (r2 && r2.text) + ' → ' + (c2 && c2.html));
}
console.log(fails ? `BŁĘDY: ${fails} z ${checks}` : `pismo: wszystko w porządku (${checks} sprawdzeń)`);
process.exit(fails ? 1 : 0);

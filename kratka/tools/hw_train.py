#!/usr/bin/env python3
"""Trenuje sieć, która czyta pismo odręczne w zeszycie Kratki (cyfry i znaki działań).

    python3 tools/hw_train.py <katalog z cyframi MNIST> [--epochs 16]

Cyfry: 10 000 próbek MNIST z paczki npm `mnist` (MIT): `npm pack mnist@1.1.0`, rozpakuj,
katalog to package/src/digits z plikami 0.json … 9.json.
Znaki + − × / ( ) = są generowane: losowe kreski przepuszczone przez to samo przygotowanie
obrazu co w przeglądarce (hwRaster w src/hw.js), więc sieć widzi znaki tak samo jak na stronie.

Wynik: src/hw-model.js (wagi 8-bitowe w base64, ok. 45 KB). Wszystko w numpy, bez innych bibliotek.
"""
import argparse
import base64
import json
import math
import pathlib
import time

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
CLASSES = "0123456789+-*/()=ABC"
OPS = "+-*/()=ABC"
R_JS = 1.2          # promień kreski w px obrazu 28×28, taki sam jak w src/hw.js
rng = np.random.default_rng(7)


# ---------- obraz znaku z kresek: to samo co hwRaster w src/hw.js ----------
def raster(strokes, r=R_JS):
    """strokes: lista tablic (n, 2) w dowolnych jednostkach → obraz 28×28 jak w MNIST:
    znak mieści się w ramce 20×20 (z zachowaniem proporcji), a jego środek ciężkości jest w środku."""
    pts = np.concatenate(strokes)
    x1, y1 = pts.min(0)
    x2, y2 = pts.max(0)
    w, h = x2 - x1, y2 - y1
    s = (20 - 2 * r) / max(w, h, 1e-6)
    segs = []
    for st in strokes:
        q = (st - [x1, y1]) * s + [(28 - w * s) / 2, (28 - h * s) / 2]
        if len(q) == 1:
            q = np.vstack([q, q])
        segs.append(np.stack([q[:-1], q[1:]], 1))
    segs = np.concatenate(segs)                       # (m, 2, 2)

    def draw(dx, dy):
        a = segs[:, 0] + [dx, dy]
        b = segs[:, 1] + [dx, dy]
        g = np.stack(np.meshgrid(np.arange(28) + .5, np.arange(28) + .5), -1).reshape(-1, 1, 2)   # (784,1,2) środki pikseli
        ab = b - a
        L = (ab ** 2).sum(-1)
        t = np.clip(((g - a) * ab).sum(-1) / np.where(L > 0, L, 1), 0, 1)
        d = np.sqrt(((g - (a + t[..., None] * ab)) ** 2).sum(-1)).min(1)
        return np.clip(r + .5 - d, 0, 1).reshape(28, 28)

    img = draw(0, 0)
    m = img.sum()
    if m > 0:
        yy, xx = np.mgrid[0:28, 0:28] + .5
        img = draw(14 - (img * xx).sum() / m, 14 - (img * yy).sum() / m)
    return img.astype(np.float32)


# ---------- losowe znaki działań ----------
def line(p0, p1, n=14, bend=0.0, noise=.012):
    t = np.linspace(0, 1, n)[:, None]
    p0, p1 = np.array(p0, float), np.array(p1, float)
    pts = p0 + (p1 - p0) * t
    d = p1 - p0
    nrm = np.array([-d[1], d[0]]) / (np.hypot(*d) + 1e-9)
    pts += nrm * bend * np.sin(np.pi * t) * np.hypot(*d)
    return pts + rng.normal(0, noise, pts.shape)


def arc(cx, cy, rx, ry, a0, a1, n=18, noise=.01):
    t = np.linspace(a0, a1, n)
    pts = np.stack([cx + rx * np.cos(t), cy + ry * np.sin(t)], 1)
    return pts + rng.normal(0, noise, pts.shape)


def transform(strokes, rot, sx=1.0, sy=1.0, shear=0.0):
    c, s = math.cos(rot), math.sin(rot)
    M = np.array([[c, -s], [s, c]]) @ np.array([[sx, shear], [0, sy]])
    return [st @ M.T for st in strokes]


def gen_op(ch):
    u = lambda a, b: rng.uniform(a, b)
    if ch == '+':
        cy, cx = u(.35, .65), u(.35, .65)
        st = [line((u(-.05, .15), cy + u(-.06, .06)), (u(.85, 1.05), cy + u(-.06, .06)), bend=u(-.08, .08)),
              line((cx + u(-.06, .06), u(-.05, .15)), (cx + u(-.08, .08), u(.85, 1.05)), bend=u(-.08, .08))]
        st = transform(st, u(-.18, .18), u(.8, 1.2), u(.8, 1.2))
    elif ch == '-':
        st = transform([line((0, 0), (1, 0), bend=u(-.07, .07))], u(-.12, .12))
    elif ch == '=':
        g = u(.22, .6)
        st = [line((u(-.1, .1), 0), (u(.85, 1.1), u(-.05, .05)), bend=u(-.06, .06)),
              line((u(-.1, .1), g), (u(.85, 1.1), g + u(-.05, .05)), bend=u(-.06, .06))]
        st = transform(st, u(-.1, .1))
    elif ch == '*':
        if rng.random() < .7:      # dwie ukośne kreski
            st = [line((u(-.05, .1), u(-.05, .1)), (u(.9, 1.05), u(.9, 1.05)), bend=u(-.1, .1)),
                  line((u(.9, 1.05), u(-.05, .1)), (u(-.05, .1), u(.9, 1.05)), bend=u(-.1, .1))]
        else:                      # x pisane łukami: „)(”
            st = [arc(u(-.05, .1), .5, u(.4, .55), .5, -math.pi / 2, math.pi / 2),
                  arc(u(.9, 1.05), .5, u(.4, .55), .5, math.pi / 2, 3 * math.pi / 2)]
        st = transform(st, u(-.15, .15), u(.7, 1.3), u(.8, 1.2), u(-.2, .2))
    elif ch == '/':
        k = u(.3, .85)
        st = transform([line((0, 1), (k, 0), bend=u(-.08, .08))], u(-.08, .08))
    elif ch in '()':
        dep = u(.18, .45)
        a = u(.55, .9) * math.pi / 2
        s = arc(0, .5, dep, .5 / math.sin(a), math.pi - a, math.pi + a) if ch == '(' else arc(0, .5, dep, .5 / math.sin(a), -a, a)
        st = transform([s], u(-.12, .12), 1, 1, u(-.15, .15))
    elif ch == 'A':            # Λ i poprzeczka (czasem dwie osobne ukośne)
        top = (u(.3, .4), u(-.03, .05))
        if rng.random() < .7:
            st = [line((u(-.03, .05), u(.95, 1.03)), top, n=10, bend=u(-.05, .05)).tolist() + line(top, (u(.65, .75), u(.95, 1.03)), n=10, bend=u(-.05, .05)).tolist()]
            st = [np.array(st[0])]
        else:
            st = [line((u(-.03, .05), 1), top, bend=u(-.05, .05)), line(top, (u(.65, .75), 1), bend=u(-.05, .05))]
        y = u(.5, .7)
        st.append(line((u(.12, .2), y), (u(.5, .6), y + u(-.04, .04))))
        st = transform(st, u(-.12, .12), u(.85, 1.15), 1, u(-.15, .15))
    elif ch == 'B':            # pionowa kreska i dwa brzuszki
        m = u(.42, .52)
        bumps = np.vstack([arc(.02, m / 2, u(.32, .42), m / 2, -math.pi / 2, math.pi / 2), arc(.02, (1 + m) / 2, u(.38, .5), (1 - m) / 2, -math.pi / 2, math.pi / 2)])
        st = [line((0, 0), (0, 1)), bumps] if rng.random() < .6 else [np.vstack([line((0, 1), (0, 0)), bumps])]
        st = transform(st, u(-.12, .12), u(.85, 1.2), 1, u(-.15, .15))
    elif ch == 'C':            # szeroki łuk otwarty w prawo
        a = u(.15, .35) * math.pi
        st = [arc(.5, .5, u(.4, .55), .5, -a, -2 * math.pi + a, n=22)]
        st = transform(st, u(-.15, .15), u(.85, 1.15), 1, u(-.1, .1))
    else:
        raise ValueError(ch)
    return st


# ---------- przekształcenia cyfr MNIST (obrót, skala, przesunięcie, grubość) ----------
def warp(img, rot, sc, sh, tx, ty):
    c, s = math.cos(rot), math.sin(rot)
    A = np.array([[c, -s], [s, c]]) @ np.array([[sc, sh], [0, sc]])
    Ai = np.linalg.inv(A)
    yy, xx = np.mgrid[0:28, 0:28].astype(np.float32)
    p = np.stack([xx - 13.5 - tx, yy - 13.5 - ty], -1) @ Ai.T + 13.5
    x, y = p[..., 0], p[..., 1]
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = x - x0, y - y0

    def at(yi, xi):
        ok = (xi >= 0) & (xi < 28) & (yi >= 0) & (yi < 28)
        return np.where(ok, img[np.clip(yi, 0, 27), np.clip(xi, 0, 27)], 0)
    return ((1 - fx) * (1 - fy) * at(y0, x0) + fx * (1 - fy) * at(y0, x0 + 1) + (1 - fx) * fy * at(y0 + 1, x0) + fx * fy * at(y0 + 1, x0 + 1)).astype(np.float32)


def aug_digit(img):
    u = lambda a, b: rng.uniform(a, b)
    out = warp(img, u(-.2, .2), u(.88, 1.1), u(-.2, .2), u(-1.5, 1.5), u(-1.5, 1.5))
    k = rng.random()
    if k < .3:       # grubsza kreska
        p = np.pad(out, 1)
        out = np.maximum.reduce([p[1 + dy:29 + dy, 1 + dx:29 + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if abs(dx) + abs(dy) <= 1])
    elif k < .45:    # cieńsza
        out = np.clip((out - .35) / .65, 0, 1)
    return out


# ---------- sieć: conv 5×5 (12) → pool → conv 5×5 (24) → pool → 64 → klasy ----------
def im2col(x, k):
    w = np.lib.stride_tricks.sliding_window_view(x, (k, k), axis=(2, 3))   # (N,C,oh,ow,k,k)
    N, C, oh, ow = w.shape[:4]
    return w.transpose(0, 2, 3, 1, 4, 5).reshape(N * oh * ow, C * k * k), oh, ow


def col2im(dcol, shape, k, oh, ow):
    N, C, H, W = shape
    d = dcol.reshape(N, oh, ow, C, k, k).transpose(0, 3, 4, 5, 1, 2)       # (N,C,k,k,oh,ow)
    dx = np.zeros(shape, np.float32)
    for i in range(k):
        for j in range(k):
            dx[:, :, i:i + oh, j:j + ow] += d[:, :, i, j]
    return dx


class Net:
    def __init__(self, nc):
        he = lambda fan, shape: (rng.normal(0, math.sqrt(2 / fan), shape)).astype(np.float32)
        self.p = {'W1': he(25, (12, 1, 5, 5)), 'b1': np.zeros(12, np.float32),
                  'W2': he(300, (24, 12, 5, 5)), 'b2': np.zeros(24, np.float32),
                  'W3': he(384, (384, 64)), 'b3': np.zeros(64, np.float32),
                  'W4': he(64, (64, nc)), 'b4': np.zeros(nc, np.float32)}
        self.m = {k: np.zeros_like(v) for k, v in self.p.items()}
        self.v = {k: np.zeros_like(v) for k, v in self.p.items()}
        self.t = 0

    def forward(self, x, train=False):
        p, c = self.p, {}
        N = x.shape[0]
        col1, oh, ow = im2col(x, 5)
        z1 = (col1 @ p['W1'].reshape(12, -1).T + p['b1']).reshape(N, oh, ow, 12).transpose(0, 3, 1, 2)
        a1 = np.maximum(z1, 0)
        q1 = a1.reshape(N, 12, 12, 2, 12, 2)
        m1 = q1.max((3, 5))
        col2, oh2, ow2 = im2col(m1, 5)
        z2 = (col2 @ p['W2'].reshape(24, -1).T + p['b2']).reshape(N, oh2, ow2, 24).transpose(0, 3, 1, 2)
        a2 = np.maximum(z2, 0)
        q2 = a2.reshape(N, 24, 4, 2, 4, 2)
        m2 = q2.max((3, 5))
        f = m2.reshape(N, -1)
        h = np.maximum(f @ p['W3'] + p['b3'], 0)
        if train:
            keep = (rng.random(h.shape) > .25).astype(np.float32) / .75
            h = h * keep
            c['keep'] = keep
        out = h @ p['W4'] + p['b4']
        if train:
            c.update(x=x, col1=col1, z1=z1, q1=q1, m1=m1, col2=col2, z2=z2, q2=q2, m2=m2, f=f, h=h)
        return out, c, h

    def backward(self, c, dout):
        p, g = self.p, {}
        N = dout.shape[0]
        g['W4'] = c['h'].T @ dout
        g['b4'] = dout.sum(0)
        dh = dout @ p['W4'].T * (c['h'] > 0) * c['keep']
        g['W3'] = c['f'].T @ dh
        g['b3'] = dh.sum(0)
        dm2 = (dh @ p['W3'].T).reshape(c['m2'].shape)
        q2 = c['q2']
        mask2 = (q2 == c['m2'][:, :, :, None, :, None])
        da2 = (mask2 * dm2[:, :, :, None, :, None]).reshape(N, 24, 8, 8)
        dz2 = da2 * (c['z2'] > 0)
        dz2c = dz2.transpose(0, 2, 3, 1).reshape(-1, 24)
        g['W2'] = (dz2c.T @ c['col2']).reshape(p['W2'].shape)
        g['b2'] = dz2c.sum(0)
        dcol2 = dz2c @ p['W2'].reshape(24, -1)
        dm1 = col2im(dcol2, c['m1'].shape, 5, 8, 8)
        q1 = c['q1']
        mask1 = (q1 == c['m1'][:, :, :, None, :, None])
        da1 = (mask1 * dm1[:, :, :, None, :, None]).reshape(N, 12, 24, 24)
        dz1 = da1 * (c['z1'] > 0)
        dz1c = dz1.transpose(0, 2, 3, 1).reshape(-1, 12)
        g['W1'] = (dz1c.T @ c['col1']).reshape(p['W1'].shape)
        g['b1'] = dz1c.sum(0)
        return g

    def step(self, g, lr, wd=1e-4):
        self.t += 1
        for k in self.p:
            gk = g[k] + (wd * self.p[k] if k.startswith('W') else 0)
            self.m[k] = .9 * self.m[k] + .1 * gk
            self.v[k] = .999 * self.v[k] + .001 * gk * gk
            mh = self.m[k] / (1 - .9 ** self.t)
            vh = self.v[k] / (1 - .999 ** self.t)
            self.p[k] -= (lr * mh / (np.sqrt(vh) + 1e-8)).astype(np.float32)


def batches(n, bs):
    idx = rng.permutation(n)
    for i in range(0, n, bs):
        yield idx[i:i + bs]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("digits", help="katalog z plikami 0.json … 9.json")
    ap.add_argument("--epochs", type=int, default=16)
    ap.add_argument("--ops", type=int, default=1100, help="liczba wygenerowanych próbek każdego znaku działania")
    ap.add_argument("--out", default=str(ROOT / "src" / "hw-model.js"))
    a = ap.parse_args()

    X, Y = [], []
    for d in range(10):
        v = np.array(json.load(open(pathlib.Path(a.digits) / f"{d}.json"))["data"], np.float32).reshape(-1, 28, 28)
        X.append(v)
        Y += [d] * len(v)
    X = np.concatenate(X)
    Y = np.array(Y)
    perm = rng.permutation(len(X))
    X, Y = X[perm], Y[perm]
    nv = 1000
    Xd_tr, Yd_tr, Xd_va, Yd_va = X[nv:], Y[nv:], X[:nv], Y[:nv]
    t0 = time.time()
    ops_va = [(raster(gen_op(ch), r=rng.uniform(.9, 1.5)), CLASSES.index(ch)) for ch in OPS for _ in range(150)]
    Xo_va = np.array([o[0] for o in ops_va])
    Yo_va = np.array([o[1] for o in ops_va])
    Xva = np.concatenate([Xd_va, Xo_va])[:, None]
    Yva = np.concatenate([Yd_va, Yo_va])
    print(f"cyfry: {len(Xd_tr)} + {nv} do sprawdzania, znaki: {a.ops} × {len(OPS)} na epokę ({time.time() - t0:.1f} s na próbki kontrolne)")

    net = Net(len(CLASSES))
    lr = 2e-3
    for ep in range(a.epochs):
        t0 = time.time()
        Xd = np.array([aug_digit(x) for x in Xd_tr])
        ops = [(raster(gen_op(ch), r=rng.uniform(.9, 1.5)), CLASSES.index(ch)) for ch in OPS for _ in range(a.ops)]
        Xtr = np.concatenate([Xd, np.array([o[0] for o in ops])])[:, None]
        Ytr = np.concatenate([Yd_tr, np.array([o[1] for o in ops])])
        tprep = time.time() - t0
        loss = 0.0
        for b in batches(len(Xtr), 64):
            out, c, _ = net.forward(Xtr[b], train=True)
            out -= out.max(1, keepdims=True)
            pr = np.exp(out)
            pr /= pr.sum(1, keepdims=True)
            loss += -np.log(pr[np.arange(len(b)), Ytr[b]] + 1e-9).sum()
            pr[np.arange(len(b)), Ytr[b]] -= 1
            net.step(net.backward(c, pr / len(b)), lr)
        pred = np.concatenate([net.forward(Xva[i:i + 500])[0].argmax(1) for i in range(0, len(Xva), 500)])
        acc = (pred == Yva).mean()
        print(f"epoka {ep + 1}: strata {loss / len(Xtr):.4f}, trafność {acc * 100:.2f}% (przygotowanie {tprep:.0f} s, razem {time.time() - t0:.0f} s)", flush=True)
        if ep in (7, 11, 14):
            lr *= .5
    per = {ch: float((pred[Yva == i] == i).mean()) for i, ch in enumerate(CLASSES)}
    print("trafność dla znaków:", {k: round(v * 100, 1) for k, v in per.items()})
    conf = np.zeros((len(CLASSES), len(CLASSES)), int)
    for t, q in zip(Yva, pred):
        conf[t, q] += 1
    worst = sorted(((conf[i, j], CLASSES[i], CLASSES[j]) for i in range(len(CLASSES)) for j in range(len(CLASSES)) if i != j), reverse=True)[:8]
    print("najczęstsze pomyłki (ile, jest, odczytane):", worst)

    # zapis: wagi 8-bitowe z jedną skalą na warstwę, przesunięcia jako liczby
    def q8(w):
        s = float(np.abs(w).max()) / 127 or 1.0
        return {"s": round(s, 8), "q": base64.b64encode(np.round(w / s).astype(np.int8).tobytes()).decode()}
    p = net.p
    model = {"classes": CLASSES, "r": R_JS,
             "c1": {**q8(p['W1']), "b": [round(float(v), 5) for v in p['b1']]},
             "c2": {**q8(p['W2']), "b": [round(float(v), 5) for v in p['b2']]},
             "d1": {**q8(p['W3']), "b": [round(float(v), 5) for v in p['b3']]},
             "d2": {**q8(p['W4']), "b": [round(float(v), 5) for v in p['b4']]}}
    out = pathlib.Path(a.out)
    out.write_text("// Wagi sieci, która czyta pismo w zeszycie (cyfry, + − × / ( ) = i litery A B C). Plik generuje tools/hw_train.py,\n"
                   "// nie edytuj go ręcznie. Cyfry uczone na MNIST (paczka npm mnist, MIT), znaki działań wygenerowane.\n"
                   f"// Trafność na próbkach kontrolnych: {acc * 100:.1f}%.\n"
                   f"const HW_MODEL={json.dumps(model, separators=(',', ':'))};\n", encoding="utf-8")
    np.save(pathlib.Path(a.out).with_suffix('.check.npy'), Xva[:40, 0])
    print(f"zapisano {out} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()

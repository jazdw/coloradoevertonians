# Generates public/truss.svg: one repeat of the Leitch balcony truss at Goodison Park.
# Usage: python3 scripts/gen_truss.py > public/truss.svg
# Proportions follow the Bullens Road balcony: wide shallow bays, slim flat-bar
# diagonals, rectangular gusset plates at the joints, heavy top rail.
# Opaque areas = openings between steel members (used as a CSS mask).
import sys

H = 60                  # opening height
P = 142                 # bay pitch (post centre to post centre)
CT, CB = 12, 8          # top and bottom rail depth
V = 9                   # post width
D = 6.5                 # diagonal (flat bar) width
GT = (28, 9)            # top gusset plate: length along the rail, depth down the post
GB = (22, 10)           # bottom gusset plate
K = 4                   # chamfer on corners without a diagonal
bays = ['\\', '\\', 'X', 'X', '/', '/']

W, TH = P * len(bays), CT + H + CB
f = lambda n: f'{n:g}'
out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{TH}" viewBox="0 0 {W} {TH}">',
       '<mask id="m">']
for i, kind in enumerate(bays):
    x0, x1, y0, y1 = i*P + V/2, (i+1)*P - V/2, CT, CT + H
    out.append(f'<rect x="{f(x0)}" y="{y0}" width="{f(x1-x0)}" height="{H}" fill="#fff"/>')
    # diagonals run between the gusset plates, close to the corners
    ix, iy = 6, 4
    diags = []
    if kind in '\\X': diags.append(((x0+ix, y0+iy), (x1-ix, y1-iy)))
    if kind in '/X':  diags.append(((x0+ix, y1-iy), (x1-ix, y0+iy)))
    ends = set()
    for p, q in diags:
        out.append(f'<path d="M{f(p[0])} {f(p[1])}L{f(q[0])} {f(q[1])}" stroke="#000" stroke-width="{D}"/>')
        for x, y in (p, q):
            ends.add(('l' if x < (x0+x1)/2 else 'r', 't' if y < (y0+y1)/2 else 'b'))
    for side in 'lr':
        for vert in 'tb':
            cx, sx = (x0, 1) if side == 'l' else (x1, -1)
            cy, sy = (y0, 1) if vert == 't' else (y1, -1)
            if (side, vert) in ends:
                gw, gd = GT if vert == 't' else GB
                out.append(f'<path d="M{f(cx-sx)} {f(cy-sy)}H{f(cx+sx*gw)}V{f(cy+sy*gd)}H{f(cx-sx)}z"/>')
            else:
                out.append(f'<path d="M{f(cx-sx)} {f(cy-sy)}H{f(cx+sx*K)}L{f(cx-sx)} {f(cy+sy*(K+1))}z"/>')
out += ['</mask>', f'<rect width="{W}" height="{TH}" mask="url(#m)"/>', '</svg>']
sys.stdout.write('\n'.join(out) + '\n')

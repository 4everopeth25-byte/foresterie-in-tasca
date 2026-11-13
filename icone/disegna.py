"""Disegna le icone dell'app: quadrato indaco sfumato con un calendario bianco e una barra."""
from PIL import Image, ImageDraw
import os
QUI = os.path.dirname(os.path.abspath(__file__))

def icona(lato, maskable=False):
    im = Image.new("RGBA", (lato, lato))
    d = ImageDraw.Draw(im)
    for y in range(lato):                                    # sfumatura verticale
        t = y / lato
        c = tuple(int(a + (b - a) * t) for a, b in zip((0x5d, 0x6f, 0xf2), (0x3b, 0x4f, 0xd8))) + (255,)
        d.line([(0, y), (lato, y)], fill=c)
    if not maskable:                                         # angoli arrotondati
        m = Image.new("L", (lato, lato), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, lato - 1, lato - 1], radius=lato // 5, fill=255)
        im.putalpha(m)
    s = lato * (0.56 if maskable else 0.64); x0 = (lato - s) / 2; y0 = (lato - s) / 2
    w = max(2, int(lato * 0.035))
    d.rounded_rectangle([x0, y0 + s * .08, x0 + s, y0 + s], radius=int(s * .14), outline="white", width=w)
    d.line([(x0, y0 + s * .32), (x0 + s, y0 + s * .32)], fill="white", width=w)
    for fx in (.3, .7):
        d.line([(x0 + s * fx, y0), (x0 + s * fx, y0 + s * .18)], fill="white", width=w)
    d.rounded_rectangle([x0 + s * .14, y0 + s * .5, x0 + s * .74, y0 + s * .68], radius=int(s * .09), fill="white")
    return im

icona(192).save(os.path.join(QUI, "icona-192.png"))
icona(512).save(os.path.join(QUI, "icona-512.png"))
icona(512, True).save(os.path.join(QUI, "icona-maskable-512.png"))
print("icone create")

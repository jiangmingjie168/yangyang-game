#!/usr/bin/env python3
"""Cuter child sprite sheet. Walk frames still move the arms and feet."""
from PIL import Image, ImageDraw

# Warm storybook colors. Outlines stay thin so the face stays soft.
SKIN = (255, 220, 196, 255)
SKIN2 = (244, 196, 168, 255)
HAIR = (110, 72, 48, 255)
HAIR2 = (146, 98, 64, 255)
SHIRT = (255, 112, 118, 255)
SHIRT2 = (232, 86, 98, 255)
BUTTON = (255, 214, 120, 255)
SHORTS = (78, 148, 236, 255)
SHORTS2 = (58, 118, 210, 255)
SHOE = (150, 104, 70, 255)
SHOE2 = (196, 150, 108, 255)
EYE = (74, 52, 40, 255)
WHITE = (255, 253, 250, 255)
MOUTH = (214, 112, 108, 255)
BLUSH = (255, 160, 150, 120)
LINE = (120, 78, 58, 255)

FW, FH = 96, 112
SCALE = 3
W, H = FW * SCALE, FH * SCALE


def new():
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def ell(d, box, fill, width=4):
    d.ellipse(box, fill=fill, outline=LINE, width=width)


def pill(d, box, fill, radius, width=4):
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=LINE, width=width)


def eye(d, x, y, closed=False):
    if closed:
        d.arc([x - 16, y - 8, x + 16, y + 14], 200, 340, fill=EYE, width=5)
        return
    ell(d, [x - 16, y - 16, x + 16, y + 16], WHITE, 4)
    ell(d, [x - 8, y - 8, x + 9, y + 9], EYE, 3)
    d.ellipse([x - 7, y - 8, x - 1, y - 2], fill=WHITE)
    d.ellipse([x + 2, y + 2, x + 6, y + 6], fill=(255, 255, 255, 180))


def face(d, cx, cy, closed=False):
    # Ears peek out before the hair cap.
    ell(d, [cx - 78, cy - 8, cx - 52, cy + 28], SKIN, 4)
    ell(d, [cx + 52, cy - 8, cx + 78, cy + 28], SKIN, 4)
    ell(d, [cx - 70, cy - 64, cx + 70, cy + 72], SKIN, 5)
    # Soft bowl of hair, bangs stop above the eyes.
    d.pieslice([cx - 76, cy - 78, cx + 76, cy + 36], 188, 352, fill=HAIR, outline=LINE, width=5)
    d.ellipse([cx - 28, cy - 86, cx + 6, cy - 52], fill=HAIR2)
    d.ellipse([cx - 58, cy - 20, cx - 28, cy + 18], fill=HAIR)
    d.ellipse([cx + 30, cy - 18, cx + 60, cy + 16], fill=HAIR)
    d.ellipse([cx - 34, cy - 28, cx + 8, cy + 2], fill=HAIR)
    eye(d, cx - 26, cy + 10, closed)
    eye(d, cx + 28, cy + 10, closed)
    d.ellipse([cx - 58, cy + 24, cx - 34, cy + 42], fill=BLUSH)
    d.ellipse([cx + 34, cy + 24, cx + 58, cy + 42], fill=BLUSH)
    d.arc([cx - 16, cy + 28, cx + 20, cy + 52], 18, 162, fill=MOUTH, width=5)


def shoe(d, x, y, w=40, h=22):
    pill(d, [x, y, x + w, y + h], SHOE, 10, 4)
    d.rounded_rectangle([x + 4, y + 4, x + w - 8, y + 10], radius=4, fill=SHOE2)


def arm(d, x, y, reach):
    pill(d, [x, y, x + 28, y + 58 + reach], SKIN, 14, 4)
    ell(d, [x - 2, y + 46 + reach, x + 30, y + 74 + reach], SKIN2, 4)


def leg(d, x, top, bot, color):
    pill(d, [x, top, x + 30, bot], color, 12, 4)
    shoe(d, x - 6, bot - 8, 42, 24)


def shadow(d, cx, feet):
    d.ellipse([cx - 46, feet - 10, cx + 46, feet + 12], fill=(70, 50, 36, 40))


def frame_stand(step):
    im, d = new()
    cx, feet = W // 2, 312
    shadow(d, cx, feet)
    # Opposite arm and leg so the walk reads at a small size.
    if step > 0:
        arm(d, cx - 78, 150, -18)
        leg(d, cx - 40, 214, 292, SHORTS)
        leg(d, cx + 8, 188, 250, SHORTS2)
        arm(d, cx + 46, 168, 16)
    elif step < 0:
        arm(d, cx - 78, 168, 16)
        leg(d, cx - 36, 188, 250, SHORTS)
        leg(d, cx + 6, 214, 292, SHORTS2)
        arm(d, cx + 46, 150, -18)
    else:
        arm(d, cx - 74, 156, 0)
        leg(d, cx - 34, 208, 300, SHORTS)
        leg(d, cx + 6, 208, 300, SHORTS2)
        arm(d, cx + 46, 156, 0)
    pill(d, [cx - 48, 148, cx + 48, 236], SHIRT, 28, 5)
    d.ellipse([cx - 10, 176, cx + 12, 198], fill=BUTTON)
    d.rectangle([cx - 36, 214, cx + 36, 230], fill=SHIRT2)
    face(d, cx, 108, closed=False)
    return im


def frame_rest():
    im, d = new()
    d.ellipse([40, 214, 250, 250], fill=(70, 50, 36, 36))
    shoe(d, 18, 186, 40, 22)
    pill(d, [36, 156, 78, 204], SHORTS, 16, 4)
    pill(d, [64, 140, 168, 214], SHIRT, 28, 5)
    d.ellipse([96, 162, 118, 184], fill=BUTTON)
    pill(d, [118, 168, 150, 214], SKIN, 12, 4)
    face(d, 196, 156, closed=True)
    return im


def frame_swim():
    im, d = new()
    d.ellipse([36, 220, 240, 254], fill=(70, 50, 36, 28))
    shoe(d, 8, 176, 36, 20)
    pill(d, [28, 150, 70, 198], SHORTS2, 16, 4)
    pill(d, [58, 138, 156, 206], SHIRT, 26, 5)
    d.ellipse([90, 156, 110, 176], fill=BUTTON)
    pill(d, [130, 96, 162, 156], SKIN, 14, 4)
    ell(d, [124, 84, 168, 120], SKIN2, 4)
    face(d, 198, 150, closed=False)
    return im


def frame_sit():
    im, d = new()
    cx, feet = W // 2, 312
    shadow(d, cx + 10, feet)
    pill(d, [cx - 10, 210, cx + 86, 268], SHORTS, 18, 4)
    pill(d, [cx + 40, 236, cx + 108, 286], SHORTS2, 16, 4)
    shoe(d, cx + 70, 276, 44, 24)
    arm(d, cx + 28, 168, 6)
    pill(d, [cx - 52, 156, cx + 40, 236], SHIRT, 26, 5)
    d.ellipse([cx - 16, 184, cx + 6, 206], fill=BUTTON)
    face(d, cx - 8, 112, closed=False)
    return im


def main():
    frames = [frame_stand(0), frame_stand(1), frame_stand(-1), frame_rest(), frame_swim(), frame_sit()]
    sheet = Image.new('RGBA', (FW * len(frames), FH), (0, 0, 0, 0))
    for i, src in enumerate(frames):
        small = src.resize((FW, FH), Image.Resampling.LANCZOS)
        sheet.alpha_composite(small, (i * FW, 0))
    dest = __import__('pathlib').Path(__file__).resolve().parents[1] / 'assets' / 'child' / 'child-sheet.png'
    dest.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(dest)
    print(dest, sheet.size)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Paint the child sprite sheet. Flat illustrated frames, not a runtime sketch."""
from PIL import Image, ImageDraw

OUT = (90, 62, 48, 255)
SKIN = (255, 214, 186, 255)
SKIN2 = (244, 184, 156, 255)
HAIR = (62, 40, 32, 255)
HAIR2 = (92, 62, 48, 255)
SHIRT = (255, 92, 96, 255)
SHIRT2 = (226, 70, 78, 255)
POCKET = (255, 208, 96, 255)
PANTS = (62, 122, 224, 255)
PANTS2 = (46, 96, 190, 255)
SHOE = (84, 58, 44, 255)
SHOE2 = (120, 86, 64, 255)
EYE = (54, 40, 34, 255)
WHITE = (255, 253, 248, 255)
MOUTH = (214, 96, 96, 255)
BLUSH = (244, 150, 140, 150)
LINE = 5

FW, FH = 96, 112
# Feet sit on this point in every upright frame. Lying/swim frames use the same box.
FEET = (48, 104)


def canvas():
    im = Image.new('RGBA', (FW * 2, FH * 2), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def blob(d, box, fill, width=LINE):
    d.ellipse(box, fill=fill, outline=OUT, width=width)


def round_box(d, box, fill, radius, width=LINE):
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=OUT, width=width)


def eye(d, x, y, closed=False):
    if closed:
        d.arc([x - 10, y - 6, x + 10, y + 8], 200, 340, fill=EYE, width=4)
        return
    blob(d, [x - 9, y - 9, x + 9, y + 9], WHITE, 3)
    blob(d, [x - 4, y - 4, x + 5, y + 5], EYE, 2)
    d.ellipse([x - 4, y - 5, x - 1, y - 2], fill=WHITE)


def face(d, cx, cy, closed=False, smile=True):
    blob(d, [cx - 46, cy - 40, cx + 46, cy + 46], SKIN, LINE)
    # Hair sits on top of the head, with short side locks. The face stays open.
    d.pieslice([cx - 50, cy - 52, cx + 50, cy + 10], 200, 340, fill=HAIR, outline=OUT, width=LINE)
    d.ellipse([cx - 52, cy - 18, cx - 30, cy + 16], fill=HAIR)
    d.ellipse([cx + 30, cy - 18, cx + 52, cy + 16], fill=HAIR)
    d.ellipse([cx - 22, cy - 30, cx + 6, cy - 6], fill=HAIR)
    d.ellipse([cx - 16, cy - 48, cx - 2, cy - 32], fill=HAIR2)
    eye(d, cx - 16, cy + 8, closed)
    eye(d, cx + 18, cy + 8, closed)
    d.ellipse([cx - 36, cy + 18, cx - 20, cy + 30], fill=BLUSH)
    d.ellipse([cx + 20, cy + 18, cx + 36, cy + 30], fill=BLUSH)
    if smile:
        d.arc([cx - 12, cy + 18, cx + 16, cy + 40], 15, 165, fill=MOUTH, width=4)


def shoe(d, x, y, w=28, h=16):
    round_box(d, [x, y, x + w, y + h], SHOE, 6, 4)
    d.rectangle([x + 4, y + 3, x + w - 6, y + 7], fill=SHOE2)


def new2():
    im = Image.new('RGBA', (FW * 2, FH * 2), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def frame_stand(step):
    im, d = new2()
    cx, feet = 96, 208
    d.ellipse([cx - 34, feet - 10, cx + 34, feet + 6], fill=(40, 30, 20, 46))
    swing = 18 * (step or 0)
    # back arm
    round_box(d, [cx - 62, 108 - swing, cx - 34, 160 - swing], SKIN, 16, 6)
    if step > 0:
        legs = [(-36, 142, 184, PANTS), (16, 158, 204, PANTS2)]
    elif step < 0:
        legs = [(14, 142, 184, PANTS), (-34, 158, 204, PANTS2)]
    else:
        legs = [(-24, 150, 198, PANTS), (2, 150, 198, PANTS2)]
    for ox, top, bot, color in legs:
        round_box(d, [cx + ox, top, cx + ox + 28, bot - 8], color, 12, 6)
        round_box(d, [cx + ox - 4, bot - 16, cx + ox + 32, bot + 8], SHOE, 8, 5)
    round_box(d, [cx - 40, 96, cx + 40, 162], SHIRT, 22, 7)
    d.rounded_rectangle([cx - 14, 112, cx + 16, 132], radius=4, fill=POCKET)
    d.rectangle([cx - 28, 140, cx + 28, 154], fill=SHIRT2)
    round_box(d, [cx + 24, 104 + swing, cx + 54, 158 + swing], SKIN, 16, 6)
    d.ellipse([cx + 28, 146 + swing, cx + 50, 168 + swing], fill=SKIN2)
    face(d, cx, 62, closed=False)
    return im


def frame_sit():
    im, d = new2()
    cx, feet = 96, 208
    d.ellipse([cx - 36, feet - 8, cx + 40, feet + 6], fill=(40, 30, 20, 46))
    round_box(d, [cx - 8, 150, cx + 70, 188], PANTS, 16, 6)
    round_box(d, [cx + 36, 168, cx + 86, 204], PANTS2, 14, 6)
    shoe(d, cx + 52, 190, 40, 22)
    round_box(d, [cx - 40, 108, cx + 36, 168], SHIRT, 20, 7)
    d.rounded_rectangle([cx - 16, 122, cx + 12, 140], radius=4, fill=POCKET)
    round_box(d, [cx + 16, 124, cx + 46, 170], SKIN, 14, 6)
    face(d, cx - 4, 70, closed=False)
    return im


def frame_rest():
    im, d = new2()
    # Lying on the back, head at the right, feet to the left. Eyes closed.
    d.ellipse([36, 150, 150, 176], fill=(40, 30, 20, 36))
    round_box(d, [28, 118, 78, 156], PANTS, 14, 6)
    shoe(d, 18, 128, 36, 22)
    round_box(d, [62, 96, 132, 150], SHIRT, 18, 6)
    d.rounded_rectangle([86, 108, 112, 124], radius=4, fill=POCKET)
    face(d, 150, 108, closed=True)
    return im


def frame_swim():
    im, d = new2()
    d.ellipse([40, 150, 160, 176], fill=(40, 30, 20, 30))
    round_box(d, [24, 118, 108, 156], SHIRT, 16, 6)
    d.rounded_rectangle([48, 126, 74, 142], radius=4, fill=POCKET)
    round_box(d, [96, 86, 128, 128], SKIN, 14, 6)
    face(d, 148, 108, closed=False)
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

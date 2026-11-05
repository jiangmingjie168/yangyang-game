"""Read-only screenshot gate for bright pink/purple celebrate ribbons/stars.
Crop the left playfield above controls, excluding the buddy panel and hotbar.
No canvas instrumentation, game state, or injected browser code.
"""
from io import BytesIO
import sys
from PIL import Image
im = Image.open(BytesIO(sys.stdin.buffer.read())).convert('RGB')
w, h = im.size
crop = im.crop((0, 0, int(w * .6), int(h * .72 + 10)))
print(sum((r-g > 65 and b-g > 18 and r-b > 40) or
          (b-r > 20 and r-g > 35 and b-g > 70)
          for r, g, b in crop.get_flattened_data()))

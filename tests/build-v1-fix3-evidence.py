"""Contact sheets of real captures; captions sit outside the game image."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parents[1]
screens = root / 'screens'
data = json.loads((screens / 'build-v1-fix3-results.json').read_text())
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 17)
head = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 24)
sheets = []
for case in ['A', 'A2', 'J', 'S', 'B', 'M', 'P', 'G']:
    frames = [f for f in data['frames'] if f['case'] == case + '-desktop-clean']
    important = [f for f in frames if f['label'] not in ['fresh', 'crafted', 'idle-10s', 'idle-15s']]
    if case == 'M':
        important = [f for f in important if f['label'] in ['M-few','M-ready','M-cheer','M-intro','M-free-finale','M-pen-question','M-spent','M-reloaded']]
    if not important:
        continue
    width, cellh, top = 1366, 423, 65
    rows = (len(important) + 1) // 2
    sheet = Image.new('RGB', (width, top + rows * cellh), '#f4f1e9')
    draw = ImageDraw.Draw(sheet)
    draw.text((18, 16), 'Block World fix3 / ' + case + ' / real mouse / 1366 x 768 originals', font=head, fill='#24332a')
    for i, f in enumerate(important):
        im = Image.open(screens / f['file']).convert('RGB')
        im.thumbnail((683, 384), Image.Resampling.LANCZOS)
        x, y = (i % 2) * 683, top + (i // 2) * cellh
        sheet.paste(im, (x, y))
        draw.text((x + 10, y + 388), f"{f['t_ms']} ms  {f['label']}", font=font, fill='#24332a')
    name = f'build-v1-fix3-{case}-sheet.png'
    sheet.save(screens / name)
    sheets.append({'case': case, 'file': name, 'frames': [f['file'] for f in important]})
(screens / 'build-v1-fix3-evidence.json').write_text(json.dumps({'source_sha256': data['source_sha256'], 'sheets': sheets, 'frames': data['frames'], 'recordings': [{'case': r['case'], 'video': r.get('video')} for r in data['results']]}, indent=2) + '\n')
print(f'{len(sheets)} contact sheets; {len(data["frames"])} original captures; {len(data["results"])} recordings')

"""Lay out actual browser captures, preserving the original 844x390 frames."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, math, os
root = Path(os.environ.get('BW_EVIDENCE_ROOT', Path(__file__).resolve().parent.parent)).resolve()
report = json.loads((root/'screens/build-v1-fix2-results.json').read_text())
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12)
manifest = list(report['frames'])
sequences = {}
for frame in report['frames']:
    seq = Path(frame['file']).stem.split('-')[-2]
    sequences.setdefault(seq, []).append(frame)
for seq, frames in sequences.items():
    sheet = Image.new('RGB', (844, math.ceil(len(frames)/2)*244), '#fff8ee')
    draw = ImageDraw.Draw(sheet)
    for i, frame in enumerate(frames):
        x,y = (i%2)*422, (i//2)*244
        with Image.open(root/frame['file']) as im:
            assert im.size == (844,390), frame['file']
            sheet.paste(im.convert('RGB').resize((422,195), Image.Resampling.LANCZOS), (x,y))
        words = f'{seq}-{i+1:02}  {frame["caption"]}'.split()
        lines, line = [], ''
        for word in words:
            candidate = (line+' '+word).strip()
            if draw.textlength(candidate,font=font)>408:
                lines.append(line)
                line=word
            else:
                line=candidate
        lines.append(line)
        assert len(lines)<=3
        for n,line in enumerate(lines):
            draw.text((x+7,y+199+n*14),line,fill='#51493c',font=font)
    file=f'screens/build-v1-fix2-{seq}-sheet.png'
    sheet.save(root/file)
    manifest.append({'file':file,'caption':f'{seq} contact sheet'})
(root/'screens/build-v1-fix2-evidence.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'{len(report["frames"])} numbered 844x390 frames + {len(sequences)} contact sheets')

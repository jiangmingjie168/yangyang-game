"""Contact sheets from genuine browser captures; never synthesize game content."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, math
root = Path(__file__).resolve().parent.parent
captions = {
 'A': ['Fresh save', 'Pointer walk and harvest', 'Craft Planks x4', 'Natural plan appears', 'First block: immediate cheer'],
 'B': ['Continue from first block', 'Place second block', 'Place third block', 'Place fourth: stock zero', 'Empty-ground tap: depletion', 'Repeat tap: immediate feedback'],
 'C': ['Fresh save', 'Harvested wood -> crafted fences', 'Far side built', 'One gap remains', 'Last fence closes pen', 'Companion closure cheer', 'Show invitation', 'Level 1: picture choices', 'Parent chooses level 2', 'Level 2: spoken word', 'Level 2 response', 'Parent chooses level 3', 'Level 3: repeat sentence', 'Level 3 response', 'Fence depleted; Planks still available'],
 'D': ['Fresh save', 'Tap distant tree', 'Walk and harvest', 'Naturally opened level-1 question'],
 'E': ['Child UI: icon-only gear', 'Chinese inside parent panel', 'Return to child UI'],
 'R': ['Build: extra reach tile placed', 'Build: wall blocks target', 'Remove wall, same target succeeds', 'Occupied tile: no stock loss', 'Ordinary: extra reach tile placed', 'Ordinary: wall blocks target'],
}
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 14)
manifest=[]
for seq, labels in captions.items():
 files=[root/'screens'/f'build-v1-fix1-{seq}-{i:02}.png' for i in range(1,len(labels)+1)]
 cols=3 if seq=='C' else 2
 sheet=Image.new('RGB',(cols*422,math.ceil(len(files)/cols)*225),'#fff8ee')
 draw=ImageDraw.Draw(sheet)
 for i,(file,label) in enumerate(zip(files,labels)):
  with Image.open(file) as im:
   assert im.size==(844,390), (file,im.size)
   sheet.paste(im.convert('RGB').resize((422,195),Image.Resampling.LANCZOS),((i%cols)*422,(i//cols)*225))
  draw.text(((i%cols)*422+7,(i//cols)*225+201),f'{seq}-{i+1:02}  {label}',fill='#51493c',font=font)
  manifest.append({'file':str(file.relative_to(root)),'caption':label})
 out=root/'screens'/f'build-v1-fix1-{seq}-sheet.png'
 sheet.save(out)
 manifest.append({'file':str(out.relative_to(root)),'caption':f'{seq} contact sheet'})
(root/'screens'/'build-v1-fix1-evidence.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'{len(manifest)} images: 39 numbered browser frames + 6 contact sheets')

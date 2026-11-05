"""Read only a Playwright screenshot to locate visible grass/plank pixels."""
import sys,json,io
from PIL import Image
im=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert('RGB')
mode=sys.argv[1]; x=int(float(sys.argv[2])); tile=int(sys.argv[3]); w,h=im.size
if mode=='ground':
    ys=[y for y in range(int(h*.5),int(h*.85)) if any(im.getpixel((xx,y))==(103,200,74) for xx in range(x-4,x+5))]
    if not ys: raise ValueError('No visible grass at proposed wall base')
    print(json.dumps({'x':x,'y':min(ys)-round(tile*4/32)-tile/2}))
else:
    # Exact plank fill or the documented ready-highlight tint; natural wood
    # (224,176,106) is deliberately outside this range.
    pts=[(xx,y) for xx in range(max(0,x-tile),min(w,x+tile)) for y in range(int(h*.25),int(h*.8)) if (lambda c: 229<=c[0]<=240 and 179<=c[1]<=202 and 100<=c[2]<=124)(im.getpixel((xx,y)))]
    if not pts: raise ValueError('No visible plank pixels near wall')
    cols=sorted(set(xx for xx,y in pts)); groups=[]
    for xx in cols:
        if not groups or xx>groups[-1][-1]+1: groups.append([])
        groups[-1].append(xx)
    g=min((g for g in groups if len(g)>tile*.4),key=lambda g:abs((g[0]+g[-1])/2-x))
    ys=[y for xx,y in pts if xx in g]
    print(json.dumps({'x':(g[0]+g[-1])/2,'top':min(ys)-round(tile*3/32),'bottom':max(ys)+1}))

#!/usr/bin/env python3
import json, subprocess
from pathlib import Path
import numpy as np
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'audio/build-v1.1/manifest.json').read_text());results=[]
assert len(m['assets'])==13 and m['total_bytes']<3_000_000
for a in m['assets']:
 p=root/a['file'];assert p.stat().st_size==a['bytes'];assert a['license']=='CC0-1.0'
 assert a['bytes'] <= (2_000_000 if a['loop'] and 'garden' in a['file'] else 50_000)
 pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-ac','1','-ar','32000','pipe:1'])
 w=np.frombuffer(pcm,dtype='<f4');assert np.isfinite(w).all();rms=float(np.sqrt(np.mean(w*w)));peak=float(np.max(np.abs(w)));assert rms>.001 and peak<.95
 duration=len(w)/32000;assert abs(duration-a['seconds'])<.03
 seam=float(abs(w[0]-w[-1]));
 if a['loop']:assert seam<.03,(a['file'],seam)
 results.append({'file':a['file'],'bytes':a['bytes'],'seconds':duration,'rms':rms,'peak':peak,'loop_seam_delta':seam if a['loop'] else None,'status':'PASS'})
out=root/'screens/build-v1.1-audio-assets.json';out.write_text(json.dumps(results,indent=2)+'\n');print('PASS: 13 decodable, non-silent, unclipped assets; both loop seams and all file budgets pass')

"""Verify final-source evidence, retain failed attempts, and index review frames."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[1]; screens=root/'screens'
sha=hashlib.sha256((root/'index.html').read_bytes()).hexdigest()
def read(folder, file='build-v1-fix5-results.json'):
 p=screens/folder/file; d=json.loads(p.read_text()); assert d['source_sha256']==sha,(p,'wrong source');return d
main=read('build-v1-fix5-final');retry=read('build-v1-fix5-recheck');clean=read('build-v1-fix5-clean');fix3=read('build-v1-fix5-fix3-final','build-v1-fix3-results.json')
selected={r['case']:(r,'build-v1-fix5-final',main) for r in main['results']}
for r in retry['results']: selected[r['case']]=(r,'build-v1-fix5-recheck',retry)
assert len(selected)==18 and all(r[0]['status']=='PASS' for r in selected.values())
assert len(clean['results'])==12 and all(r['status']=='PASS' for r in clean['results'])
fix3retry=read('build-v1-fix5-fix3-recheck','build-v1-fix3-results.json')
fix3selected={r['case']:{**r,'folder':'build-v1-fix5-fix3-final'} for r in fix3['results']}
for r in fix3retry['results']:fix3selected[r['case']]={**r,'folder':'build-v1-fix5-fix3-recheck'}
assert len(fix3selected)==10 and all(r['status']=='PASS' for r in fix3selected.values())
reg=json.loads((screens/'build-v1-fix5-regressions.json').read_text());assert len(reg)==7 and all(r['exit']==0 for r in reg)
for r in clean['results']:selected[r['case']]=(r,'build-v1-fix5-clean',clean)
keys=[];videos=[]
for case,(r,folder,data) in selected.items():
 if r.get('invite_ms'):assert r['invite_ms']>=28000
 videos.append({'case':case,'file':folder+'/'+r['video']})
 for f in data['frames']:
  if f['case']!=case:continue
  label=f['label']; kind=case.split('-')[0]; clean_case=case.endswith('clean')
  keep=(kind=='H' and (clean_case and label not in ['fresh','crafted','wall-1','wall-3','one-block-rearmed'] or not clean_case and label=='hana-house-three-roof'))
  keep|=kind=='U' and clean_case and label in ['free-walls-invite','hana-house-three-roof','house-question-options','house-finale-confetti']
  keep|=kind=='L' and label in ['saved-house-revisit-invite','house-question-options','house-finale-confetti']
  keep|=kind=='Q' and label in ['two-shows-not-spent','fifth-blocked','cap-persists','new-world-zero']
  keep|=kind=='R' and label in ['expired-no-slot-spent','one-block-rearmed','rearmed-expiry-confetti','rearmed-completion-confetti']
  keep|=kind=='I' and label in ['invite-29s','waited-show-confetti']
  keep|=clean_case and kind=='F' and label.endswith('-confetti')
  keep|=clean_case and kind=='S' and label in ['second-layer','third-layer']
  keep|=clean_case and kind=='V' and label=='version'
  if keep:
   file=folder+'/'+f['file'];assert (screens/file).is_file();keys.append({**f,'file':file})
confetti=[f['confettiPixels'] for f in clean['frames'] if 'confettiPixels' in f]
assert confetti and min(confetti)>=35
attempts=[]
for p in sorted(screens.glob('build-v1-fix5-*/**/*results.json')):
 try:d=json.loads(p.read_text())
 except (ValueError,OSError):continue
 if isinstance(d,dict) and 'results' in d:attempts.append({'file':str(p.relative_to(screens)),'source_sha256':d.get('source_sha256'),'results':d['results']})
summary={'source_sha256':sha,'source_md5':hashlib.md5((root/'index.html').read_bytes()).hexdigest(),'main':{c:{**r,'folder':f} for c,(r,f,d) in selected.items() if c.endswith('log')},'clean':clean['results'],'fix3':list(fix3selected.values()),'regressions':reg,'confetti_pixels':{'frames':len(confetti),'min':min(confetti),'max':max(confetti)},'key_frames':keys,'videos':videos,'attempts':attempts}
(screens/'build-v1-fix5-evidence.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
lines=['# Build v1 fix5 关键截图与录像','',f'HTML SHA-256: `{sha}`','', '真实鼠标；无状态注入。Git 保留关键 PNG/JSON；完整录像在交付目录对应子目录的 `build-v1-fix5-video/`，工作树同名路径也可查看。较早失败记录保留在 evidence.json 的 attempts 中，下面只列最终通过用例。','']
for f in keys:lines.append(f"- {f['case']} · {f['label']}：[PNG]({f['file']})")
lines+=['','## 录像','']+[f"- {v['case']}：[WebM]({v['file']})" for v in videos]
(screens/'build-v1-fix5-screens.md').write_text('\n'.join(lines)+'\n')
(root/'.fix5-keyfiles').write_text('\n'.join('screens/'+f['file'] for f in keys)+'\n')
print(json.dumps({'main_pass':18,'clean_pass':12,'fix3_pass':10,'regression_pass':7,'key_frames':len(keys),'confetti':summary['confetti_pixels']},ensure_ascii=False))

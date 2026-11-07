#!/usr/bin/env python3
"""Original, deterministic instrumental/SFX synthesis. No samples or voices.
Source and generated assets dedicated under CC0-1.0. Python/numpy -> PCM -> Ogg.
"""
import json, subprocess, tempfile, wave
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'audio'/'build-v1.1'; OUT.mkdir(parents=True,exist_ok=True)
SR=32000
rng=np.random.default_rng(1105)
def note(freq,duration=.36,bright=.22):
 t=np.arange(round(duration*SR))/SR
 env=(1-np.exp(-t*160))*np.exp(-t*9)*np.minimum(1,(duration-t)*90)
 return env*(np.sin(2*np.pi*freq*t)+bright*np.sin(2*np.pi*2*freq*t)+.07*np.sin(2*np.pi*3*freq*t))
def seq(notes,step=.10,tail=.36):
 out=np.zeros(round((len(notes)*step+tail)*SR))
 for i,f in enumerate(notes):
  w=note(f,tail);at=round(i*step*SR);out[at:at+len(w)]+=w*.25
 return out
def noise(d=.12):
 t=np.arange(round(d*SR))/SR;w=rng.normal(0,.25,len(t));w=np.convolve(w,np.ones(5)/5,mode='same');return w*np.exp(-t*36)*(1-np.exp(-t*500))
def mix(*waves):
 o=np.zeros(max(map(len,waves)))
 for w in waves:o[:len(w)]+=w
 return o
def save(name,pcm,loop=False):
 peak=float(np.max(np.abs(pcm)));pcm=pcm*(.72/max(.72,peak))
 with tempfile.TemporaryDirectory(dir=OUT) as td:
  wav=Path(td)/'source.wav'
  with wave.open(str(wav),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(SR);f.writeframes((pcm*32767).astype('<i2').tobytes())
  file=OUT/(name+'.ogg');subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-c:a','libvorbis','-q:a','3',str(file)],check=True)
 size=file.stat().st_size;assert size<=(2_000_000 if name=='garden-loop' else 50_000)
 return {'file':str(file.relative_to(ROOT)),'source':'Original self-synthesis: tools/make-build-v1.1-audio.py','license':'CC0-1.0','seconds':round(len(pcm)/SR,4),'bytes':size,'loop':loop}
# Eight 4/4 bars, 104 BPM; wrap decaying tails into the loop's opening.
beat=60/104; length=round(32*beat*SR); bg=np.zeros(length)
def put(w,at):
 ix=(np.arange(len(w))+round(at*SR))%length;np.add.at(bg,ix,w)
def hz(m):return 440*2**((m-69)/12)
chords=[(48,60,64,67),(45,60,64,69),(41,60,65,69),(43,59,62,67),(41,60,65,69),(48,60,64,67),(38,62,65,69),(43,59,62,67)]
melody=[[76,79,81,79,76,74,72,74],[76,79,81,84,81,79,76,74],[77,81,79,77,76,74,72,74],[74,79,77,74,71,74,79,0],[77,81,84,81,79,77,76,74],[76,79,84,79,76,74,72,0],[74,77,81,77,76,74,72,74],[71,74,79,77,76,74,71,0]]
for bar,ch in enumerate(chords):
 for k in range(8):
  at=(bar*4+k*.5)*beat
  if melody[bar][k]:put(note(hz(melody[bar][k]),.48)*.14,at)
  put(note(hz(ch[1+k%3]),.32)*.055,at+.012)
  put(noise(.07)*.12,at+beat*.25)
 for k in (0,2):put(note(hz(ch[0]),.65,bright=.08)*.17,(bar*4+k)*beat)
entries=[save('garden-loop',bg,True)]
entries.append(save('harvest',mix(noise(.17)*1.3,note(190,.20)*.24)))
entries.append(save('place',mix(note(310,.16)*.25,noise(.06)*.5)))
entries.append(save('remove',seq([520,330],.06,.22)))
entries.append(save('craft',seq([523.25,659.25,783.99],.09,.32)))
entries.append(save('confetti',mix(seq([1046.5,1318.5,1568],.06,.21)*.6,noise(.18)*.25)))
entries.append(save('star',seq([783.99,1046.5,1318.5],.085,.38)))
entries.append(save('correct',seq([659.25,880],.10,.28)))
entries.append(save('wrong',seq([329.63,293.66],.10,.25)*.6))
t=np.arange(round(.42*SR))/SR
entries.append(save('enter-car',mix(noise(.13)*1.7,note(110,.16)*.35,.13*np.sin(2*np.pi*(62*t+34*t*t))*np.minimum(1,t*30)*np.minimum(1,(.42-t)*20))))
t=np.arange(2*SR)/SR
# Even pulse count so the idle loop has no click. Low rumble plus a soft exhaust tick.
pulse=np.sin(np.pi*((t*14)%1))**8
rumble=.55*np.sin(2*np.pi*42*t)+.18*np.sin(2*np.pi*84*t)+.22*np.sin(2*np.pi*21*t)
hiss=np.convolve(np.random.default_rng(1105).normal(0,1,len(t)),np.ones(48)/48,mode='same')
entries.append(save('engine',(rumble*(.35+.65*pulse)+hiss*.07*pulse)*.22,True))
t=np.arange(round(.28*SR))/SR;env=np.minimum(1,t*50)*np.minimum(1,(.28-t)*25)
entries.append(save('horn',.19*(np.sin(2*np.pi*392*t)+.6*np.sin(2*np.pi*493.88*t))*env))
entries.append(save('pet',seq([880,1046.5],.07,.22)*.6))
cries=[]
if (OUT/'manifest.json').exists():
 old=json.loads((OUT/'manifest.json').read_text())
 cries=[a for a in old.get('assets',[]) if str(a.get('file','')).split('/')[-1].startswith('cry-')]
entries.extend(cries)
manifest={'license':'CC0-1.0','external_samples':bool(cries),'voice':False,'total_bytes':sum(x['bytes'] for x in entries),'assets':entries}
if cries: manifest['cry_note']='cry-*.ogg are real recordings listed in CRIES.txt. They are not synthesized.'
assert manifest['total_bytes']<3_000_000
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(OUT/'LICENSE.txt').write_text('Original self-synthesized instrumental composition and sound effects, except the animal cries.\nDedicated to the public domain under CC0 1.0 Universal.\nLicense: https://creativecommons.org/publicdomain/zero/1.0/\nSource: tools/make-build-v1.1-audio.py\n\ncry-*.ogg are real recordings, not synthesized sounds. Authors and licenses are in CRIES.txt.\n')
print(json.dumps({'assets':len(entries),'total_bytes':manifest['total_bytes']}))

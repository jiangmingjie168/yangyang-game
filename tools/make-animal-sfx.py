#!/usr/bin/env python3
"""Short original animal calls for Block World. No samples or voices. CC0."""
import json, subprocess, tempfile, wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'audio' / 'build-v1.1'
SR = 22050
rng = np.random.default_rng(33)

def lowpass(x, cutoff):
    a = min(1.0, cutoff / (SR / 2))
    y = np.empty_like(x)
    acc = 0.0
    for i, s in enumerate(x):
        acc += a * (s - acc)
        y[i] = acc
    return y

def tone(freq, dur, glide=0.0, vib=0.0, vib_hz=6.0, noise=0.0, tilt=1.0):
    n = max(1, int(dur * SR))
    t = np.arange(n) / SR
    f = freq * (1 + glide * t) * (1 + vib * np.sin(2 * np.pi * vib_hz * t))
    phase = 2 * np.pi * np.cumsum(f) / SR
    wave = np.sin(phase) + 0.35 * np.sin(2 * phase) + tilt * 0.12 * np.sin(3 * phase)
    if noise:
        nz = lowpass(rng.normal(0, 1, n), 900)
        wave = wave * (1 - noise) + nz * noise
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.85
    return wave * env

def place(parts):
    total = 0
    for at, w in parts:
        total = max(total, at + len(w))
    out = np.zeros(total)
    for at, w in parts:
        out[at:at + len(w)] += w
    return out

def save(name, pcm):
    peak = float(np.max(np.abs(pcm))) or 1
    pcm = pcm * (0.7 / max(0.7, peak))
    fade = min(len(pcm) // 8, int(0.02 * SR))
    if fade:
        pcm[:fade] *= np.linspace(0, 1, fade)
        pcm[-fade:] *= np.linspace(1, 0, fade)
    with tempfile.TemporaryDirectory(dir=OUT) as td:
        wav = Path(td) / 'a.wav'
        with wave.open(str(wav), 'wb') as f:
            f.setnchannels(1)
            f.setsampwidth(2)
            f.setframerate(SR)
            f.writeframes((np.clip(pcm, -1, 1) * 32767).astype('<i2').tobytes())
        file = OUT / (name + '.ogg')
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav), '-c:a', 'libvorbis', '-q:a', '2', str(file)], check=True)
    return {'file': str(file.relative_to(ROOT)), 'source': 'Original self-synthesis: tools/make-animal-sfx.py', 'license': 'CC0-1.0', 'seconds': round(len(pcm) / SR, 4), 'bytes': file.stat().st_size, 'loop': False, 'animal': name[4:]}

def s(sec):
    return int(sec * SR)

calls = {
    'cry-dog': place([(0, tone(180, 0.09, glide=1.2, noise=0.55)), (s(0.13), tone(160, 0.11, glide=0.8, noise=0.5))]),
    'cry-cat': tone(520, 0.42, glide=0.55, vib=0.04, vib_hz=5.5),
    'cry-pig': place([(0, tone(240, 0.12, glide=-0.6, noise=0.35)), (s(0.14), tone(200, 0.16, glide=-0.4, noise=0.4))]),
    'cry-cow': tone(150, 0.55, glide=-0.35, vib=0.03, vib_hz=4),
    'cry-sheep': tone(360, 0.4, glide=0.15, vib=0.18, vib_hz=9, noise=0.15),
    'cry-chicken': place([(0, tone(980, 0.06, glide=-0.4)), (s(0.08), tone(760, 0.05, glide=-0.3)), (s(0.16), tone(1100, 0.07, glide=-0.5))]),
    'cry-duck': place([(0, tone(420, 0.09, glide=-0.5, noise=0.25)), (s(0.12), tone(390, 0.1, glide=-0.45, noise=0.25))]),
    'cry-horse': tone(420, 0.5, glide=0.9, vib=0.08, vib_hz=12),
    'cry-rabbit': place([(0, tone(1400, 0.06, glide=0.4)), (s(0.09), tone(1600, 0.07, glide=0.3))]),
}

entries = []
for name, pcm in calls.items():
    meta = save(name, pcm)
    assert meta['bytes'] < 40000
    assert meta['seconds'] < 0.8
    entries.append(meta)

manifest_path = OUT / 'manifest.json'
manifest = json.loads(manifest_path.read_text())
kept = [a for a in manifest['assets'] if not str(a.get('file', '')).split('/')[-1].startswith('cry-')]
manifest['assets'] = kept + entries
manifest['total_bytes'] = sum(a['bytes'] for a in manifest['assets'])
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'added': len(entries), 'total_bytes': manifest['total_bytes']}))

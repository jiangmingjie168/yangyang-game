#!/usr/bin/env python3
"""pip install edge-tts==7.3.1; python3 brain/scripts/generate-voice.py [--limit 100]
No limit generates the entire manifest. Existing nonempty files are reused.
"""
import argparse, asyncio, hashlib, json, pathlib
import edge_tts
root = pathlib.Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'lines-manifest.json').read_text())
def key(text):
    return hashlib.sha256(text.strip().lower().encode()).hexdigest()[:20]
async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int)
    parser.add_argument('--retries', type=int, default=3)
    args = parser.parse_args()
    folder = root / 'audio'
    folder.mkdir(exist_ok=True)
    for line in manifest['lines'][:args.limit]:
        target = folder / (key(line['text']) + '.mp3')
        if target.exists() and target.stat().st_size: continue
        for attempt in range(args.retries):
            tmp = target.with_suffix('.tmp')
            try:
                await edge_tts.Communicate(line['text'], manifest['voice'], rate=manifest['rate']).save(str(tmp))
                if not tmp.stat().st_size: raise RuntimeError('Empty audio')
                tmp.replace(target)
                break
            except Exception:
                tmp.unlink(missing_ok=True)
                if attempt + 1 == args.retries: raise
                await asyncio.sleep(2 * (attempt + 1))
    index = {line['text'].strip().lower(): key(line['text']) for line in manifest['lines'] if (folder / (key(line['text'])+'.mp3')).exists()}
    (folder / 'index.json').write_text(json.dumps(index,indent=2)+'\n')
    files = list(folder.glob('*.mp3'))
    print(json.dumps({'line_count':len(manifest['lines']),'audio_file_count':len(files),'total_bytes':sum(f.stat().st_size for f in files)}))
asyncio.run(main())

#!/usr/bin/env python3
"""pip install edge-tts==7.3.1; python3 brain/scripts/generate-voice.py [--limit 100]
No limit generates the entire manifest. Existing nonempty files are reused.
"""
import argparse, asyncio, hashlib, json, pathlib, re
import edge_tts
root = pathlib.Path(__file__).resolve().parents[1]

def key(text):
    return hashlib.sha256(text.strip().lower().encode()).hexdigest()[:20]
async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int)
    parser.add_argument('--manifest', type=pathlib.Path, default=root / 'lines-manifest.json')
    parser.add_argument('--names', help='Comma-separated ASCII names; generate six Jenny atoms per name')
    parser.add_argument('--retries', type=int, default=3)
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text())
    full_manifest = json.loads((root / 'lines-manifest.json').read_text())
    if args.names:
        names = list(dict.fromkeys(n.strip() for n in args.names.split(',')))
        if any(not re.fullmatch(r'[A-Za-z]{1,16}(?: [A-Za-z]{1,16})?', n) for n in names):
            parser.error('Names must contain one or two ASCII words, 1-16 letters each')
        presets = json.loads((root / 'names.json').read_text())
        (root / 'names.json').write_text(json.dumps(list(dict.fromkeys(presets + names)), indent=2) + '\n')
        manifest['lines'] = [{'text': text, 'category': 'name'} for n in names for text in
            [n + '!', 'Hi ' + n + '.', 'Hello ' + n + '.', 'Good morning, ' + n + '.', 'Good afternoon, ' + n + '.', 'Good evening, ' + n + '.']]
        existing = {line['text'] for line in full_manifest['lines']}
        full_manifest['lines'].extend(line for line in manifest['lines'] if line['text'] not in existing)
        (root / 'lines-manifest.json').write_text(json.dumps(full_manifest, indent=2) + '\n')
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
    # A delta or --names run must never discard the existing published index.
    index_path = folder / 'index.json'
    index = json.loads(index_path.read_text()) if index_path.exists() else {}
    index.update({line['text'].strip().lower(): key(line['text']) for line in full_manifest['lines'] + manifest['lines'] if (folder / (key(line['text'])+'.mp3')).exists() and (folder / (key(line['text'])+'.mp3')).stat().st_size})
    (folder / 'index.json').write_text(json.dumps(index,indent=2)+'\n')
    files = list(folder.glob('*.mp3'))
    print(json.dumps({'line_count':len(manifest['lines']),'audio_file_count':len(files),'total_bytes':sum(f.stat().st_size for f in files)}))
asyncio.run(main())

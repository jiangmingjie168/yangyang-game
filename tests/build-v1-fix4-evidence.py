"""Collect final-source mouse evidence, preserving any superseded failures.
Usage: python3 tests/build-v1-fix4-evidence.py [matrix recheck directory ...]
"""
import hashlib
import json
import sys
from pathlib import Path
root = Path(__file__).resolve().parents[1]
screens = root / 'screens'
source = (root / 'index.html').read_bytes()
sha = hashlib.sha256(source).hexdigest()

def collect(paths, filename, expected):
    winners = {}
    attempts = []
    for folder in paths:
        d = json.loads((folder / filename).read_text())
        assert d['source_sha256'] == sha, f'Stale source: {folder}'
        for r in d['results']:
            result = dict(r, evidence_dir=str(folder.relative_to(screens)))
            attempts.append(result)
            winners[r['case']] = (result, [dict(f, file=str((folder / f['file']).relative_to(screens))) for f in d['frames'] if f['case'] == r['case']])
    assert len(winners) == expected, (len(winners), expected)
    assert all(r['status'] == 'PASS' for r, _ in winners.values()), winners
    return {'results': [r for r, _ in winners.values()], 'frames': [f for _, fs in winners.values() for f in fs], 'attempts': attempts}

new = collect([screens / 'build-v1-fix4-final'], 'build-v1-fix4-results.json', 14)
matrix = collect([screens / 'build-v1-fix4-matrix-final'] + [Path(p).resolve() for p in sys.argv[1:]], 'build-v1-fix3-results.json', 20)
regressions = json.loads((screens / 'build-v1-fix4-regressions.json').read_text())
assert len(regressions) == 7 and all(r['exit'] == 0 for r in regressions)
report = {'source_sha256': sha, 'index_md5': hashlib.md5(source).hexdigest(), 'new_mouse': new, 'fix3_matrix': matrix, 'regressions': regressions}
(screens / 'build-v1-fix4-evidence.json').write_text(json.dumps(report, indent=2) + '\n')
key_labels = {'F-idle-confetti', 'F-free-confetti', 'M-invite-10s', 'M-free-confetti', 'C-closed-confetti', 'C-question-one', 'C-answer-finale', 'C-third-manual-finale', 'R-expired-unanswered', 'R-rearmed-confetti', 'R-third-completion-confetti', 'R-daily-cap', 'R-cap-persists', 'N-new-cluster-confetti', 'N-second-free-confetti', 'S-against-wall', 'S-second-layer', 'S-third-layer', 'V-visible-version'}
keys = [f for f in new['frames'] if f['label'] in key_labels]
keys += [f for f in matrix['frames'] if f['label'] in {'J-cheer', 'B-normal-place', 'B-normal-top-stack', 'P-animal-refused'}]
text = '# Build v1 fix4 screenshot index\n\nFinal HTML SHA-256: `' + sha + '`\n\n'
text += '\n'.join('- [' + f['case'] + ' / ' + f['label'] + '](' + f['file'] + ')' for f in keys) + '\n'
(screens / 'build-v1-fix4-screens.md').write_text(text)
print(f'PASS: 14 new mouse cases, 20 regression matrix cases, 7 suites; {len(keys)} key frames')

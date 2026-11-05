# Block World v1.1 evidence

Final source SHA-256: `e5ded9e7315c332113a35de116a6b978729581f3891c05b4cd98cb4b17537cf3`

## New feature matrix

18/18 PASS (including audio), 118 screenshots. All gameplay inputs are real mouse events; evaluate is read-only. C/P start with empty storage and gather wood. U/M/O use declared initial save fixtures.

| Case | Result | Seconds |
| --- | --- | --- |
| C-desktop | PASS | 12.4 |
| U-desktop | PASS | 17.2 |
| P-desktop | PASS | 11.4 |
| M-desktop | PASS | 7.9 |
| Otree-desktop | PASS | 7.9 |
| Owater-desktop | PASS | 7.9 |
| Obuilding-desktop | PASS | 8.3 |
| Ofence-desktop | PASS | 8.1 |
| C-mobile | PASS | 11.7 |
| U-mobile | PASS | 18.1 |
| P-mobile | PASS | 11.5 |
| M-mobile | PASS | 7.8 |
| Otree-mobile | PASS | 7.7 |
| Owater-mobile | PASS | 7.7 |
| Obuilding-mobile | PASS | 8.2 |
| Ofence-mobile | PASS | 7.9 |

## Mobile review path

- [Wheel intermediate](build-v1.1-with-audio-final/build-v1.1-C-mobile-wheel-chain.png)
- [Placed Car](build-v1.1-with-audio-final/build-v1.1-C-mobile-placed-celebration.png)
- [Seated driver](build-v1.1-with-audio-final/build-v1.1-C-mobile-seated.png)
- [Rock collision](build-v1.1-with-audio-final/build-v1.1-C-mobile-rock-stop.png)
- [Parked after refresh](build-v1.1-with-audio-final/build-v1.1-C-mobile-parked-persists.png)
- [Car/Wheel question](build-v1.1-with-audio-final/build-v1.1-C-mobile-car-wheel-question.png)
- [Car Show finale](build-v1.1-with-audio-final/build-v1.1-C-mobile-car-wheel-finale.png)
- [Missing materials](build-v1.1-with-audio-final/build-v1.1-M-mobile-missing-materials.png)
- [Wall menu](build-v1.1-with-audio-final/build-v1.1-U-mobile-wall-menu.png)
- [Stone walls](build-v1.1-with-audio-final/build-v1.1-U-mobile-wall-celebration.png)
- [Flower yard](build-v1.1-with-audio-final/build-v1.1-U-mobile-yard-celebration.png)
- [All upgrades persisted](build-v1.1-with-audio-final/build-v1.1-U-mobile-upgrades-persist.png)
- [Pen at spawn](build-v1.1-with-audio-final/build-v1.1-P-mobile-placed-celebration.png)
- [Water stop](build-v1.1-with-audio-final/build-v1.1-Owater-mobile-gentle-stop.png)
- [Tree stop](build-v1.1-with-audio-final/build-v1.1-Otree-mobile-gentle-stop.png)
- [Building stop](build-v1.1-with-audio-final/build-v1.1-Obuilding-mobile-gentle-stop.png)
- [Fence stop](build-v1.1-with-audio-final/build-v1.1-Ofence-mobile-gentle-stop.png)

Asset masters: `../icons/build-v1.1-*.png`; overview: [assets](build-v1.1-assets.png).

Failed development runs are not final acceptance evidence. Final old-flow regression paths are listed in the delivery report.

## Audio addendum

- [Actual playback paths](build-v1.1-with-audio-final/build-v1.1-A-mobile-sound-playback.png)
- [Independent parent switches](build-v1.1-with-audio-final/build-v1.1-A-mobile-sound-settings-off.png)
- [Sound restored](build-v1.1-with-audio-final/build-v1.1-A-mobile-sound-restored.png)
- [Asset decode / loop / size checks](build-v1.1-audio-assets.json)

Original pre-audio main proof remains in `build-v1.1-final-v2/`; final matrices above use the audio-inclusive source.

Final House/Pen/fix5 matrix: `build-v1.1-with-audio-craftable-verified/` (20 complete PASS cases, 176 screenshots, 494 pointer records; provenance retained).

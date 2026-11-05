# v1.1 QA + feel evidence

Release HUD: **build a0b0871+v11qa**. Final-source gate: [final/results.json](final/results.json).
`before/` is the original `4ebf8aa` runtime with the same proportion fixture. All other delivered screenshots below use the release runtime.

## Start here (mobile)

| Requirement | Screenshot |
| --- | --- |
| Text-only House Show | [House choices](final/targeted/house-mobile-text-only-house.png) |
| Default Speak, no OK | [Speak](final/targeted/speak-mobile-speak-default.png) |
| Two failures → small I said it | [Fallback](final/targeted/speak-mobile-two-failures.png) |
| Recognized speech vs self-claim | [Parent log](final/targeted/speak-mobile-parent-real-vs-claim.png) |
| Reward: Continue, no Listen/Speak | [Explore reward](final/targeted/quota-mobile-explore-reward-continue.png) |
| Yard question | [Yard](final/regression/build-v1.1-U-mobile-yard-question.png) |
| Roof question | [Roof](final/regression/build-v1.1-U-mobile-roof-question.png) |
| Window question | [Window](final/regression/build-v1.1-U-mobile-window-question.png) |
| Remodel at full Show cap | [Capped remodel](final/regression/build-v1.1-M-mobile-cap-part-question-answered.png) |
| Ground tap, flowers, partial support | [House placement](final/targeted/house-mobile-relaxed-ground-snap.png) |
| Five explore quizzes, then Car Show | [Separate counters](final/targeted/quota-mobile-car-show-after-five-explore.png) |
| Animal card, hearts, companion bubble | [Dog](final/targeted/explore-mobile-animal-name-hearts-bubble.png) |
| Physical world answer preserved | [Find Dog completed](final/targeted/physical-mobile-physical-answer-complete.png) |
| Proportions before | [Before](before/proportion-mobile-world-scale.png) |
| Proportions after | [After](final/targeted/proportion-mobile-world-scale.png) |
| Music/SFX and actual playback | [Audio](final/regression/build-v1.1-A-mobile-sound-playback.png) |

Desktop equivalents are alongside each mobile capture. Full house/car appearance, persistence, collision, recovery, free-building praise, invitation timing, and quota evidence is under `final/regression/` and `final/craftable/`.

## Test provenance

- `final/targeted/results.json` / `clicks.json`: seven scenarios × desktop/mobile; raw runtime HTML; initial save fixtures; actual mouse input; read-only evaluate; browser speech boundary fixtures.
- `final/regression/build-v1.1-results.json` / `build-v1.1-clicks.json`: nine scenarios × desktop/mobile; original runtime and mouse input; actual audio play-success counters.
- `final/craftable/build-v1-craftable-results.json`: ten scenarios × desktop/mobile. Historical raw-material fixture APIs remain explicitly documented in that test.
- `final/fix3/build-v1-fix3-results.json`: five scenarios × desktop/mobile; natural mouse harvesting and loose-block placement.
- `final/compat/results.json`: archived save compatibility, desktop/mobile.
- Other suites have `run.log` under their named folder. Source MD5/SHA-256 and each suite’s exit code are in the root gate JSON.

Speech fixtures validate control/accounting behavior, not real microphone accuracy. Simulated mobile viewports do not replace Hana’s device retest. Earlier failed/superseded attempts remain local under `screens/build-v1.1-qa-dev/`; they are not substituted for final PASS results.

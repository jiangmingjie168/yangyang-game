# Block World v1.1 — QA UX, feel, and Hana retest

Baseline: `4ebf8aacafa30f800bc54acc0c4d076eac3cb432`. Branch: `codex-build-v1.1`.
HUD: **build a0b0871+v11qa**. Runtime: `index.html`; existing `audio/build-v1.1/` remains required.
This document supersedes the older v1.1 notes where question controls, remodel quizzes, House support, or animal proportions differ.

## 1. Word choices contain text only

Building Show, remodel questions, and exploration “What is this?” choices contain word text, including distractors. The large target picture stays visible. After three wrong choices the correct answer may reveal its picture beside the word; wrong taps do not unlock self-claim.

The physical Treasure Quiz remains a world action (“Find the DOG!”), with no word-choice card. A correct animal tap now completes it directly: petting range is 64 world pixels, whereas the passive proximity check is 56. This fixes a pre-existing gap where a successful pat could leave the physical question unfinished.

## 2. Speak and honest fallback

Speak questions hide OK. Building and Word Book practice begin with Speak; exploration also offers Listen. Two failed recognition attempts unlock a secondary **I said it** button. No-speech, errors, unavailable recognition, unmatched results, and watchdog expiry count once per attempt; result/end/error handlers are detached before aborting to prevent double counting.

Self-claim closes with neutral thanks. It awards no star, no mastery credit, and no recognized-speaking count. The parent gear’s weekly table now separates **recognized speech** and **I said it claims**, with scenes for buildings and Word Book practice. Both categories survive reload. Recognized Show answers still earn their star. Voluntary atlas practice records speech but does not earn a building star.

Recast practice also hides OK and uses the two-failure fallback. Ordinary free conversation, invitations, and free-building praise retain their existing dismissal behavior.

## 3. Rewards and voluntary practice

Exploration and building answer rewards contain no Listen/Speak controls (not merely disabled controls). They read the target word once, then wait for a large **Continue** button or a tap on the card. The physical Treasure Quiz’s word reward has Continue too, and its duplicate word playback was removed. Self-claim shows no reward stars.

Word Book rows now have correctly labelled **Listen to [word]** and **Practice [word]** controls. Practice opens a Speak card with the same recognition/fallback accounting. Answer rewards no longer trigger an unsolicited recast after dismissal.

Question/reward cards are wider and have enough vertical space in short landscape viewports, keeping Speak and Continue visible above the movement controls.

## 4. A question after every remodel — retest #2

Each completed Wall, Yard, Roof, and Window remodel schedules one question about its actual changed part after the celebration. It does not require accepting a Show invitation and does not consume or check Show quota. It also works with four Shows already spent.

| Remodel | Target | Distractor policy |
| --- | --- | --- |
| Wall | Stone | Another learned material/part word |
| Yard | Flower | Another learned material/part word |
| Roof | Roof | Another learned material/part word |
| Window | Window | Another learned material/part word |

The target is introduced by the remodel and added to learned vocabulary before its question. Both options are learned words. The pending part key is saved with the house, waits through panels, and is removed on completion; reloading while pending preserves it. The active question prevents opening another remodel over it. Costs, material changes, celebration, tier/level persistence, pickup, and replacement remain intact.

## 5. House placement — retest #3

House now shares Pen’s relaxed support rule: flowers and wheat do not obstruct the footprint, and one valid supporting column is sufficient. Solid objects, buildings, trees, fences, and water still obstruct the occupied footprint. Car keeps full dry-land support.

Clicking a natural ground block resolves to the air cell above the surface, including clicks up to two rows into the ground. The whole object’s left-bottom anchor still owns the reach check. A five-column level, clear pad at `origin + 6 … + 10` is guaranteed beside spawn. Saved modifications apply afterward, so this does not erase player construction when loading a save. Failed placements consume nothing.

## 6. Show quota and exploration — retest #4

Only accepted building Shows increment `build_chat.shows` / `manualShows`, with the existing four-per-day cap. Exploration has its own persisted `adventure.quizDay` / `quizzes` counter; it never consumes a Show slot. Remodel questions consume neither quota. A real-mouse test completes five animal exploration questions, then crafts, places, and successfully answers Car Show as Show #1.

## 7. Animal companion feedback — retest #5 / feel A

A pat shows **Look! A dog!** (or the actual species) alongside its name card and hearts. The first meeting records `adventure.discoveries[species]` and joins the existing pet exploration queue. Subsequent pats do not duplicate first discovery. The no-flee pause remains.

Tamed animals and the third taming pat keep the animal’s own species card instead of replacing it with the generic Pet card. Pet/Follow vocabulary and taming progress still unlock normally. Learned animals remain eligible for their own exploration question regardless of chapter; a cow event can no longer fall back to an unrelated word just because of a chapter vocabulary gate.

## 8. Proportions — feel B

Existing canvas artwork is reused; no emoji replacement, generated voice, external art, or new bitmap dependency. Values below are approximate resting visible heights, relative to the un-hatted child (~42 world pixels); motion, outlines, and pet squash slightly vary them. World scaling does not shrink the generous animal tap halo. Atlas icons stay large for readability.

| Entity | Before | After |
| --- | --- | --- |
| Child | 1.0 (~42 px) | 1.0; unchanged |
| Dog | ~0.9 | ~0.6 (0.68× sprite scale) |
| Cat | ~1.0 | ~0.4 (0.43×) |
| Cow | ~1.0 | ~0.9 high; 1.12× horizontal / 0.95× vertical, wider than tall |
| Flower | ~0.6 | ~0.3; world sprite 32→16 px, grounded at its stem |
| Tree | 5 tiles / ~3.8 | 3 tiles / ~2.3; two canopy rows, still **three harvestable Wood blocks** |
| Other animals | Essentially one size | Sheep 0.8×, pig 0.75×/0.70×, birds 0.45×, rabbit 0.38×, horse 1.08×/1.03× |
| House | 96×96 canvas / 3×3 cells | Unchanged; flat roof has headroom reserved for the taller upgraded roof; both stay inside the same grounded footprint |
| Car | 96×64 px / 3×2 cells | Unchanged; drawing, collision and steering share the footprint |

Before/after screenshots use the same declared starting scene. Older saves can shed redundant explicit AIR modifications where the shorter natural canopy is already air; their effective contents and user modifications are preserved.

## 9. Entity–word–question audit — feel C

| Entity/action | Card / atlas / voice | Question binding | Checked |
| --- | --- | --- | --- |
| Dog, cat, cow, sheep, pig | Species-specific shared `drawAnimal` / `paintIcon`, `WORD` label and species sound | First-meet target retains species; five real questions tested | Yes |
| Tamed dog/cat | Species card; Pet/Follow learned separately | Physical animal tap matches species | Yes |
| Tree / harvested Wood / Leaves | Tree discovery versus harvested resource explicitly distinguished | Existing Tree physical quiz accepts wood/leaves encounters | Yes |
| Flower | Same flower artwork, grounded smaller in world | Yard remodel targets Flower | Yes |
| House kit | Inventory key `houseKit` normalizes to House | House Show; remodel uses changed part | Yes |
| Pen | Inventory `pen` normalizes to Fence (existing vocabulary) | Fence Show, no invented animal label | Yes |
| Car / Wheel | Shared craftable pixel masters in world, crafting, inventory and atlas | Parked Car Show uses Car/Wheel | Yes |
| Wall / Roof / Yard / Window upgrade | Stone / Roof / Flower / Window with matching prompt icon and auto-read | Correct part key, learned distractor, text-only choices | Yes |
| Word Book practice | Selected row key owns picture, Speak target and log key | Recognition and claim tracked separately | Yes |
| Reward | Same answered key owns label/icon/read | No delayed unrelated recast | Yes |

## Verification and delivery

Run `PLAYWRIGHT_MODULE=/tmp/node_modules/playwright CHROME=/usr/bin/google-chrome node tests/run-build-v1.1-qa-feel.cjs` from this worktree. It writes source hashes, per-suite exits, logs, screenshots and pointer records under `screens/build-v1.1-qa-feel/final/`. `BW_SUITES` selects suites; `BW_JOBS` controls concurrency.

- New targeted suite: House ground snap/flower/partial support, text-only Show, voice failure/self-claim/recognized success, parent log/reload, animal name/hearts/no-flee/discovery, exploration reward, five-quiz Show separation, physical-answer quiz, proportions/atlas.
- Existing v1.1 desktop/mobile suite: full car chain, four remodels, cap boundary, Pen, tree/water/building/fence gentle stops, Music/SFX and reload.
- Craftable matrix, old-save compatibility, loose-block placement matrix, geometry contracts, world/adventure, memory/chat, English-only child UI, audio assets, and server tests.
- All targeted gameplay uses real mouse events and the original HTML bytes. Evaluate calls only read state. Initial save fixtures declare materials/terrain/learned history; voice fixtures replace browser recognition/TTS at startup and respond to actual Speak clicks. They do not prove real device microphone accuracy or listening quality.
- Historical tests were updated for explicit Continue, new log columns, animal name feedback, and normalization of redundant AIR save entries. Superseded development failures remain in `screens/build-v1.1-qa-dev/`; final green results are separate.

Final counts, commit, hashes and screenshot handoff are in `/workspace/handoff/build-v1.1/CODEX-REPORT-qa-feel.md`. Screenshot delivery is `/workspace/yangyang-game/screens-deliver/build-v1.1/build-v1.1-qa-feel/`.

Only this branch is committed/pushed. No main merge, preview deployment, formal-site writes, email, Jenny generation, or magic easter egg. Magic stays deferred to v1.2. The orchestrator deploys `index.html` together with the unchanged audio directory.

# ADDENDUM（同分支追加，勿阻塞主线）：v1.1 音乐与音效包

授权：杰哥看邮件；Hana 补充规格 2026-11-05。**不阻塞** Car / 房子改造 / Pen 放宽三项主线。若主线未完成：先完成主线并 commit，再在同一分支 `codex-build-v1.1` 追加 commit 做本包，再 push。编排方部署预览。不 merge main；不生成 Jenny 语音。

必读：`/workspace/handoff/build-v1.1/block-world-v1.1-sound-spec-2026-11-05.md`

## 必做

1. **BGM**：1 首可循环轻快纯音乐，低音量（默认约 30%）；首次沿用现有 “Tap once to turn sound on” 解锁后开始；`visibilitychange`/pagehide 切后台暂停、回前台恢复（仅在 Music 开且已解锁时）。
2. **SFX ≈12**：chop/harvest、place、remove、craft success、confetti、get star、correct(up)、wrong(soft)、enter car、engine loop while driving、horn（坐车时点车身）、pet touch。现有 WebAudio 蜂鸣可保留或替换，CHANGES 写明。
3. **素材**：仅 CC0 / 免费商用（Kenney、freesound CC0、自合成）。CHANGES 逐项列文件路径、来源 URL/名、授权类型。体积：BGM ≤2MB；每 SFX ≤50KB；总包尽量 <3MB；mp3 或 ogg；预加载不阻塞进游戏。
4. **家长面板**：独立开关 Music / SFX（默认开）；台词语音开关保持现状。孩子界面不加音频控件。
5. **验收**：CHANGES 写触发点对照表（动作→文件）。`tests/build-v1.1.cjs`（或追加用例）尽量用真实鼠标断言：资源文件存在、关键触发（例如放置/合成/上车）会走播放路径（可 spy/计数，禁止 evaluate 注入游戏问答）。听感不强制自动化。

## 交付增量

- 音频文件落入仓库合理目录（如 `audio/` 或 `sounds/`）
- 更新 `CHANGES-build-v1.1.md`（来源+许可证+触发表+体积）
- 更新 `/workspace/handoff/build-v1.1/CODEX-REPORT.md`
- commit + push `origin/codex-build-v1.1`（可与主线同一次 push，或 follow-up commit）

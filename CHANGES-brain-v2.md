# Warm Mario welcome — 2026-11-03

- Default name is Mario, including missing/empty legacy saves; parent edits still
  persist locally. Start/resume now shows a warm named English welcome instead
  of the bare Hello card (Hello remains in the existing 42-word pool).
- Brain receives local morning/afternoon/evening and first/returning context.
  Rules own three safe phrase slots; server and client validate complete English
  greetings, exact name, no previous-line repeat, and at most 20 words/200 chars.
  Exercise validation stays at 12 words. Offline fallbacks rotate four saved IDs;
  both last ID and displayed text are saved immediately, including before a reply.
- Welcome leaves play available, has one “Let's play!” button, yields to movement
  and other taps, and closes 900 ms after speech (14-second final-line deadline
  when speech events are missing). Dismissal cancels pending requests and prevents
  late speech/reopening. English TTS uses rate 0.82, volume 0.75, pitch 1.03.
- Validation: all 42 server tests passed locally and on the deployment host;
  `tests/greeting.cjs` passed eight headless groups covering migration, saved edits,
  repeated visits, soft synthetic TTS, offline/no speech, timeout/unsafe replies,
  cancellation, HTTP brain integration, movement, keyboard continue and portrait.
  Existing brain, blocking, playthrough (17 groups), Chinese UI (6 groups) and
  world/save (9 groups) suites all passed. Real device voice quality is untested.
- Backed up production, rsynced only server/tests, restarted `yangyang-brain`.
  Four HTTPS greetings returned `brain/validated`; CORS, bad input and an existing
  exercise also passed. `.env` matched the backup; huanrui hash is unchanged.
  Evidence: `screens/greeting-mario.png`, `screens/greeting-smoke.json`.

# Blocking dialogue + contextual DeepSeek voice — 2026-11-03

Implemented on `codex-brain-v2`, starting from `5d26e5c`. Production brain remains
`https://brain.yydriver.cn/buddy`; empty `BRAIN_URL` still runs entirely on local
templates. No change to the three chapters, 24 tasks, 42-word pool or v1 save key.

- Questions and speak-along now pause world physics and play input immediately,
  including while waiting for the brain. Backdrop, swipe, ×, Esc, movement,
  world controls and other child panels cannot dismiss an unanswered prompt.
  No unanswered timer. After praise, successful prompts close in 1.8 seconds.
- Gentle hint after a miss; after three misses, reveal/highlight the target and
  disable the distractor. Require a repeat/tap confirmation, rather than closing.
  Miss count is separate from the legacy server turn counter (capped at 2).
- Missing/throwing/denied/empty/hanging recognition offers picture answers and
  **I said it**, with an 8-second watchdog. Self-confirmation earns no recognized
  speech or higher speaking-tier credit. These routes work without a brain.
- Parent settings preserve the current question. **跳过本题**, visible near the
  top of that panel, cancels it without reward. Pointer and keyboard skip both
  work; a delayed network response cannot reopen a skipped prompt.
- Optional English nickname in the parent panel persists as `child_name` in the
  v1 save. Send up to six recent game actions, prior answer, matched spoken word
  and four recent buddy lines with the rule-selected target/options/tier.
  Real mining, crafting, building, discoveries, fishing and pets supply context.
- AI may select one exact server-constructed context phrase, e.g.
  `Alex, you found wood!`, `You made a table!`, `Remember wood?`, or
  `You said tree!`, then phrase the fixed exercise. The client independently
  validates those phrases. With available context, provider output must use a
  context phrase and avoid recent-line repeats. One corrective retry, then
  template; options/answer/done, ASCII, length and 12-word limit remain checked.
- Opening and success call the brain in ordinary play. The pending picture preview
  stays silent; only the final validated response (or final fallback) is read,
  avoiding duplicate template + AI narration. Hints/retries stay local.
  Eight requests/minute and sixty/tab session, preserved through refresh with
  sessionStorage; max_tokens stays 180, upstream budget 6 seconds, client 6.5.
  Existing nginx limits stay in place. Quotas always retain usable tap answers.
- CORS-exposed `X-Buddy-Source` / `X-Buddy-Reason` identify validated provider
  output versus server templates; the client separately counts local fallbacks,
  failures and unknown provenance. Counts appear only in the parent panel and
  `BW.adventure().brain`. Raw speech is not added to saves; parent help explains
  the optional online nickname/context/recognition-text transfer.

## Measured before/after — real DeepSeek, synthetic playthrough

`tests/brain-ratio.cjs` uses four seeded encounters with real tree-mining input,
then synthetic recognized answers, spanning tiers 1/2/3. Each has an opening and
success, **8 replies** per run. BEFORE ran against the original deployed module
via SSH, observing whether actual provider JSON passed its validator (no
credentials logged). AFTER uses public HTTPS provenance and asserts the browser's
accepted source counts match. These are controlled encounters, not production
traffic analytics; each encounter starts a fresh page, so cross-encounter memory
is reset. Mock tests separately verify memory/limits within one session.

| Run | Brain | Template | Brain share | Distinct lines | Contextual lines |
| --- | ---: | ---: | ---: | ---: | ---: |
| Before | 8 | 0 | 100% | 4 / 8 | 0 / 8 |
| After | 7 | 1 | 87.5% | 5 / 8 | 7 / 8 |

The original brain was already being called, but all eight accepted replies were
identical to local template text. The change makes its context visible. The final
after trace includes one genuine fallback after provider output failed the stricter
acceptance path; it is counted as a template, not hidden or called an AI response.
Example live line: **Alex, you found wood! I see a tree. Say it!**
Raw per-reply source, timing and synthetic text: `screens/brain-ratio-before.json`
and `screens/brain-ratio-after.json`. No claim of a higher AI acceptance ratio.

## Validation and screenshots

- `node --test brain/server.test.cjs`: **40 passed**, also passed on the server.
  Includes existing validation/retry/timeout/CORS tests, contextual phrase safety,
  untrusted fields, explicit provenance, contextual/repetition repair and fallback.
- `tests/playthrough.cjs`: **all original 17 checks passed**, including actual
  task actions, crop growth, boat travel, pets, quiz, save/resume and offline file.
  Harness now answers blocking questions before continuing; it does not bypass
  the gate. Existing no-network fixtures explicitly disable the optional brain.
- `tests/brain-v2.cjs`: all tier progression, pronunciation-tolerant matching,
  local/HTTP fallback, stale-reply and save-compatibility checks passed. Old
  three-miss auto-close and movement-dismiss expectations now assert the gate.
- `tests/world-v2.cjs` and `tests/chinese-cleanup.cjs`: passed, including two
  discovery rounds, parent logs, 42 pictures, effects, touch scroll and offline.
- `tests/blocking-ai.cjs`: gate inputs, actual touch swipe, >24-second persistence,
  parent pointer/keyboard skip, three-miss confirmation, five speech failure
  modes, network timeout/cancellation, nickname/context/speech transfer,
  source counters, transcript exclusion, session budgets/reload and phone layout.
- Screens: `screens/blocking-dialogue.png`, `screens/blocking-reveal.png`,
  `screens/parent-skip.png`, `screens/blocking-phone.png`,
  `screens/ai-context-line.png` (mock assertion), `screens/ai-live-line.png` (HTTPS).
  Headless Chromium and synthetic recognition; real-device mic/TTS not tested.

## Deployment

Brain redeployed **yes**, service `yangyang-brain` active. Backups:
`/root/backups/yangyang-brain-gate-ai-20261103T110838Z/app` (original) and
`/root/backups/yangyang-brain-gate-ai-context-v2/app` (before context quality gate).
Only explicit code/docs/test files rsynced; `.env` compared byte-for-byte to the
original backup and retained unchanged. `huanrui.conf` SHA-256 verified unchanged.
HTTPS POSTs exercised all three tiers and the actual browser playthrough.
No nginx configuration change, no main update. Push destination: only
`origin/codex-brain-v2`.

---

# Block World brain v2 — Run 1 + Run 2

开发分支：`codex-brain-v2`，起点 `codex-upgrade` / `c3c3b98`。
本轮范围：一「DeepSeek 脑」及二「对话梯度」。未部署、未使用真实 API Key，
`BRAIN_URL` 保持空字符串；没有合并或推送 main。

## 已实现

- `brain/server.cjs`：Node 22+ 标准库独立服务，`POST /buddy`，官方 chat completions
  JSON 模式；API 地址、模型、Key、超时及 CORS 来源均由服务端环境变量配置。
  系统提示词固定在服务端；明确孩子原话不是指令，模型不能选词、判断成绩或改变进度。
- 出站逐项校验：严格 JSON 字段、两个白名单选项（顺序固定）、固定目标答案、规则确定的
  done、纯 ASCII 英文及整段最多 12 词；另有有限句式词表与三级题型结构校验，禁止新话题、
  新内容词和 `wrong`。孩子回答后必须先夸。客户端也复核这些规则。
- 无效返回带纠正提示重试一次，仍无效回落；HTTP/网络异常直接回落。
  服务端整个调用（含重试和响应体读取）共用默认 6000 ms 期限；网页端默认 6500 ms，
  覆盖传输时间。迟到响应不能复活已关闭的对话，移动/关闭会取消请求。
- 本地模板与脑服务采用同一套规则：turn 从 0 开始，0/1/2 最多显示三道同锚点问题，
  turn 3 强制友好收尾，答对也立即进入收尾。模型返回的 answer/done 不能越过规则。
- 游戏的事件触发、安全停稳、章节词池、复习选词和奖励仍由原有游戏规则控制。
  收到可用 say 后才显示/朗读；未配置地址或任何失败均使用本地模板。
- 第一级二选一；某词累计两次一级成功后进入第二级看图说词；两次二级口述成功后进入
  第三级 `I see a … . Say it!`。三级允许补词或整句；沿用近音、单复数、少量拼写差异匹配。
  二/三级起初隐藏答案选项，始终可选 Show choices；识别不可用或未匹配时可回到点选，
  不判错、不扣进度。恢复点选只记一级成功，不能误解锁口语等级。
- 成功使用现有粒子/合成提示音，并显示三颗星；未新增外部音频或游戏运行依赖。
- v1 存档 key、版本与原任务数据保持不变；新增 `adventure.levels` 与
  `adventure.speaking`。每次对话调用保存时间、场景类别、目标词、练习级别、是否收到
  孩子语音文本和匹配到的口述词；不在存档保存原始语音文本，保留最近 2000 条。
  老存档缺字段按空数据处理，历史 reviews 不冒充口语成绩。孩子界面不显示统计。
- `.env.example` 仅为空 Key/配置示例；`.gitignore` 忽略实际 env 文件。
  `brain/README.md` 提供协议、测试及 Linux systemd + nginx + HTTPS 配置示例。

## 实测：本地 HTTP mock（非真实 DeepSeek）

运行：`node --test brain/server.test.cjs`，**26 项通过**（含子测试）。

- 真实本地 HTTP：客户端请求 → 脑服务 → 假 DeepSeek，校验配置模型与 JSON 模式。
- 正确返回、坏/空 JSON、中文、越白名单选项、改换已学选项、答案不在选项、
  偷换目标答案、改变 done/类型、额外字段、超长、无英文、引入新词、wrong、偷换题型。
- 每种无效输出都验证一次纠正成功及两次失败后模板回落。
- HTTP 503、请求超时、响应体挂起均回落且不盲目重试；专门验证纠正重试共用总期限。
  测试使用缩短的 120 ms 期限，生产默认 6 秒配置另做代码核对。
- 三级 prompt/retry/success、42 个词的三级模板、turn 上限、无 Key 零外呼、坏输入拒绝。
- OPTIONS/CORS 精确来源、路由、method、Content-Type 和请求体大小限制。

## 实测：无头 Chromium（非真机）

运行环境：本地静态服务器、Playwright、`/usr/bin/google-chrome`；语音能力标注如下。

`tests/brain-v2.cjs`：

- 用真实指针输入赚两次一级成功 → 进入二级；mock 识别两次口述成功 → 进入三级。
- 看图题隐藏选项；单复数、近音、少量拼写差异、补词及整句回答接受；星光反馈。
- 缺识别能力与不相关语音文本均提供点选；点选不增加二级口述成功次数。
- 三次展示后的自动收尾，无任务惩罚；旧存档/坏可选字段/新级别与开口记录保存恢复。
- 浏览器 → HTTP 脑服务 → HTTP 假 DeepSeek 的三级联通与纠正重试；最终文本用于气泡和
  mock TTS 调用。仅本地 mock 联通测试授权 Chromium 的 loopback 网络权限。
- 直接注入坏服务返回，验证客户端拒绝中文、越白名单、篡改答案/done、额外字段、新词、
  坏 JSON；服务不可达与超时均回落；移动中关闭后迟到回复不能重开气泡。
- `file://` + 离线浏览器上下文能开始游戏并显示模板对话，不依赖脑服务。

`tests/playthrough.cjs`：**17 组全部通过**。

- 三章全部 24 条任务，经真实指针/键盘操作触发任务条件；提供材料与移动检查点夹具，
  不伪造任务完成标志。42 词总数、早期章节屏蔽后期词。
- 树木/挖矿、制作、动物、实际作物生长与收获、钓鱼、乘船过河与下船、驯服与跟随。
- 五类对话锚点、温和重问、复习轮换、收集礼物/图鉴、原有 quiz、游泳、英文朗读 API 调用、
  三章进度/物品/宠物/探索存档恢复、横竖屏及 file 离线运行。
- 识别相关使用 mock；无识别/无 TTS 的点选回落单独覆盖。这里的 TTS 检查仅证明调用英语
  浏览器接口，不证明实际音色。
- 测试辅助函数每次连续制作前隐藏教学词卡，避免词卡挡住下一次指针点击；识别错误后允许
  已清理的 onend 回调，等待收尾时间按本轮 1800 ms 更新。这些只调整测试，不跳过任务判断。

`tests/chinese-cleanup.cjs`：6 组全部通过。卡片、手持标签、制作、词汇册等孩子界面没有中文，
家长说明仍正常打开关闭；无页面、console 或游戏循环错误。

## 仅代码核对 / 尚未实测

- 真实 DeepSeek 的模型可用性、网络延迟和生成效果：未测试，没有真实 Key；上线时配置模型。
- 生产 6 秒超时、Linux systemd、nginx、HTTPS、域名/CORS：文档与代码核对，没有部署或公网验证。
- 模型 Key 只在服务端配置读取；服务没有请求/原文/Key 日志语句；环境文件忽略规则已核对。
- 真机语音三验（识别可用性、TTS 音色、触控手感）**本轮未做**，由团队合并后在真机验收。

## Run 2：三「开口记录」＋四「视觉与反馈」＋五「探索长效性」

日期：2026-11-03。继续在 `codex-brain-v2`、Run 1 提交 `57c40c3` 上开发。
`brain/` 没有改动；未配置真实 Key、未部署，`BRAIN_URL` 仍为空。

### 已实现

- 家长说明增加「家长说明 / 开口记录」两页，支持点按与键盘切页。按本机时区周一
  零点到当前时间汇总本周的单词、口述次数、任务/钓鱼/宠物/乘船/新场景各场景次数。
  使用 Run 1 已随存档保存的 `adventure.speaking`；按实际匹配的 `spoken_word` 统计，
  说出备选词也算说过该词，点选、未匹配语音、未来时间和上周事件不冒充本周词次数。
  不保存原话/录音，不增加儿童界面统计；仍只保留最近 2000 条对话事件，面板说明该限制。
- 记录为空时显示家长专用提示；窄屏和短横屏可滚动，长表格可以触控滚动并返回游戏。
  中文仍只出现在家长面板及原有家长入口。没有增加儿童中文翻译或小字提示。
- 42 个词的全部图画采用内嵌 Canvas 简笔描边、圆角线条和平涂色；动物九种、鱼、
  世界花朵/家具/门/房屋方块/火把/成熟麦子/船/礼物与词卡、制作、背包、图鉴共用画法。
  世界地形仍保持方块结构，物理碰撞、任务与合成规则不变。没有图片/字体/CDN 依赖。
- 狗/猫/牛/马尾巴、鸡/鸭翅膀和动物眨眼采用小幅离散帧动作；对话及词卡里的动物/鱼
  也有低频动画（图卡至多每秒更新 8 次）。系统减少动态效果时停用这些待机动作。
- 礼物发现、伙伴答对、Treasure Quiz 成功共用星光与撒花；粒子池严格最多 90 个，
  普通庆祝 20 个、集齐一轮 30 个，约 0.9–1.3 秒消失。减少动态效果时为短暂静态点缀。
  使用现有 WebAudio 合成三音提示，集齐一轮增加两个高音；音频能力不可用时继续游戏。
- 7 礼物集齐即封存上一轮图鉴、增加完成轮数、清空本轮收集并换藏点，显示英文收尾反馈。
  新位置由种子与轮次决定，从干燥地表选取；连续轮次使用不同列，七个点彼此分开。
  位置按基础世界确定，读档后不会因挖掘/建造改变藏点；不会触发无穷自动收集。
  下一轮有 1.5 秒拾取缓冲。玩法支持持续轮换（布局会循环），不要求永久生成全新地图。
- Word Book 增加本轮 7 格图鉴、累计完成标记、上一轮完整图鉴；上一轮不会被新轮空格覆盖。
  `adventure` 仅新增 `rounds` / `lastRound`，存档 key、版本、42 词和三章 24 任务均保留。
  原有部分收集保留；旧存档已经集齐的七个礼物（包括早期布尔记录）只迁移一次为已完成一轮，
  缺失或不完整的新字段按初始轮次读取。最近一轮图鉴随存档保留，不无限堆积历史图画。

### 实测：无头 Chromium（非真机）

本地静态服务器、`/usr/bin/google-chrome`、Playwright；**没有使用真实 DeepSeek 或麦克风**。

新增 `tests/world-v2.cjs`，**9 组通过**：

1. 固定洛杉矶本地时间，跨夏令时后的周一边界：本周起点计入、前一毫秒排除、
   五类场景次数、识别为备选词、点选/未匹配/未来记录排除；切页、键盘导航与存档恢复。
2. 无记录的旧存档、竖屏家长页和空状态。
3. mock 语音识别近音 `three` → 规则匹配 `tree` → 保存 → 家长页一次 Tree，验证完整记录链路。
4. 通过移动存档检查点并让角色实际下落着陆，连续收集两轮各 7 个礼物，再收第三轮一个。
   不注入 found 标志；验证干地、不同轮次藏点、完成标记、上一轮图画、当前空格与部分进度恢复。
   逐次检查礼物星光/撒花和粒子上限；WebAudio 使用浏览器真实合成 API，检查音符调度调用。
5. 旧完整/部分图鉴、布尔礼物标记迁移，反复读档不重复增加完成次数；坏可选轮次字段回落。
6. 全部 42 张图画非空且有描边；狗等尾巴、鸟类翅膀、鱼尾和其他动物眨眼帧有变化；无外部请求。
7. 真实 UI 开始 Treasure Quiz、在目标附近成功，检查星光/撒花、90 粒子上限、生命周期和合成音符；
   减少动态效果与无 AudioContext 时仍能成功。此项只证明调度和回落，不证明实际听感。
8. 42 行长记录表，在短横屏通过 Chromium CDP 触摸滑动实际滚动、返回按钮可达；**不是触控真机验收**。
9. 真实 `file://`、离线浏览器上下文：开口记录、旧图鉴迁移与完成图鉴正常，关闭语音服务也可玩。

回归也已通过：

- `tests/playthrough.cjs`：17 组，原三章 24 任务、种植真实计时、钓鱼、乘船、驯宠、探索、
  原 quiz、42 词总数、存档恢复、横竖屏、英语朗读 API 调用和 file 离线运行。
- `tests/brain-v2.cjs`：三级解锁与口语/点选边界、浏览器→脑服务→假 DeepSeek、
  校验/纠正/超时/断网回落、迟到回复取消、旧存档与离线模板全部通过。
- `tests/chinese-cleanup.cjs`：6 组，孩子界面及属性无中文，家长入口正常，无运行错误。
- `node --test brain/server.test.cjs`：26 项（含子测试），全部使用本地 HTTP mock，通过。
- `node --check tests/world-v2.cjs` 与 `git diff --check` 通过。

验收图片：`screens/brain-v2-art.png`（42 词画风）、`screens/brain-v2-parent-log.png`
（合成记录夹具，日期固定为洛杉矶 11/4）、`screens/brain-v2-album.png`（一轮完成后）。
新增浏览器测试会将这些图片的原始输出写在 `/tmp/bw-v2-*.png`，不影响游戏运行。

### 仅代码核对 / 留给合并后验收

- 小幅动画、8 Hz 图卡更新与有界粒子池的结构已核对；低端手机长时间性能、真实音量与音效听感
  没有测试。无头截图已人工查看，不能替代真机视觉/手感验收。
- 藏点按基础地形保存稳定；玩家后来挖空地面或在藏点盖房时，仍需自己走近/清理空间。
  未穷举所有随机种子、所有玩家改造地图和长期多轮存档；没有声称无头覆盖了这些组合。
- 无浏览器识别结果的语音不能知道具体说了哪个词，因此不会推断成目标词；2000 条保留上限之外
  的历史不会出现在本周汇总中。两点在家长页与代码规则中明确，不把点选算口语成绩。
- **真机语音三验（识别可用性、TTS 音色、触控手感）未做**，由团队合并后实测。
- 未使用真实 API Key、未调用真实 DeepSeek、未部署；脑服务生产配置与公网表现仍按 Run 1 待验。
- 本轮只提交并推送 `origin/codex-brain-v2`，不推送或合并 main。

## Constraint review — 57c40c3 + 9294f62 against c3c3b98

- Confirmed one violation of the rule-skeleton/AI-mouth boundary: both validators
  checked sentence fragments, so `Fish or wood? What is wood?`,
  `What's this? What can you say?`, `I see a fish. Say wood!`, and a closing
  `Great! Say wood!` passed despite changing or adding an exercise.
- Server and browser now validate the complete sentence against bounded,
  rule-owned tier forms. Praise and phrasing variants remain available; the
  model cannot append questions, redirect the answer, or restart a closed exercise.
  The system prompt and protocol documentation describe the accepted forms.
- Regression evidence: eight added rejection cases failed before the fix.
  After the fix, all **36 server/mock tests** pass, including one corrective retry,
  template fallback, accepted phrasing variants, and timeout/slow-body fallback.
  `tests/brain-v2.cjs` passes with added browser rejection/TTS checks across all
  three tiers and closing. `tests/chinese-cleanup.cjs`: **6 groups pass**.
  `tests/playthrough.cjs`: **17 groups pass**, including all 24 tasks, save/resume,
  42 words, and offline `file://` play. Syntax and `git diff --check` pass.
- No other checklist violations found. Vocabulary, tasks, chapter boundaries,
  save key/version, and the default empty `BRAIN_URL` remain unchanged. Only
  `brain/.env.example` is tracked; credential-pattern scans of both reviewed
  commits and workspace logs found no matches. Service logging contains no
  credentials or request/response bodies. No real provider or microphone was used.

## Review of f350bbd — mobile dialogue recovery

- Fixed two reproduced input traps: rotating to portrait during an unanswered
  question blocked the portrait opt-in button, and a short landscape viewport
  could not touch-scroll the dialogue to its recovery controls.
- Portrait opt-in now works through the blocking input guard, including keyboard
  focus/activation. Dialogue touch scrolling is allowed inside the panel. Both
  paths preserve the unanswered question and paused world.
- Added browser regressions for rotation and a real CDP touch swipe in a
  740 × 240 viewport; each failed before its fix. Existing answer, parent skip,
  mic fallback, three-attempt reveal, AI validation and request budgets remain intact.
- Validation: all 40 backend tests, the brain integration suite, six Chinese-UI
  checks, and the expanded blocking suite passed using synthetic speech/HTTP.
- Production audit: deployed `server.cjs` matches the repository SHA-256;
  `huanrui.conf` matches the recorded deployment hash; `.env` is root-owned mode
  600; service is active; HTTPS preflight returns 204. No redeploy was necessary.
  `BRAIN_URL` remains `https://brain.yydriver.cn/buddy`, with nginx 30 requests/minute
  per IP (burst 10) and client limits of 8/minute and 60/tab session.

## Conversation memory, small talk, weather and coach — 2026-11-03

Implemented Claude's conversation/state-machine and rule-owned slot design from
`/workspace/yangyang-design/claude-design-out.md`, adapted to this repository:

- Extended **block-world-save-v1** with validated preferences, ask timestamps,
  name onboarding, local calendar day, five-per-day chat count, and once-per-day
  weather flag. Kept all existing world/adventure/word/name/greeting data.
  Added no profile/session localStorage keys and no new WORDS.
- Welcome-card name question supports letters, keyboard and microphone; it
  releases after 20 seconds with Mario/current parent name. Parent-set names
  bypass first asking. Existing clear/new-world flow resets name and preferences.
- Buddy taps and 60-second idle ask animal/build/food preferences once per slot;
  taps and speech learn only whitelisted game words. Validated made/built events
  infer a missing build slot. Color questions are skipped because none of the
  proposed colors belong to WORDS. Food uses fish/wheat/seed only.
- Added nonblocking weather and tiered recasts, success-path coaching, and
  preference chips. Physics continues during social bubbles. Blocking exercises,
  quizzes and name asking gate social chat; interruption aborts pending social
  speech/network work. In-flight questions do not survive reload.
- Brain adds strict typed `name_ask`, `small_talk`, `weather_chat`, `recast`
  payloads, dedicated short prompts, exact safe phrase slots, 3–6 word ASCII
  validation, one correction, and mirrored offline fallbacks. Existing greet,
  exercise rules, quotas, deadlines, headers and transcript privacy remain.
- Replaced the two dialogue tool emojis with blue speaker/coral mic SVG buttons,
  48px targets, labels and pressed/disabled states. Kept short-screen scrolling.
  Parent gear now shows saved preferences and daily counters.

Claude adaptations: one existing save instead of two new keys; existing parent
gear/name/reset instead of a password/new panel; existing 42 words instead of
Claude's proposed extra colors/animals/foods/weather; 20-second onboarding
escape; input-length coaching tiers; exact line slots for bounded phrasing.
No free-typing chat IDE was added.

Samples: first visit “Hi! What is your name?”; returning “Hi Sam. It's so nice
to see you again. Let's build something together!”; preference “Do you like cat
or dog?”; coach “Try: I see a dog!”; weather “Look! I see the rain!”.

Screenshots: `screens/name-ask.png`, `screens/small-talk.png`,
`screens/weather-chat.png`, `screens/chat-buttons.png`, `screens/coach.png`.
Headless speech/touch tests use synthetic recognition/TTS and Chromium touch
emulation, not a real microphone or physical phone.

Validation: **48 backend tests pass** locally and on the deployment host.
`tests/memory-chat.cjs`, `tests/greeting.cjs`, `tests/blocking-ai.cjs`,
`tests/brain-v2.cjs`, `tests/chinese-cleanup.cjs` (6 groups),
`tests/world-v2.cjs` (8 groups), and `tests/playthrough.cjs` (17 groups) pass.
Syntax checks and `git diff --check` pass. New cases include clock rollback
without duplicate questions, tamed buddy taps, actual full-sentence success
coaching, no raw transcript save, social interruption, and existing reset.

Production backup: `/root/backups/yangyang-brain-memory-chat-20261103T121319Z/app`.
Rsync copied only `server.cjs` and `server.test.cjs`; remote tests passed before
restarting `yangyang-brain`. Service is active. `.env` compares byte-for-byte
with the backup and remains root:root 600. The protected `huanrui.conf` SHA-256
is unchanged. Server SHA-256:
`1fb742cd1fd9cff8d5853b647f04fd70047772723712e1b6cb3e8f6b25e677f8`.

HTTPS smoke: **12/12 POSTs return 200, source brain, reason validated**, including
all new modes, three recast lengths, return greeting, all exercise tiers and
success closing. Outputs independently pass the local validator. Observed
latency 0.83–1.82 seconds; jsDelivr preflight 204; invalid weather rejected 400.
Evidence: `screens/memory-chat-smoke.json`. No nginx/env/provider configuration
was changed, and no credentials were printed.

The live `tests/brain-ratio.cjs` check also passes: 14 brain / 1 template
response across four exercise encounters plus onboarding, welcomes and ambient
weather. The fixture now waits for completed welcomes instead of counting
canceled HTTP replies as accepted client output. Current evidence is preserved
separately in `screens/memory-chat-ratio.json`; previous ratio artifacts remain.

## Claude review: top three fixes — 2026-11-03

Implemented only [Claude review, section C](/workspace/yangyang-design/claude-review-out.md):

- Name entry now reads the current field before fallback, allows 30 seconds of
  inactivity, and resets that timer on letters, typing and mic start. At 10 seconds
  it shows “You can say it or tap!”. ASR fills the editable field and waits for
  Hi! / Let's play! confirmation; timers cannot commit unconfirmed speech.
- Gated or daily-limited Buddy taps replay a silent wave without adding text.
- Client/server recasts share a noun allowlist, exclude hello/jump/follow/pet/home,
  and label rod as “fishing rod”. Non-nouns use existing praise. Tier-1 bubbles
  stay open nine seconds after TTS so the mic remains reachable.

Validation: **49 server tests pass locally and on the host**; expanded
`tests/memory-chat.cjs`, greeting, blocking-ai and brain-v2 suites pass, with
synthetic TTS/ASR. Script syntax and `git diff --check` pass.
Backup before rsync: `/root/backups/yangyang-brain-claude-top3-20261103T122823Z/app`.
Only the two brain code/test files were copied; service restarted and is active,
deployed hashes match, and `.env` / protected nginx configuration are unchanged.
HTTPS smoke: **9/9 POSTs return 200, brain/validated**, covering name_ask,
excluded non-nouns, fishing rod in both coached tiers and cat; preflight is 204.
Evidence: [claude-top3-smoke.json](screens/claude-top3-smoke.json).

## Weather pictures and recording feedback — 2026-11-03

- All three microphones (exercise, Buddy and name entry) show a coral glow and
  gentle scale pulse after recognition starts. Shared cleanup clears the state
  on results, end, errors, start failures, watchdog timeout and dismissal.
  Existing pressed feedback remains; reduced motion keeps a static coral glow.
- Weather chat now pairs its existing 3–6 word line with a small `paintIcon`
  canvas for rain, sun, cloud, moon or star. Rain takes priority; visible stars
  lead the alternating star/moon night topics. Daytime clouds count when they
  cross the sun instead of relying on the formerly unreachable daytime check.
- Clearing rain draws seven soft outlined rainbow arcs in the world sky, fading
  in and out over 18 seconds. Night hides the rainbow; new rain clears it.
  Rainbow is visual only: the 42-word set, offline phrase slots, daily chat
  limits, memory and coaching behavior are unchanged.
- Updated `screens/chat-buttons.png` with synthetic recording active and
  `screens/weather-chat.png` with its rain icon; added
  `screens/weather-rainbow.png`. Inspected all three captures. No physical
  microphone or device was used.

Validation: 49 backend tests, expanded `tests/memory-chat.cjs`, greeting,
blocking-ai, brain-v2, world-v2, Chinese cleanup, playthrough and baseline
suites pass. The memory/chat additions cover all three recording lifecycles,
reduced motion, five weather pictures, vocabulary membership, short unchanged
weather templates, and rainbow drawing, fading and rain/night suppression.
The world suite passed on rerun after one timed gift-collection failure during
concurrent browser runs. Syntax checks and `git diff --check` pass. The live
brain-ratio suite also passes (12/14 brain responses, 2 template responses;
synthetic dialogue, existing HTTPS endpoint).

Client-only change: no brain rsync, service restart, secrets or nginx changes
were needed. Only `codex-brain-v2` is committed and pushed.

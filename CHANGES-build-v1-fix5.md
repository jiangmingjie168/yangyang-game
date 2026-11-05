# Block World build v1 fix5

基线 `1d8d3b7f5bcff0b9713e29dd79ebd713b2e423b8`，分支 `codex-build-v1`。运行时代码只改 `index.html`；HUD 为 `build 1d8d3b7+fix5`（基线加轮次）。存档 key/version 不变，`BUILD_LINES` 不变。不合并 main、不生成语音、不部署站点或脑服务。

## 1. Hana 小屋：检测与完整问答

**确认根因**：旧 flood fill 只数与内部空格四邻接的自建边界。左右各 2 Planks、墙列相距 2 格、中间 1 列、顶 3 House、天然地面封底，内部为 **1×2**；与内部相邻的是 **4 墙块 + 1 顶块 = 5**，屋顶两端是角块，不计入边界。旧 `owned.length < 6` 直接丢弃该屋，随后归入 free，故 Show 只夸赞。不是这份规格的扫描窗越界，也不需要门或宠物。

**新条件**：保留封闭空区扫描（每个中心 14×10 窗口，触及窗边的开放空间不算闭合）；普通结构仍需 ≥6 个自建边界块。特许 **内部宽 1、内部高 ≥2、有屋顶、≥5 个自建边界块**的小屋。屋顶条件沿用原规则：内部每列向上 4 格内有自建、实心、非 Fence 的盖顶；House 可用，既有 Planks/wood/stone 等实心屋顶仍兼容。地面可为天然地面。Hana 的 4 Planks + 3 House 明确得到 `kind=house`，debug 显示 `house interior=1x2 boundary=5 roofed=true`。不要求先解锁 room（room 词识别仍需内部 ≥2×2），不要求 Door、宠物或特定名字。

手动目标原已有 region 优先于 free 的排序，本轮保留并修正刷新顺序：检查按钮状态前先检测最新建造；**接受邀请时再选择存活目标，house/pen region 优先于附近 free**。因此先出现 free 邀请、之后封顶，也会问小屋。若作品已被拆至不足两块，不扣额度、不问错误题。

真实鼠标 H 路径：采 3 Wood 与 1 Stone → 合成 12 Planks、4 House（剩 10 Planks）→ 选 Roof 放 4 House → Remove 去掉一端悬挑，留下 3 House → 左右各放两层 Planks（剩 6）→ ⭐ Show → 邀请 Show → `What is this?` + House/Fence 选项 → 点 House → `You built a house!` 收尾与撒花。先搭屋顶保证站在屋外仍有清晰射线；没有绕过墙体放置规则。U 另测先放两墙底块并保留 free 邀请，再封顶和补墙。全部为鼠标事件，无 evaluate、库存注入、kind 修改或调用内部问答函数。自动化真实鼠标证据仍需 Hana 真人复测确认。

## 2. 日额度：每次接受 Show 只计一次

旧代码在**发出邀请**时加计数，孩子建造时被中断/未接受的邀请也占额度；只看见一次夸赞，不代表此前没有占用。旧 New world 调用 `restoreBuild({})` 已清零，本轮核查并测试这条路径，未发现同档刷新与新世界混淆的代码证据，不能声称已复现 Hana 那次唯一的计数轨迹。

新口径：**点邀请内 Show（或邀请内 Speak，进入相同 Show 路径）时计 1 次**，包括 free 只夸赞、house/pen 问答、尚未介绍作品的 revisit 问答。总额仍 ≤4/自然日/存档。字段 `build_chat.shows` 为接受自动邀请的次数，`manualShows` 为接受手动邀请的次数，`showsToday()` 为两者之和。`d.counted` 防止同次重复计费；邀请发出、重复工具栏点击、被取消、自然过期夸赞、错答、正确答案与收尾均不再加计数。接受问答后即使不答完，该次仍占 1 次。`build_show` 自动入口按 `shows < 2` 门控，剩余额度可手动使用；revisit 也必须通过合计 4 次的接受检查。

`No more shows today!` 只由合计 ≥4 的分支显示：1/2/3 次均未 spent，第 4 次接受后达到 spent，第 5 次尝试被拒绝。完成作品的普通灰态是 `done`，点击提示 `Add 1 more block, then Show!`，与当日满额明确区分。debug 继续显示 `shows X/4 (auto A, manual M; accepted Shows)`。

刷新保留计数；自然日期变化清零。**New world → Tap again** → 新档计数为 0；不继承前档 4/4。旧存档字段直接读取，原有当日数字保守保留，避免升级后凭空赠送额度；旧满额档可等次日或确认 New world，后者会清除该世界。无需迁移或更换存档版本。

## 3. 再放 1 块重新可 Show

旧 `refreshBuildFeedback` 明确要求同簇新增至少 **2 个**本页实际放置、仍存活且不在上次快照中的格子，与 Hana 再放 1 Planks 不符。新规则改为 **1 个新格子**，结构仍有 **≥2 个存活自建块**，且当天未满 4 次；无需另起新结构。材料可以是 Planks、House、Wood、Stone、Fence、Door 或 Window。删除后原格重放不算新格，失败点击和刚放即拆不算。

free 采用既有簇成员（允许间隔，簇最大 14×10）；closed house/pen 的反馈快照包含外边框、屋顶角块及紧邻外边框一圈的自建块，所以在屋外贴着墙新增 1 Planks，即使内部边界数仍为 5，也能重亮。新簇 ≥2 块也可手动 Show；初次自动完工仍保留 ≥4 普通块或 ≥2 Fence 的门槛，已经介绍过的簇新增 1 块可重新自动反馈。

等待约 2.5 秒游戏运行时间，让检测/静止反馈更新后重亮；点工具栏 Show 时也会立即重扫。自动邀请最早在最后建造动作后 4 秒发出，需满足静止和无其它面板等既有条件。机器繁忙时游戏时间可能慢于墙钟，验收等待真实 ready 状态，不快进时钟。邀请已显示时继续搭建会保留该邀请，接受时快照覆盖新作品；完成/过期后再新增 1 块可进入下一轮。日额度已满时加块不会绕过上限。

## 4. 邀请时长与覆盖规则

从 `buildBubble` **实际显示 stage=invite** 起，用真实 `setTimeout` 计 **35,000 ms**；初次完工夸赞的 1.5 秒前奏不计入邀请时间。重复点工具栏 Show 不重置计时、不多占额度。无操作时 35 秒后才变为温和夸赞，再保留 14 秒。后台页计时可能更晚，不能更早。

移动、摇杆、跳跃、选材、成功/失败放块、删除、切换 Build、其它完工反馈、延迟 wall/roof 词夸赞、普通天气/场景聊天不会提前顶掉邀请。Show 题目也受被动气泡保护，保证 8 秒后提供高等级选项的路径完整。点邀请 Show/Speak 会推进；点 Keep playing/OK 会关闭；显式开始 Quiz、确认 New world、在家长页更改建造等级/重置偏好等原有主动切换会关闭。打开 Craft/Words/家长面板可能遮住气泡，但本身不重置邀请计时。题目阶段主动继续建造仍按既有行为结束对话；题目的 14 秒计时未改变。

## 验证与交付索引

- `tests/build-v1-fix5.cjs`：H 精确小屋、U 邀请中封顶升级、L 刷新后未介绍小屋的 revisit 也计入日额度、Q 1–4 次与第五次拒绝/刷新/新世界、R 过期和完成后各加 1 Planks、I 等 ≥29 秒且选材/放置/移动不中断、F 散放夸赞撒花、S 第二/三层、V HUD；desktop 1366×768 与 mobile 844×390。debug 只读 DOM，clean 图另测撒花粉/紫像素 ≥35。最初主矩阵使用随机新世界；定向复测及 clean 交付使用游戏原有 `#seed=42` URL 入口固定地形，不注入存档，确认 New world 仍走原有随机新世界路径。
- `tests/build-v1-fix5-compat.cjs` 保留旧测试文件，只在运行旧测试时适配明确变更的预期：fix3 的自有块叠放；fix5 每次重复 closed Show 前通过鼠标加 1 块真实 Planks；放置不再折叠邀请。仍跑旧等级 1/2/3、旧存档、宠物、库存等检查，不改被测 HTML。
- `tests/run-build-v1-fix5.cjs` 运行 build-v1 兼容、放置几何、natural-pointer-v4r、chinese-cleanup、world-v2、memory-chat、server。本地临时 HTTP 仅供自动化，不部署预览/脑服务。
- 新证据均位于 `screens/build-v1-fix5-*`，交付复制到 `/workspace/yangyang-game/screens-deliver/build-v1-fix5/`；最终结果、关键帧相对路径、校验值见 `screens/build-v1-fix5-evidence.json`、`screens/build-v1-fix5-screens.md` 与 `/workspace/handoff/build-v1-fix5/CODEX-REPORT.md`。
- 初次定位/旧代码路径的失败记录保留，不冒充最终源码的通过证据。最终结果见下表。

附带 P1：本轮未更改一列宽小屋碰撞或逃脱机制。上述验收从屋外搭建避免困住角色；如角色在内，可用 Remove 拆一格墙作为出口。

## 最终结果（同一最终 HTML）

| 项目 | 结果 |
| --- | --- |
| fix5 H/U/L/Q/R/I/F/S/V × desktop/mobile | 18/18 PASS，含定向复测 |
| clean H/U/I/F/S/V × desktop/mobile | 12/12 PASS |
| fix3 J/S/B/P/G × desktop/mobile | 10/10 PASS，含 B-desktop 定向复测 |
| build-v1 兼容（含 fix1/fix2、tier 1/2/3、旧档、宠物、库存） | PASS |
| build-placement-fix3 / natural-pointer-v4r / chinese-cleanup | 全部 PASS |
| world-v2 / memory-chat / server | 全部 PASS；server 52 tests |
| 交付图与撒花像素 | 74 张关键 PNG；10 张 clean 庆祝帧，粉/紫像素 419–994 |

主矩阵首次 15/18：H-mobile 采木时序/镜头变化、U-mobile 动物占格、R-mobile 随机地形/站位导致放置失败，三项在原生 seed URL 的新档上复测通过。fix3 首次 9/10，B-desktop 首块目标与角色/地形重叠，原脚本定向重跑通过。较早并行回归还暴露了高等级题面被延迟夸赞覆盖，已修复；之后完整 build-v1 通过。未删除这些失败记录，attempts 与对应截图/录像可查，未宣称首次全绿。

邀请 I 墙钟等待：debug desktop/mobile 约 29.5 秒；clean desktop 29.705 秒、mobile 29.608 秒后仍点通。R 验证未回答邀请约 35 秒才过期，过期不扣次数；H 题面保留 9 秒后答题成功；L 验证刷新后的未介绍小屋问答也计 1 次。

HTML MD5：`af48b23fc78dc087e439a2a4b8a5331c`。SHA-256：`5a566ee4c8b2b2d61489be5cb988a40d58a95fd547f2d7cf1e9c30431f8b7a0d`。

提交号与 push 核对见交接报告。预览部署与 Hana 真人复测交由编排方；一列宽碰撞问题仍是本轮未处理的 P1。

# Block World 自由建造 v1 改动与验收

## 家长复测 fix1，Round 2（2026-11-04）

本节优先于下方原版历史记录。当前分支 `codex-build-v1`，修补基线 `1be5055`。本轮已验证 Chromium 和本地 HTTP/socket 可用；最终 18/18 套件通过，结果见 `screens/build-v1-fix1-regressions.json`。没有生成语音、修改 brain 服务代码或部署、合并 main。

### 根因、真实复现与 false green

- **P0 首块**：旧 `buildPlaced` 提前设置 `firstDone=true`，把喝彩放入最多两条、30 秒过期的低优先级队列。停手 2.5 秒、选材 4 秒、已有气泡、25 秒气泡间隔、20 秒夸赞间隔等条件会挡住反馈；丢失后不会重试。现在首块成功时直接显示 `Nice start!`，不走对话队列/冷却/提问额度。四块 Roof 作为一个操作，完成后统一显示，避免后续块收起首块反馈。
- **P0 耗尽**：旧 `buildShort` 在背包仍有任何其他建材时直接返回，还受同材料一次、每天三次、45 秒间隔及排队限制。现在所选材料不足就立即显示 `No more planks!` 等陈述；重复点击也响应，不弹题卡、不请求语音。C-15 额外验证 Fence=0、Planks=2 时照样提示 Fence 耗尽。
- **真实红/绿对照**：同一新档、844×390、真实 pointer 流程，先采集合成、等自然 plan，再点首块。`BW_SOURCE=/tmp/bw-build-before.html`（`git show 1be5055:index.html`）在 500ms 的首块反馈断言失败；当前实现通过。原版失败日志是 `screens/build-v1-fix1-original-red.log`，原版截图隔离在 `/tmp/bw-fix1-original`，不覆盖新证据。
- **上一版 false green**：旧 `build-v1` 的主要场景预装 40 Planks / 20 Fence / 12 House / 6 Door，并在每次点格子前 `clearOverlay()`；它没有采集→合成→首块→耗尽，也没断言反馈。因此库存/存档全绿不等于真人反馈可见。现在 `build-v1` 先强制运行 fresh-save release gate；旧档部分只负责兼容、建筑、宠物、存档。旧档里的预置材料和内部观测不作为 A–E 证据。
- **Round 1 脚本超时**：实际 DOM 的成品名是 `Planks ×4`，不是 `/^Planks$/`。已经在 Chromium 中检查真实 `#recipes .out b`，使用精确的 `Planks ×4` 行与可用 Craft 按钮。不是通过强制点击绕过失败。
- **P1 漏测**：原 Chinese cleanup 显式豁免 `#btn-zh`，漏掉其中文 aria-label。按钮保持 `⚙`，aria 改为 `Parent settings`；测试现在检查孩子可见文本、所有非家长节点的文本和属性，没有齿轮豁免。

### 本轮结果

| 项目 | 行为及证据 |
| --- | --- |
| A 首块 | 新档采集→合成→自然 plan→首块立即 `Nice start!`；500ms 内可见 |
| B 耗尽 | 连放至 0→点空地→立即 `No more planks!`，再次点击仍响应 |
| 不打断、不遮挡 | 无 dialogue / chat-shade / wordcard；反馈在 HUD 上沿，底部 ≤164px，`pointer-events:none`；下一次放置收起，无选项/麦克风，4.5 秒自动消失 |
| C 合围及 Show | 新档真实采三份 Wood，合成 Planks、Stick、8 Fence，逐格搭成围栏；合围后静止时直接喝彩，之后出现有文字的 `☝ Show`；依次展示 1/2/3 级 |
| C 难度 | 第一级为默认自动选择；第二/三级均通过家长面板按钮设置。可选存档字段 `build_level`，旧档默认自动，不改已有掌握记录；二三级不记口语成绩 |
| 建造点击 | 邀请期间空地点按继续放置；Build 模式的宠物不再抢占放置点击。主动 Show 走 Buddy 按钮，不等自动邀请冷却 |
| D 自然一级题 | 原样 `What is this?`、大图、Tree / Wood 文字选项；问题本身无目标词泄题，没有内部打开题卡 |
| E 家长入口 | 世界中只有齿轮；打开家长面板才显示中文，返回后孩子 UI 无中文 |

### 放置距离：接受 +1，并限制视线

- Build 原矩形范围水平 7 / 垂直 5 格，改成 **8 / 6 格**；普通放置欧氏半径 **3→4 格**。只改放置，不扩大采集或抚摸范围；Build 网格同步更新。
- 放置与 Build Remove 都从玩家身体中心向目标格中心做逐格视线检查。实心墙、Fence、Window、树木挡住射线；碰到格子角时检查两侧，不能斜穿墙缝。Door 按现有可穿行门的规则允许视线通过。
- 整段 Roof 在改世界/扣材料之前检查四个目标的空位、范围和视线，任一失败则全部拒绝。旧档浏览器用例验证远端被墙挡住的 Roof 不扣 House、也不产生半截屋顶。
- **实测结论：可以放宽**。新档 R 组在两个入口分别验证新外圈能放、再外一格拒绝、墙后拒绝且库存不减；拆除遮挡后同一位置成功，并清除上次墙体警告；占用格重复点按不扣库存。几何测试覆盖水平/垂直、反向、斜角及目标格可拆等 14 项。
- 不能再隔墙搭远侧，操作上需先搭远侧/屋顶或走到另一侧；旧兼容测试已调整搭建顺序，完整小屋/围栏和宠物进出仍通过。加一格不改变所点目标、不吸附到别格；自动化 844×390 评估可接受，未声称做过实体手机或儿童误触统计。

### 测试与复跑

新鲜存档用例 `tests/build-v1-fix1.cjs`：原始 HTML、844×390 mobile+touch context、独立空 origin，玩法只有 pointer。无 init script、BW 调用、内部变量写入、时钟快进、预置库存、强制点击或 blanket overlay dismissal。读取 DOM 检查库存和反馈；自然等待会话/题卡，不绕冷却。

```sh
node tests/run-build-v1-fix1.cjs
python3 tests/build-v1-contact-sheets.py
```

Runner 自带临时本地静态服务器，每套测试独立进程；两个生成 A–E 的套件顺序执行，避免覆盖同一证据。最终机器结果：`screens/build-v1-fix1-regressions.json`；总日志：`screens/build-v1-fix1-validation.log`；每套日志：`screens/build-v1-fix1-test-<suite>.log`。

**最终整套结果：18/18 PASS，0 失败。** 包含 build-v1-fix1、build-v1、build-placement、natural-pointer-v4r、chinese-cleanup、blocking-ai、brain-v2、greeting、landscape、memory-chat、playthrough、raw-pointer-v4、real-pointer、voice、world-v2、brain-ratio、历史 baseline、server（52/52，0 fail，0 skipped）。网页 inline JS、Node/Python 语法与 `git diff --check` 也通过。视觉复核后修正旧墙体 Toast 残留，`node tests/build-v1.cjs` 再跑通过（含完整新档 gate、距离和旧档兼容）；日志 `screens/build-v1-fix1-post-review.log`。

旧测试的修正没有删除业务断言：等点选单词播放后实际结算答案/错误次数；一级题断言改为安全问题+大图+有文字选项；问候保留至少四秒可读时间；自然树木遭遇允许 scene/task 正常事件来源；围栏后侧火把与种植使用可达的旅行检查点。真实 live brain-ratio 区分 HTTP 响应来源和客户端实际显示来源：旧服务返回过时题面时，客户端校验回退模板，不能把该 HTTP 响应算成显示了 AI 题目；取消响应也不计为显示。原有 mock/server 校验仍严格验证来源和安全回退。没有升级线上 brain。

### 提交与推送位置

原 worktree 的 `git add` 仍报 `/workspace/yangyang-game/.git/worktrees/bw-build/index.lock: Read-only file system`。因此从同一远端分支基线克隆到 **`/tmp/bw-fix1-publish`**，复制已验证文件后 commit/push 到 `origin codex-build-v1`，不改分支历史、不 force push。该目录是提交后的可继续开发 checkout；原 `/tmp/bw-build` 保留相同已验证文件，但其只读 git 元数据无法更新。最终 SHA 见交付回复或发布 checkout 的 `git rev-parse HEAD`。

### 新截图文件清单

共 **39 张编号帧 + 6 张 contact sheet = 45 张**，每张 844×390 原帧，contact sheet 只缩放拼接，不改游戏画面。完整逐文件清单与步骤标题在 `screens/build-v1-fix1-evidence.json`。

| 序列 | 编号帧 | Contact sheet |
| --- | --- | --- |
| A 首块 | `screens/build-v1-fix1-A-01.png` … `-A-05.png` | [A sheet](screens/build-v1-fix1-A-sheet.png) |
| B 耗尽 | `screens/build-v1-fix1-B-01.png` … `-B-06.png` | [B sheet](screens/build-v1-fix1-B-sheet.png) |
| C 合围 / Show / 三级 | `screens/build-v1-fix1-C-01.png` … `-C-15.png` | [C sheet](screens/build-v1-fix1-C-sheet.png) |
| D 自然一级题 | `screens/build-v1-fix1-D-01.png` … `-D-04.png` | [D sheet](screens/build-v1-fix1-D-sheet.png) |
| E 齿轮 | `screens/build-v1-fix1-E-01.png` … `-E-03.png` | [E sheet](screens/build-v1-fix1-E-sheet.png) |
| R 距离 / 遮挡 | `screens/build-v1-fix1-R-01.png` … `-R-06.png` | [R sheet](screens/build-v1-fix1-R-sheet.png) |

原版历史证据保留如下；其旧“全部通过”不替代上述 fresh-save gate。

## 原版交付记录（以下为历史记录，不代表 fix1 通过）

基线 `04abc8e7bcdb18bcd789faf0f77cb44734f27082`，工作树 `/tmp/bw-build`，分支 `codex-build-v1`。本地验收全部通过。实现与验收证据 commit：`d523a4e029e94a2c9193be30c82023ed578a2c09`；本文件在后续文档提交中记录此 SHA。未 push、合并、部署或生成语音。

## 建造

- 新增 Build 工具条：Planks / Stone / Wood 墙体、Fence、Door、整段 Roof、Window、Remove。选材料后点空格放置；Remove 点玩家放置的块返还原材料，满背包时保留原块。
- Roof 一次放置 4 个现有 House 建筑块并扣 4 份材料，作为完整屋顶绘制。底层仍是旧存档的方块差异，不新增 roof 方块 ID。
- 唯一新方块为 `WINDOW=20`，可用 2 Planks + 1 Sand 合成 2 块，参与碰撞和合围。
- 对待检测放置点及既有建筑做 14×10 有界区域 BFS；门视为闭合边界但仍可穿行。保留最多 8 个建筑记录，拆开后重新识别。
- 新词 wall / roof / window / room / gate 共 5 个，加入 WORD、图标、图鉴和既有复习候选池。room 要求有屋顶、至少 2×2 的内部空间，并实际进入停留。
- 宠物跟随到建筑内部目标点，在内部小范围活动；门的开合视觉也响应宠物。
- 修复纯行走/宠物跟随未触发保存的问题：位置变化加入现有2.5秒节流保存，避免画面已进围栏而存档坐标仍在小屋。

## 英语与交互

- 接入设计里的 9 个事件名：plan、offer、short、first、word、closed、roof、show、revisit。设计标题中的“7/8 个时刻”与事件名数量不一致，本版按明确事件名实施。
- 建造对话使用 `buddy-chat` 非模态气泡、独立队列和额度，不请求 `/buddy`。建造时屏蔽阻塞 `openChat`；动作会收起气泡并取消语音。
- 每日 6 次/每会话 3 次提问；兴趣选择不计掌握度，建造标准答案只有一级点选才增加 `t1`，不写口语记录或 `t2/t3`。
- 沉默可提议 house 并显示 4×3 轮廓；忽略不自动建造；连续两次忽略暂停 7 天。一般气泡间隔 25 秒、提问间隔 45 秒；计划沉默 8 秒使 offer 进入候选，仍等待全局冷却。roof 词卡与约 3 秒后的 house 夸赞作为同一组识别反馈，动作会取消后续部分。
- 全部一级任务题面改为 `What is this?`，大图显示目标，选项是图加文字；点击才播放选中词。前后端校验拒绝旧版 `X or Y?` 和未答题时泄露目标的 context lead。
- 保留无对错的社交偏好问句、三级跟读、答案揭示和 `Find the X!` 世界寻物指令。

## 名字和语音

- 无默认名字；未设名字时建造句没有名字或占位称呼。README 修正 Mario 和 20 秒错误说明。
- 100 个预置名字，每名 6 条 Jenny 原子；名字缺失时省略名字，带 `named` 的调用在所有失败路径都禁止浏览器 TTS。
- 缺名字音频时欢迎文字至少保留4秒，仍为静音；验收断言气泡可见，两个含名场景的浏览器 TTS 均为0次。
- `BUILD_LINES` 由网页运行时引用，清单脚本直接从同一常量读取。清单 1795 条，新增清单 723 条，删除旧一级原子 3443 条。
- Python 生成器新增 `--manifest` 和 `--names`，增量索引保留已有条目。本次未运行生成器，未修改任何 MP3。

## 存档与验证

save key 仍为 `block-world-save-v1`、版本仍为 1。新增可选字段 `builds`、`build_chat`、`build_words`；原 `mods`、库存、任务、图鉴和冒险记录沿用现有字段。新增字段读取时做范围限制，重置世界时清空。

新增 `tests/build-v1.cjs` 与 main 格式夹具；页面使用原始 HTML 字节，玩法只由真实点击/键盘驱动，只有存档准备和浏览器语音观测使用测试侧脚本。旧测试的词数、一级题面和名字断言已同步。

2026-11-04 实际运行：build-v1 8/8、v4r 5/5（3条操作路径及2项题面）、服务端52/52全部通过。保留 `clearOverlay()`；建造和行走仍由真实输入驱动，未加入游戏探针或内部函数调用。

| 验收项 | 结果 | 证据 |
| --- | --- | --- |
| 844×390 手机视口真实点击搭小屋与围栏 | PASS | 5 块墙、门、整段屋顶；7 块栅栏与门；识别 house / pen |
| 拆回返还材料 | PASS | Planks 35→36，重新放置回到35 |
| 宠物进入围栏 | PASS | 键盘行走跟随；保存的 dog 坐标在 pen AABB 内；05 截图 |
| 建造中不弹模态 | PASS | 每次放置后检查 dialogue / wordcard；行走后检查 dialogue / chat-shade |
| 刷新后建筑和库存保留 | PASS | mods、inv 完全相同，恢复2个建筑；06 截图 |
| main 格式旧档兼容 | PASS | 原词汇、stars、seed、reviews、levels、prefs、intros 及旧进度断言；07 截图 |
| Window 合成放置、wall / roof / room 学习、47词图鉴 | PASS | 真合成及入屋停留，读取存档词汇，图鉴数量断言；04 / 10 / 11 截图 |
| 一级题面文本与发声不泄题 | PASS | What is this?、大图和两个图文选项；点选后才念所选词；08 截图 |
| 无名字、Mario、Zyxora 缺音频降级 | PASS | 名字欢迎文字可见；两个含名场景 browser TTS 次数均为0；09 截图 |
| v4r 远点狗、三次抚摸及跟随 | PASS | 原始 HTML，自然点击及行走 |
| v4r 远树走近后采集 | PASS | 未走近无 Wood，走近后 Wood +1 |
| v4r 远点兔子跨完整树 | PASS | 触发 Rabbit 词卡，路过树不采集 |
| v4r 矮屏 / DPR2 一级题面 | PASS | 两项均显示安全题面、大图、图文选项 |
| 服务端完整测试 | PASS | 52/52，0 fail，0 skipped；build-v1-server-checks.log |
| 网页/Node/Python 语法、清单差集 | PASS | 4515→1795，新增723、删除3443，100个名字；仅解析 Python AST |
| git diff --check | PASS | 无空白错误 |

日志：[build-v1](screens/build-v1-run.log)、[v4r](screens/build-v1-v4r.log)、[server](screens/build-v1-server-checks.log)。机器结果：[build-v1](screens/build-v1-results.json)、[v4r](screens/natural-pointer-v4r-results.json)。

## 截图路径

| 截图 | 场景 |
| --- | --- |
| [screens/build-v1-01-main-save.png](screens/build-v1-01-main-save.png) | main 格式存档进入游戏 |
| [screens/build-v1-02-house-and-pen.png](screens/build-v1-02-house-and-pen.png) | 真实点击搭成小屋与围栏 |
| [screens/build-v1-03-returned-material.png](screens/build-v1-03-returned-material.png) | 拆墙返还材料 |
| [screens/build-v1-04-house-room.png](screens/build-v1-04-house-room.png) | 走进小屋，识别 room |
| [screens/build-v1-05-pet-in-pen.png](screens/build-v1-05-pet-in-pen.png) | 孩子和宠物真实走进围栏 |
| [screens/build-v1-06-restored.png](screens/build-v1-06-restored.png) | 刷新后恢复建筑 |
| [screens/build-v1-07-legacy-retained.png](screens/build-v1-07-legacy-retained.png) | 保留旧档数据 |
| [screens/build-v1-08-safe-tier-one.png](screens/build-v1-08-safe-tier-one.png) | 一级安全题面与图片文字选项 |
| [screens/build-v1-09-name-empty.png](screens/build-v1-09-name-empty.png) | 未设置名字 |
| [screens/build-v1-09-name-Mario.png](screens/build-v1-09-name-Mario.png) | 预置名字缺音频，保留欢迎文字 |
| [screens/build-v1-09-name-Zyxora.png](screens/build-v1-09-name-Zyxora.png) | 表外名字缺音频，保留欢迎文字 |
| [screens/build-v1-10-window.png](screens/build-v1-10-window.png) | 真实合成与放置窗户 |
| [screens/build-v1-11-word-book.png](screens/build-v1-11-word-book.png) | 47 词图鉴 |

v4r 证据：`screens/v4r-dog-*.png`、`screens/v4r-tree-*.png`、`screens/v4r-rabbit-*.png`、`screens/v4r-level1-short.png`、`screens/v4r-level1-dpr2.png`。

新 Jenny 音频和部署未执行；名字语音的本次验收覆盖空音频索引下安全降级。完整测试命令、夹具来源、覆盖范围与交接事项见 [handoff-build-v1.md](handoff-build-v1.md)。

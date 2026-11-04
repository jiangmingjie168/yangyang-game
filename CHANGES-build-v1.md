# Block World 自由建造 v1 改动与验收

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

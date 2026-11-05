# Build v1 交接：本地验收全部通过

日期：2026-11-04。工作树 `/tmp/bw-build`，分支 `codex-build-v1`。
基线：`04abc8e7bcdb18bcd789faf0f77cb44734f27082`。
实现与验收证据 commit：`d523a4e029e94a2c9193be30c82023ed578a2c09`。本文及 `CHANGES-build-v1.md` 在后续文档提交中记录该实现 SHA。

只在本 worktree 修改并提交。没有 push、合并 main、SSH、部署、语音生成，也没有修改 `/workspace/yangyang-game` 主工作区。

## 本次修复

宠物失败的根因是**存档坐标陈旧**：截图中狗已进围栏，但纯行走和跟随没有置 `dirtySave`，读取的 dog x=2656.6 仍在小屋；围栏内部 x 范围为 [2400,2464)。现在孩子或已驯服宠物的位置变化会调用 `saveSoon()`，复用现有2.5秒节流，刷新前即可保存真实位置。没有瞬移、改短路径或放宽围栏边界断言，原来的 CSS 点击坐标与850/1850ms行走时长保留。

保留测试的 `clearOverlay()`，在点格子及拆除前清理词卡/对话遮挡；围栏失败断言增加 pen、dog、player 的存档坐标诊断。缺名字音频会同步完成静音播放，原欢迎文字因此仅停留约900ms；现在欢迎文字至少可读4秒，测试检查可见性并保存真实截图。含名路径仍为零浏览器 TTS。

## 实际验收结果

build-v1 **8/8 PASS**，浏览器 errors=[]；v4r **5/5 PASS**（3条操作路径及2项题面检查）；服务端 **52/52 PASS**。以下结果来自修复后的实际运行，未用历史截图代替。

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

## 复现与证据

在 `/tmp/bw-build` 执行：

```bash
PLAYWRIGHT_MODULE=/tmp/node_modules/playwright CHROME=/usr/bin/google-chrome node tests/build-v1.cjs
PLAYWRIGHT_MODULE=/tmp/node_modules/playwright CHROME=/usr/bin/google-chrome node tests/natural-pointer-v4r.cjs
node --test brain/server.test.cjs
```

- [build-v1 结果](screens/build-v1-results.json)、[运行日志](screens/build-v1-run.log)。
- [v4r 结果](screens/natural-pointer-v4r-results.json)、[运行日志](screens/build-v1-v4r.log)。
- [服务端52项日志](screens/build-v1-server-checks.log)。

build-v1 路由提供原始 HTML 字节；仅在准备阶段写 main 格式 localStorage，之后只读存档做断言，语音包装仅观测 `speechSynthesis.speak`。未调用 BW、内部游戏函数、注入世界/相机探针或改写 HTML。v4r 使用本地 HTTP 服务和全新自然世界，无存档夹具或初始化注入。

`tests/fixtures/build-v1-main-save.json` 是手工编写的 main 格式兼容夹具，不是声称从 main 实际采集的存档。夹具包含旧材料、宠物和两处地面清理，不含预建房屋/围栏、新词或新字段。房屋、围栏、窗户均由真实点击建造。

旧 run2/run3/run4/run5、failure.png、debug-after-remove.png 只保留在本地供排错，没有提交，也不是最终验收证据。

## 本次13张 build-v1 截图

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

v4r 截图均位于 `screens/v4r-*.png`：狗路径 `v4r-dog-start`、`v4r-dog-1-click` 至 `v4r-dog-7-follow`；树路径 `v4r-tree-start`、`v4r-tree-1-click` 至 `v4r-tree-3-wood`；兔子路径 `v4r-rabbit-start`、`v4r-rabbit-1-click` 至 `v4r-rabbit-4-heart`；另有 `v4r-tree-dpr2`、`v4r-level1-short`、`v4r-level1-dpr2`，后缀均为 `.png`。

## 保持的约束与验证范围

单文件 `index.html`；没有新增怪物、伤害或死亡；本次孩子界面截图为英语。save key 仍为 `block-world-save-v1`，版本仍为1，建造字段为可选增量。建造中 `openChat` 被保护，建造气泡不请求脑服务。

本次 build-v1 模拟旧脑服务400和空音频索引：普通句子可回退英语 TTS，含名句不回退 TTS；名字原子缺失时省略名字，只播已有 Jenny 句干，句干也缺失时静音保留文字。实际新 Jenny 音频未生成、未试听；完整1795条中仓库仅有85条对应MP3，缺1710条。完整名字原子播放、404/超时等媒体故障路径及真实麦克风不是本次自然指针套件的覆盖范围。

本次未额外跑全部历史浏览器套件，也未把沉默 offer 的跨日/7天暂停、建造各级掌握度、复杂/嵌套建筑等设计边界声称为已验收。旧套件的词数与一级题面断言已随实现同步。建筑识别仍为14×10有界 BFS，最多8个建筑。

部署与后续音频准备步骤见 [DEPLOY-build-v1-brain.md](DEPLOY-build-v1-brain.md)，仅文档，本次未执行。

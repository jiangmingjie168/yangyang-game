# Block World v4r：真实点击复测修复

2026-11-04；主实施模型 gpt-6-astra。基线 `codex-fix-v4r` 原 tip `3c78a9d`，其游戏文件与 `e29d05d` 相同。运行时代码仍只有 `index.html`；Playwright 留在 tests，不加入游戏包。

## 四个根因问题

1. **寻路是否有距离/同屏条件？** `beginSeek` 没有 200–600px 的启动距离上限，也没有“必须近身”的门槛。近身判断只决定何时实际互动：动物 64 世界像素、采集 3 格；seek 有 12 秒超时。原版能在 1440×900 新档里点击远树并采到 Wood，已实际观察，不能把所有失败说成 seek 完全没实现。另一个真实问题是：默认兔子在树另一侧，树叶墙高 4 格，普通跳跃约 2.5 格。seek 已武装也会撞树，原测试的平地指定存档没有覆盖这个障碍。

2. **滚动/缩放时坐标是否错位？** 本轮没有发现世界/屏幕换算的固有偏移：绘制和输入都使用 `drawCamX/Y` 与 `tileScreen/TILE`。确证的是 DOM 命中遮挡：1000×360 的默认新档里，`.mid` 覆盖 x=138…748、y=250…354；`#hud .mid { pointer-events:auto }` 优先级高于 `.mid { pointer-events:none }`，透明区域吞掉脚边点击。只读 `elementFromPoint(700,251)` 返回 `.mid`，事件根本没到 canvas。小高度窗口会触发此问题；浏览器缩放改变 CSS 可用高度时也有同类风险。本轮实际跑过 1000×360、1440×900 和 DPR=2，**没有把 DPR=2 冒充真实浏览器缩放测试**，也没有家长原设备的精确 viewport。输入换算补上 canvas rect 尺寸归一化，防止显示尺寸与内部视口不一致。

3. **动物游走是否取消 seek / 重置狗计数？** 已选中的动物在 seek 中本来就会等候，不会因游走直接取消 seek；原同会话 `love` 也不会因游走重置。问题在于到达互动后马上恢复随机走动，下一次点击可能落到羊或空气；短屏大单词卡还会挡住动物、吞掉后续点击。另有独立的跨会话问题：旧存档没保存未满三次的 love，重载才会归零，不能拿这个解释同会话失败。

4. **为什么旧版家长条件下不触发，而脚本 PASS？** 旧脚本在 1440×900、指定平地存档里按世界坐标换算位置点击；避开了短屏透明 HUD、实际树障碍、互动后动物走开及大卡片遮挡。本轮先在原字节页面、自然新档、无 seed/存档注入的条件下，点肉眼看到的狗脚 `(150,254)`（距角色约270px）和树干 `(700,251)`（约280px），连续三帧原地不动；修复后同点通过。此复现解释已证实的机制，不声称已经重建家长未知尺寸设备的全部历史现场。

## 改动

- 去掉透明 HUD 布局盒的点击拦截；hotbar 只占实际内容宽度，真实按钮、摇杆和库存滚动仍可操作。
- 自动走近遇到障碍时，最多探测 5 格高的可用边缘，使用有界增强跳跃；全部仍走重力与实体碰撞。接近树下动物时先越过树冠边缘再下降。无传送、穿墙或自动挖树；键盘基础跳跃参数不变。
- 武装 seek 时显示目标名称和脚边圈，失败超时显示 `Try moving closer!`；空地误点给简短提示，误点羊仍反馈 Sheep，不强行当作狗。
- 动物被拍后至少停留4秒；狗/猫显示 1/3、2/3 hearts，三次仍为同一只动物才驯服。love 作为存档数组的可选第6项保存，旧档兼容为0。
- 小高度窗口收小单词卡，进度提示与动物不再被大卡遮盖。
- 一级题目生成、选项及答题逻辑未改。

## 自然可视验证

`tests/natural-pointer-v4r.cjs` 原样提供 HTML；新 browser context 从正常开始/欢迎入口进入，无 seed、storageState、addInitScript、BW 调用、HTML 改写或世界坐标探针。点击坐标取自此前肉眼查看的新档截图；运行时只读可见 DOM 断言。跟随由连续截图检查角色/狗相对地标的位移，未用内部动物坐标冒充视觉证据。

```sh
PLAYWRIGHT_MODULE=/workspace/codex-claude-trial/render/node_modules/playwright-core node tests/natural-pointer-v4r.cjs
# 对照旧版（先导出原字节）：
git show e29d05d:index.html > /tmp/v4r-baseline.html
BW_SOURCE=/tmp/v4r-baseline.html BW_EXPECT_FAILURE=1 PLAYWRIGHT_MODULE=/workspace/codex-claude-trial/render/node_modules/playwright-core node tests/natural-pointer-v4r.cjs
```

| 验证 | 结果 |
| --- | --- |
| 自然狗脚边约270px，点击→行走→爱心 | PASS |
| 同只狗三次拍、1/3→2/3→Pet，走开跟随 | PASS，最新第7帧狗清晰可见 |
| 自然兔子脚边约495px，跨完整树后爱心 | PASS；库存仍空，树未挖 |
| 自然远树约280px，点击瞬间Wood=0、到达Wood=1 | PASS |
| DPR=2自然远树 | PASS |
| 自然触发的两道一级题 | PASS：Listen and choose!，两选项只有图标、无可见词；答前全文不含tree/wood |
| 原版相同短屏狗脚/树干路径 | 按预期失败，证明新测试能区分前后版本 |
| 浏览器页面异常 / git diff --check | 无异常 / PASS |

原版失败连续帧：`screens/v4r-before-dog-{1,2,3}.png`、`screens/v4r-before-short-tree-{1,2,3}.png`。

修复连续帧：
- 狗：`v4r-dog-1-click.png` → `v4r-dog-2-walking.png` → `v4r-dog-3-heart.png` → `v4r-dog-4-second.png` → `v4r-dog-5-tamed.png` → `v4r-dog-6-follow.png` → `v4r-dog-7-follow.png`。
- 树：`v4r-tree-1-click.png` → `v4r-tree-2-walking.png` → `v4r-tree-3-wood.png`。
- 兔：`v4r-rabbit-1-click.png` → `v4r-rabbit-2-walking.png` → `v4r-rabbit-3-jumping.png` → `v4r-rabbit-4-heart.png`。
- 一级：`v4r-level1-short.png`、`v4r-level1-dpr2.png`；结果记录 `screens/natural-pointer-v4r-results.json`。

边界：这不是任意地形的全局寻路器。超过5格的墙、封闭空间、低天花板仍可能无法到达；12秒后有明确提示。未取得家长原设备/存档，最终真人复测仍由家长关闭。本轮按最新收尾指令提供固定提交 raw.githack HTTPS 预览；不再探索 SSH，不修改正式站点或 main。

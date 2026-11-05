# Block World build v1 — craftable House + Pen

基线：`fdec124e75a7d782572e98763038cca920cc3356`（fix5），工作分支 `codex-build-v1`。运行时只改 `index.html`；HUD：`build fdec124+craft`。本轮不 merge main、不部署站点/预览/脑服务、不生成语音。

## 配方与旧散块

| 合成台显示 | 消耗 | 产出/库存键 | 固定占地 |
| --- | --- | --- | --- |
| House | 1 Stone + 4 Planks | 1 整件，`houseKit` | 3×3 格 |
| Pen | 4 Fence | 1 整圈，`pen` | 4×2 格 |
| Roof blocks ×4（旧配方改显示名） | 1 Stone + 2 Planks | 4 旧散块，`house`，格子 ID 14 不变 | 原逐块/四格 Roof 工具 |

原有 Planks、Stick、Fence、Door、Window 等散块配方保留。House/Pen 出现在合成台、背包和 Build 栏；Build 栏把两件及 Remove 放在前面，手机无需滚到末尾。旧 House 散块在背包标为 **Roof blocks**，不会被自动转换或消耗为整件。合成前同时检查原料和 99 件库存上限，避免产出被截断后丢材料。

## 一次放置与回收

- 点选整件，再点空地，点击格是**左下角锚点**，图形向右、向上展开；点地面格则放在该格上方。悬浮预览显示整片范围和像素图。
- 预检全部占格为空、没有其它整件、下面每列都有同一高度的实心支撑、在世界范围和建造距离内；仅成功后扣 1 件。花、树、石头、散块和其它整件都占格。无需围墙、屋顶或 flood-fill 检测。
- 整件作为可穿行的场景物件，人物与动物不会被整件困住；整件占格仍阻止再放整件或散块。Pen v1 的围栏圈是完整视觉场景，不提供关住动物的碰撞/寻路系统。每世界最多 64 个整件。
- Remove 或 Build 中的 Break 选中移除工具，点整件任意占格，整体回收 1 件到背包；不拆成 Stone/Planks/Fence。回收保留 level 和所有部件材料档位。库存满时不移除。
- 正常模式也能从背包选整件后点击地面。点击世界不再隐式接受 Show 邀请，避免一次放置操作误扣问答额度。

## Show、庆祝和 fix5

放下整件立即发光框、夸赞和撒花。House → house 题，Pen → fence 题，均复用现有开场、题目、选项、收尾与 Jenny 词汇；Pen 不新增 spoken `pen` 词。问答入口只认 `build_objects` 的类型。旧封闭散块小屋或围栏圈也走 free 夸赞路径，不再根据几何给题。散块词汇识别仍可作为轻量夸赞。

一级路径：开场 `Wow! Show me!` / `Can I see it?` / `Look at that! Show me!` → 孩子点邀请内 Show → `What is this?` → House/Fence 两个选项 → `You built a house! …` 或 `You built a fence! …` + 撒花。二级为 `What's this?`；三级为 `I made a house. Say it!` 或 `I made a fence. Say it!`；二/三级保留 8 秒后的图片选项。逐帧逐字台词记录在主测试结果 JSON 的 `frames[].line/options`。

fix5 保留：

- 只有接受邀请内 Show/Speak 才累计一次。手动、自动和 revisit 合计最多 4 次/天；邀请出现、重复工具栏 Show、取消、35 秒过期和答题不重复扣次数。第 4 次接受后显示 spent，第 5 次拒绝。刷新保留，New world → Tap again 清零。
- 在未满额度时，完成/过期的整件附近新增 1 个存活块，或再放 1 件，可重亮。新件优先成为下一次 Show 的目标；尚在读的现有邀请不被强换对象。已移除的对象不能继续问答。
- 自动邀请仍开启 `AUTO_SHOW = true`，自动接受上限 2，合计上限 4。邀请自实际显示起 35 秒；期间选材、放置、移动、重复点工具栏不会提前关闭或重新计时。
- 多个相邻整件的待庆祝事件不会覆盖正在读的 Show 收尾。撒花在整件光框和夜色之后绘制，避免大面积发光填充冲淡彩纸。

## 存档与部件形状

仍使用 `block-world-save-v1` / `v:1`。原 `mods`、`inv.house`、`progress.crafted`、`build_chat`、`build_words`、偏好和进度兼容。新增两个可选顶层数组，缺省为空：

- `crafted_objects`：未放置整件实例列表，配合 `inv.houseKit` / `inv.pen` 数量；回收后原材料档位仍在。读取时以库存数量为准，不足的实例补默认，多余的忽略。
- `build_objects`：已放实例；这是整件的权威数据。`builds` 继续作为旧有反馈摘要，刷新后由实例和散块重建；旧 `builds.kind=house/pen` 本身不再授权问答。

House 默认实例（背包中不含位置及 Show 状态；放下后增加它们）：

```json
{
  "item": "houseKit", "kind": "house", "level": 1,
  "w": 3, "h": 3,
  "parts": {
    "wall": {"material": "wood", "tier": 1},
    "roof": {"material": "planks", "tier": 1},
    "yard": {"material": "grass", "tier": 1},
    "window": {"material": "glass", "tier": 1},
    "foundation": {"material": "stone", "tier": 1},
    "door": {"material": "wood", "tier": 1}
  }
}
```

Pen：`item/kind="pen"`、`level=1`、`w=4,h=2`，`parts.fence/gate={material:"wood",tier:1}`、`parts.yard={material:"grass",tier:1}`。已放实例增加 `id="object:x:y"`、`x,y`（左上角格）、`createdAt`、`roofed`、`closed/shown/autoOffered/invited/roofPraise` 和 `feedbackMembers`。`invited` 为瞬态，读取时复位。校验类型、范围、重叠和部件值；当前合法材料 wood/planks/grass/glass/stone/sand/flower，tier 1–9、level 1–99。v1 合成全用默认 1，未开放升级入口。

外观由 `kind + parts` 生成并缓存 canvas，墙、屋顶、窗、围栏门等有独立绘制逻辑与材料调色槽，未把实例压成一个不可扩展贴图编号。v1.1 改造消耗、材料切换交互、专属改造问答均未做。

## 美术资产与工具

使用现有 canvas 像素绘制管线（整数矩形、分层阴影、高光、禁用平滑缩放），手工绘制 House 96×96 和 Pen 128×64 原生像素母版。没有 emoji 或纯色方块占位：House 包括木梁墙、逐层瓦纹、烟囱、玻璃反光窗、门把手、石基台阶、花坛；Pen 包括前后围栏、侧向透视回栏、木桩高光、斜撑门、金属门闩和草地纹理。游戏、配方卡、建造栏及背包复用同一套母版。

- 权威绘制源：`index.html` 的 `drawCraftableArt` / `craftableSprite`。
- 导出工具：`tests/export-build-v1-craftable-art.cjs`，通过本机 Chrome/Playwright 执行**纯美术函数**，不加载游戏或问答。
- 可审 PNG：`icons/build-v1-craftable-house.png`、`icons/build-v1-craftable-pen.png`。运行时内联生成，无额外网络资产依赖。
- Python3 + Pillow 用于截图彩纸像素核验和放大资产对照图，不生成语音。

## 新文字清单（仅 UI / 静默反馈）

未增加 `BUILD_LINES`、Jenny 文件、词汇课程或脑服务代码。47 个课程词维持不变，House/Pen 库存别名分别映射已有 house/fence 词。新增或调整的英文界面文本如下，若后续需要录音，请单独评审：

- `House`、`Pen`、`Roof blocks ×4`、`Roof blocks`、`Roof: 4 roof blocks`、`A roof needs 4 roof blocks.`
- `Tap empty ground · 3 × 3 · House`、`Tap empty ground · 4 × 2 · Pen`
- `Tap a building or block · Get it back`
- `Find a clear 3 by 3 space!`、`Find a clear 4 by 2 space!`、`Choose flat ground!`、`Remove a building first!`
- `Place a building or 2 blocks first!`、`Add 1 building or block, then Show!`
- 无库存时现有模板组合的 `No more house!` / `No more pen!` 为静默建造反馈。

## 验证与证据

主验收：`tests/build-v1-craftable.cjs`，原 HTML 字节，desktop 1366×768 / mobile 844×390；仅初始给足原料，合成、放置、Show、选项、拆除全部是 Playwright 真实鼠标事件。不调用内部问答/放置函数，不注入类型、计数或时钟；其余 evaluate 仅读坐标、库存、存档。截图只在捕获期间隐藏只读 debug 面板。保存鼠标轨迹、源 SHA-256、逐字题面、选项和撒花像素数。

- C/P：配方成本、失败不扣件、一次放置、庆祝、完整 Show、整件回收、刷新后再放及已放持久化。
- F：两块散放仍庆祝，Show 仅夸赞，刷新保留。
- Q/R/I/V：4 次接受上限/刷新/新世界；过期后和完成后 +1 块；约 35 秒邀请；版本标记。
- T2/T3：家长页鼠标选难度，House 二级 / Pen 三级，8 秒后出现可选图片并完成问答。
- N：重叠失败不扣件；完成后从普通背包再放 1 件，重亮并问新件。
- `tests/build-v1-craftable-compat.cjs`：旧 main 存档叠加既有散块封闭房子；库存/进度/偏好/格子保留，Show 只夸不问（desktop/mobile）。
- `tests/build-v1-fix3.cjs`：J/S/B/P/G × desktop/mobile，保留散块自动庆祝、叠放、落点、移动反馈检查。
- `tests/run-build-v1-craftable.cjs`：build-placement-fix3、chinese-cleanup、natural-pointer-v4r、world-v2、memory-chat、server。

旧 build-v1/fix1/fix2/fix5 中“散块几何必须触发房屋题”的断言已被本轮产品口径明确废止，保留历史文件，不伪改页面使其通过。本轮以新矩阵、旧档兼容和仍适用的 fix3/放置套件替代。最终计数、哈希和交付目录见 `/workspace/handoff/build-v1-craftable/CODEX-REPORT.md`；开发过程中失败尝试另存，不算最终通过证据。

### 最终主矩阵

`build-v1-craftable-final-v2`：**20/20 PASS**（C/P/F/Q/R/I/V/T2/T3/N × desktop/mobile），176 张截图、46 张庆祝帧，粉/紫彩纸像素每帧至少 221。邀请 I：desktop 29,722 ms、mobile 29,578 ms 后仍完成接受；R 开场截图至过期截图分别约 35.08 / 35.40 秒，无扣次。旧存档兼容 2/2 PASS。

最终 HTML MD5：`b00bd982582bc60c9ee39dd6e7666fc4`；SHA-256：`ffac2b846bf371a2f0371e5e81a307fe8b7dff36aff244ca877f0dc904774c25`。主结果 JSON 内的源 SHA-256 与此相同。

最终源码上的回归入口 **8/8 exit 0**：旧档兼容、fix3（10/10 鼠标案例）、build-placement-fix3、chinese-cleanup、natural-pointer-v4r、world-v2、memory-chat、server。汇总：`screens/build-v1-craftable-summary.json`；关键帧索引：`screens/build-v1-craftable-evidence.md`。最终证据已复制至 `/workspace/yangyang-game/screens-deliver/build-v1-craftable/`，含 PNG 母版、176 张主矩阵截图、兼容/散块回归截图、录像及日志。

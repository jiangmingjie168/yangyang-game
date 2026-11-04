# Build v1 第二轮复测修复（fix2）

基线：`8bed02e`，仅 `/tmp/bw-build` / `codex-build-v1`。以下先记录修改前的代码事实；实现和实测结果在后续节追加。

## 1. 修改前认定条件（按代码逐条）

- `detectBuilds` 中心来自已有建筑中心、`dirtyPoints`（最多512点）及最近放置点；窗口 `[cx-7,cx+6] × [cy-5,cy+4]`，即14×10，世界边缘裁剪。
- `sealed(x,y) = solid(get(x,y)) || get(x,y)===DOOR`。实心集合是 Grass、Dirt、Stone、Wood、Leaves、Sand、Planks、Table、Bed、House、Bedrock、Fence、Window；Door另加。天然地面/树叶能封口，但不能充当玩家建造数量。
- 每个非 sealed 格以四邻接 BFS 扩散；任何内部格碰到窗口边缘即 `edge=true`，拒绝。不存在“端点相距几格即闭合”的宽容规则；缺口无论多小，只要能四邻接连到窗口边缘就失败。必须有至少一个内部格。
- 边界先去重，再过滤 `cells[at]!==base[at]` 且材料是 Wood/Stone/Planks/House/Fence/Door/Window；**玩家边界块至少6块**。天然地面虽可封底，不计这6块；不要求地面一定是草或完全平坦。
- `roofed`：内部包围盒的**每一列**，在内部最上行上方1–4格内，均有玩家放置的实心块且不是 Fence。并非一个任意顶块就算顶盖；Door不是实心，不能作顶盖。
- kind 的优先级：`roofed ? 'house' : hasFence ? 'pen' : null`。无顶、无Fence的纯墙即使封闭也不登记。house/pen不要求角色在里面。room另需角色身体所在格在内部、包围盒宽高各≥2并停留1.5s；此代码并未额外检查内部形状为完整2×2。
- 放置/拆除令 `buildDirty=true`；最后动作后≥2.5s才 `detectBuilds()`。`buildQuiet()`另需无模态/面板/寻路/方向输入/摇杆/跳跃、落地、非水中/骑乘/钓鱼、换材后≥4s、词卡已结束。
- closed：quiet后每建筑一次、每会话最多2次，直接显示4.5s的 `Wow! It's all closed!`（fix1已绕过常规冷却）。该路径**没有调用 celebrate**，不能证明有撒花。
- 自动Show：最后动作≥4s、有放置、quiet且无ambient，`inviteBuildShow(false)`只取横向距离建筑中心<14格的第一个 `buildRegions`。每建筑邀请一次、每天最多2次。队列最多2条、30s过期；实际显示还受气泡间隔25s、提问间隔45s、每天6/会话3问限制。因此“4s阈值”不等于4s可见；先出plan可能使Show拖至45s。
- 主动Show：建造会话内点Buddy→`inviteBuildShow(true)`，还要求本会话 `placed≥6` 且最近动作≤30s，**仍必须找到已有闭合建筑**。不占提问额度；每日第3次起只夸（仍受非问句夸赞冷却）。Build模式下世界点击用于放置，点宠物不走Show。

## 2. Hana A/B 修改前逐条判定

| 条件 | A：两块Fence，相距多格、中间空 | B：左右各2块Planks，相隔2–3格、无顶 |
| --- | --- | --- |
| 玩家材料可计入 | PASS：Fence | PASS：Planks |
| 可落入14×10窗口 | PASS（描述的局部摆法；无实际坐标不能断言超大间距） | PASS |
| 四邻接内部不连到窗口边缘 | FAIL：两端之间上方仍敞开 | FAIL：上方敞开 |
| 至少1个封闭内部格 | FAIL：空隙是外部空气 | FAIL：双墙之间仍是外部空气 |
| 玩家边界块≥6 | FAIL：两块不足6；即便全局放8块也不算该圈的边界 | FAIL：4块不足6 |
| roofed | FAIL：Fence明确不算顶盖 | FAIL：没有顶盖 |
| kind | 无闭合记录；即使含Fence也不能跳过BFS | 无闭合记录；且纯墙无顶无Fence不能成为house/pen |
| 停手≥8s | PASS，但无法补足结构条件，也不能消除25/45s冷却 | 同左 |
| 角色在内部 | 无要求；不是失败原因 | 无要求；不是失败原因 |

八块Fence成排/成簇也会沿外部空气扩散到窗口边缘，不产生闭合region。把八块库存合成出来不是放置数量证明。

## 3. free缺失与脚本假绿

修改前没有free检测、没有free记录、没有free邀请分支。`inviteBuildShow`第一步就强依赖`buildRegions`；主动Buddy也无法补救。现有设计稿§6.3只实现了闭合规则，本轮复测明确要求的free兜底需要新增。

fix1新档脚本C按固定坐标放8块Fence：左右立柱 + 顶部横梁 + 天然地面封底；这是BFS可通过的圈，与Hana开放两端/双墙不同。脚本等Show最长55秒，未约束8秒反馈，也未检查撒花。更早的build-v1旧档段还预置了材料并清理覆盖层，只可作为兼容测试。测试通过证明了特定闭合圈路径，不能推出自由摆放体验通过。

## 4. 修复与自然指针验收

本轮实现及自然指针实测如下。运行时代码只修改`index.html`；没有生成语音、部署服务/预览或合并main。

### 4.1 本轮实现规则

- 新增独立free簇，使用仍存在的玩家放置块（与base不同、材料Wood/Stone/Planks/House/Fence/Door/Window），不是累计`placed`或库存。格子去重；两块的横、纵距离均≤5格可连接（最多4个空格间隔），整个簇限制14×10。按格子序遍历、BFS扩展，超尺寸的留给下个簇。无需封口、顶盖、角色在内部或指定地面。
- **完成阈值：≥4块建材，或≥2块Fence**。A两端Fence因此可触发；B四块Planks因此可触发；8块成排/成簇也可触发。单块Fence、2–3块其他建材只有微光，不自动完工。已认定闭合建筑的包围盒加一圈边界全部排除（包括不直接接触内部空气的角块），避免同一围栏被再次识别成free。
- 每次世界块变化后刷新微光：一块Fence或两块建材出现柔和虚线轮廓；达阈值变暖金色。纯Canvas绘制，不参与碰撞/点击，不替孩子放块。完成有实际`celebrate()`撒花和2s作品闪光。
- 检测仍在停手2.5s后，保留`buildQuiet`的落地/换材4s等保护。free与closed每建筑一次、合计每会话最多两次即时完工夸赞。夸赞至少读1.5s后，且停手≥4s，接Show；邀请不再排25s气泡队列、不再等待45s问句冷却。
- 自动邀请仍每建筑一次、每天最多两次，角色横向离中心<14格；跳过已邀请建筑，避免第一个旧建筑挡住新作品。邀请是轻量入口，不计问题；只有点击Show真正进入闭合建筑问答才消耗问题额度。问题额度不足则只夸，不延迟或隐藏Show。
- free点击Show闪光并回应`Wow! You made this! I like it! Good job!`，不拿House/Fence让孩子给不闭合的作品贴错误标签，不计掌握度。pen/house的三级问答保留。自由作品不参与宠物内部目标、room识别或回访房屋话术。
- 主动Buddy保留`placed≥6`、最近动作≤30s，但候选包含free；点按时可立即刷新尚未到2.5s的检测。第三次起只夸；主动不占提问额度。Show期间下一次放置正常扣材料并收起气泡，无模态。
- free可存入同一可选`builds`数组（仍最多8项），复用`invited/shown/closed`标志；旧档缺字段仍按原样加载。拆除重新按现存块计数，不靠反复放拆刷累计阈值。

### 4.2 Stone结论和早期配方

新档出生区`origin+14, GROUND-1`保证**一块**地表Stone，地下Stone从草地下4格起。`seekStep`只水平趋近、遇障碍跳跃，不会自动向地下开矿道；目标纵向超过3格采集半径时，水平到位仍可能够不到并超时。“Walking to stone!”仅表示开始尝试行走，不保证可达。Hana没有提供具体点位，因此不能声称已复现她当时的同一块石头。

自然指针实测：844×390刚进入世界，点击右侧可见灰石`(544,262)`→角色行走→Stone库存由0到1，任务尚可为Find a tree。另一新档按现有采木路线采3块Wood，任务为Mine stone，点击脚下露出的石块下缘`(350,310)`→Stone入包、任务前进。没有扩大采集距离、传送、自动发材料或改变v4r寻路。

原House配方要2 Stone，而出生区固定教学资源只保证1块；第二块通常要求额外挖掘/探索，不能保证早期Roof顺畅可达。因此将**House×4由2 Stone+2 Planks改为1 Stone+2 Planks**，Roof仍消耗4 House。新档实际采到1 Stone、采木合成Planks后，可真实Craft House×4并放下完整Roof。地下矿与更高/更深目标仍需孩子移动或挖掘；本轮不把所有不可达石头变成远程采集。

## 5. 验收方法、红测与证据

新增`tests/build-v1-fix2.cjs`：原始HTML、每场景独立空origin、844×390 mobile/touch、所有玩法由真实pointer完成。无init script、BW探针/内部函数、预置库存、时钟快进、强制点击或自动清理覆盖层。只读取可见DOM作断言，等待真实游戏时间。A还特意等自然plan出现，再放Fence，验证此前plan的45s提问冷却不会拖住Show。

基线红测使用`git show 8bed02e:index.html`原始字节运行同一测试：A/B/F没有完工反馈；C有闭合夸赞但Show未在8.5s内出现；R实际只有1 Stone时House不可合成；S原地表石采集通过。日志`screens/build-v1-fix2-before.log`，详细结果及原图`screens/fix2-before/screens/`。因此本轮没有把原本可达的地表石称为已修好的寻路故障。

新测试包含以下7场景；每次完成严格检查夸赞、8.5s内Show（8s目标+0.5s自动化采图余量）、非模态，以及后续Show操作。7场景已单独通过；最终整套结果见后续表。

| 序列 | 验证 |
| --- | --- |
| A | 合成8 Fence、自然plan、仅放一对留空栅栏→微光→夸赞/撒花→Show→自由作品回应 |
| B | 四块Planks分为双墙、顶部敞开→微光→夸赞/Show，不误认house |
| F | 八块Fence实心簇（无内部空气）→Show；继续放Planks不受阻；六块以上主动Buddy可再Show |
| C | 真实闭合围栏→闭合夸赞/撒花→Show→一级What is this?→Fence答对 |
| N | 放4拆1，只剩3块时不完工；补第4块才触发；刷新库存保留、无重复Show |
| R | Mine stone任务期间点地表石→1 Stone入包→真实Craft House×4→放下4块Roof |
| S | 任务前点可见石→行走帧→Stone入包，没有隔空给库存 |

`build-v1.cjs`现在同时强制执行fix1与fix2自然指针gate；其预置库存旧档段仍仅用于兼容、房间/宠物/结构/语音回归。`chinese-cleanup`等历史套件保留各自探针，仅作为历史回归，不作为本轮自然指针验收证据。

复跑（只启动本地测试HTTP服务，不部署预览或脑服务）：

```sh
PLAYWRIGHT_MODULE=/tmp/node_modules/playwright CHROME=/usr/bin/google-chrome node tests/run-build-v1-fix2.cjs
python3 tests/build-v1-fix2-contact-sheets.py
```

拼图脚本只缩放、排布真实截图及添加页外说明，不合成游戏画面。逐帧标题/文件清单见`screens/build-v1-fix2-evidence.json`；时序实测见`screens/build-v1-fix2-results.json`的`timings`。

### 最终回归结果

`tests/run-build-v1-fix2.cjs` **7/7套件PASS**；`build-v1`内嵌的fix1和本轮fix2均PASS，本轮fresh-save场景**7/7 PASS**。server **52/52 PASS、0 fail、0 skipped**。HTML内联JS、三个Node测试/runner语法、Python语法及`git diff --check`通过。

| 套件 | 结果 | 用时 |
| --- | --- | --- |
| build-v1（含fix1、fix2 gate及8项旧档/结构/宠物/语音检查） | PASS | 210.1s |
| build-placement | PASS | <0.1s |
| natural-pointer-v4r | PASS | 18.2s |
| chinese-cleanup | PASS | 5.0s |
| world-v2 | PASS | 19.0s |
| memory-chat | PASS | 19.6s |
| server | 52/52 PASS | 1.0s |

完整机器结果：`screens/build-v1-fix2-regressions.json`；总日志：`screens/build-v1-fix2-regressions.log`；各套日志：`screens/build-v1-fix2-test-*.log`。

最后放置到可见反馈的墙钟时间（毫秒）：

| 场景 | 完工夸赞 | Show |
| --- | ---: | ---: |
| A（先出自然plan） | 2804 | 4171 |
| B（双墙） | 4310 | 5667 |
| F（8块Fence簇） | 4333 | 5690 |
| C（闭合围栏） | 4315 | 5667 |
| N（拆除后补第4块） | 4310 | 5657 |

### 截图清单

共**46张844×390连续编号原帧 + 7张拼图**。完整标题和逐文件清单：`screens/build-v1-fix2-evidence.json`。

| 序列 | 连续帧 | 拼图 |
| --- | --- | --- |
| A 留空栅栏/自然plan | A-01 … A-08 | [A-sheet](screens/build-v1-fix2-A-sheet.png) |
| B 双墙/微光 | B-01 … B-07 | [B-sheet](screens/build-v1-fix2-B-sheet.png) |
| F 开放簇/不挡放置/主动Show | F-01 … F-07 | [F-sheet](screens/build-v1-fix2-F-sheet.png) |
| C 闭合围栏/一级题 | C-01 … C-07 | [C-sheet](screens/build-v1-fix2-C-sheet.png) |
| N 数量阈值/拆除/刷新 | N-01 … N-08 | [N-sheet](screens/build-v1-fix2-N-sheet.png) |
| R 任务中采石/House/Roof | R-01 … R-05 | [R-sheet](screens/build-v1-fix2-R-sheet.png) |
| S 点石→走近→采到 | S-01 … S-04 | [S-sheet](screens/build-v1-fix2-S-sheet.png) |

原帧完整路径统一为`screens/build-v1-fix2-<序列>-<两位编号>.png`。另保留基线红测原帧与结果在`screens/fix2-before/screens/`，不混入新版证据。

### 交付边界与剩余风险

- 只改本worktree，提交/推送分支`origin/codex-build-v1`；没有merge main、部署预览/脑服务或生成语音。当前测试是桌面Chromium的844×390手机视口自然指针，尚需Hana在实体设备复测；不宣称已经通过真人复测。
- free的局部连接最多允许4个空格间隔、总包围盒14×10；更分散的单块不会被合并。自动邀请仍每天2次，主动Buddy仍要求本会话放过6块且近30s内有动作。
- 地下/树冠下的任意Stone仍可能超出采集半径；本轮交付的是已验证的地表采石及早期配方可达性，不是通用挖矿寻路器。

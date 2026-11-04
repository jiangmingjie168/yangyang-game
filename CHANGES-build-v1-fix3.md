# Build v1 fix3

基线 `4da03ad63ee793206a1f2602efb5537b4b28bfa3`；仅 `/tmp/bw-build` / `codex-build-v1`。实现规格：[Claude repair brief](/workspace/handoff/build-v1-fix3/claude-repair-brief.md)。没有部署预览、脑服务，没有 merge main，没有生成或合并语音，`BUILD_LINES` 内容逐字保持不变。

## Hana 四条回执：事实、推断与修复

1. **15 秒无夸赞 / Show。** 原版 `physics` 的 `jumpBuf -= dt` 可把空中跳跃缓冲留在负数；`buildQuiet` 的 `!jumpBuf` 此后一直为假。这是确定的代码缺陷，原字节 J 鼠标连跳红测也复现了；Hana 当次是否跳过、是否正因此失败，没有日志，不能声称确定。另有确定的流程缺陷：移动立即 `closeAmbient()` 抹掉完工夸赞，作品却已标 `closed`；邀请嵌在 `buildSession.active` 中，还要求中心横距 <14 格；走远或会话过期后不再邀请。现在缓冲钳制为非负、quiet 只检查 `jumpBuf>0`，原因可在调试面板查看。完工反馈在移动/跳跃中保留自身计时；邀请独立于 active，附近或屏幕可见即可。新放置由本页 `placedThisRun` 集合判定，不依赖会话累计数；旧档加载不凭空夸旧结构。摇杆失焦和 lostpointercapture 会清空所有输入状态。
2. **Fence 7→6 但落点不明。** 原版先 `setCell` 再 `consume`，没有扣料却跳过写格的成功分支。按代码，那块是 `cells[idx(x,y)]=FENCE`，会进入放置记录与簇。没有 Hana 当时存档或坐标，无法还原具体落在哪一格，也无法确定是动物、角色、HUD 遮挡还是格边误点。原版建造成功没有 burst、声音或落点脉冲，建造白框还是与鼠标无关的自动目标，这些均已修正：鼠标预览和点击共用 `resolveBuildTarget`；成功逐格 burst、声音、1.2 秒顶层金框；失败提示且不扣库存；动物身体占格拒绝；HUD 遮住落点时隐藏 status/toast 并关闭反馈气泡，选工具后恢复。调试日志记录屏幕点→实际格子→放置/失败/叠放来源。
3. **双墙第二层失败。** 原射线仅从胸口到目标中心；PH=28 小于 TILE=32，胸口和底座同排，贴墙向上点先穿入底座。普通 Place 白框也没有检查视线。现在保留 supercover 单线、角点双格检查，使用头/胸两起点及中心/内缩角目标；另补上方 0.1/0.9 两目标点，覆盖极贴墙第三层（brief 的 0.2 角点在角色横向比例 0.7–0.75 时仍可能先撞第二层，新增几何用例验证）。任何候选线必须全程无实心格，封闭墙仍不可穿。建造模式点自有实心块可叠至其上；天然块仅上 40% 可叠。普通模式已选建材时，自有块上 40% 叠放，下 60% 仍采集。Place 优先选面前自有柱的可见顶格，预览与实际使用相同视线/动物检查。
4. **微光看不见。** 原 `drawBuildGuide` 在瓦片前绘制，轮廓被实心块覆盖，且只在 buildMode 绘制。现在网格仍在底层，簇轮廓、2.5 秒完工 flash、落点 pulse、0.8 秒挡格红框放到动物/trail 后。1 Fence 或 2 建材为白虚线；ready 为暗描边加金色实线、浅金填充和 2Hz 呼吸；reduced motion 固定透明度。非建造模式只画 ready 簇；邀请后轮廓消失，展示时 flash 接替。

### free、停手与旧自动化为何假绿

- **距离**按格子的切比雪夫距离：`abs(dx)<=5 && abs(dy)<=5` 可单链连接，最多隔 4 个空格；整个包围盒最多 14×10（源码限制的是最大最小坐标之差 <14、<10，再加 1 得尺寸）。不要求同排，动物和花不切断连接。只计仍在场上、与原地形不同的 Wood/Stone/Planks/House/Fence/Door/Window；已识别 enclosure 的边界不重复计为 free。
- **自动 ready**：2 Fence 或 4 任意建材；拆除按存活格去重重算。手动则附近任意建材 2 块即可。
- **重置停手**：建造点击（包括失败）、选工具、放置、拆除及方向/摇杆/跳输入；选材另记 selectedAt。现在 idle 与 select 均需 2.5 秒，还需物理位移每帧 <0.5px 累计 0.6 秒。物理微动只清 still，不直接重置 lastActionAt；镜头跟随不算动作。
- **仅阻断**：quiz、dialogue、nameFlow、welcome、面板、seek、空中、水中/骑船/钓鱼、词卡等。seek 最长 12 秒，并非永久；现在负 jumpBuf 不再构成 blocker。
- fix2 的 A/B/F/C/N 都是在 844×390 建造模式固定格放完后原地不动，从不空中连跳，也没有走远回返。它们绕过 jumpBuf 锁死、夸赞被移动清除、active/距离三个真实路径。selectedAt 原本 4 秒只解释短延迟，不能单独解释 15 秒；lastBubbleAt 的 25 秒对 Show 在 fix2 已绕过，本轮继续绕过。

## 常驻 Show 的口径

- `#build-show` 是建造栏第一个按钮，SVG 星 + Show，至少 64×48，窄屏优先可见；没有 `data-build`，没有 `disabled`。
- 选择**置灰而非隐藏**：入口位置固定，孩子可学习；不足两块仍能点出 `Build 2 blocks first!`，次数耗尽点出 `No more shows today!`。模态忙碌时置灰、不抢输入。
- 范围内存活自有建材去重计数，水平 ±14 格、垂直 ±10 格。任何建材 2 块即亮起；不同于自动 free 的非 Fence 4 块门槛。亮起时闪 1.8 秒；减少动画时只用静态金边。
- 手动不调用 buildAction，不重置选材/停手时间。优先最近 enclosure，其次成员最多的簇，最后尝试局部两块包围盒。先夸未夸的作品，再开场，1.5 秒后自动推进；邀请中的 Show 仍可提前点，stage 防重复。
- **free 点 Show 只夸不问**，沿用 fix2：`Wow! You made this! I like it! Good job!`；不把开放作品强贴成 house/fence。pen/house 沿现有 tier 问答。
- **每日合计 `shows + manualShows <= 4`，auto 另限 2。** 手动不消耗提问额度；`manualShows>=3` 的手动展示只夸不问。两字段随原存档保存，刷新不重置；本地日跨天由 resetBuildDay 归零。Buddy 走同一个手动入口，不再要求本会话放 6 块或 30 秒内操作。
- `var AUTO_SHOW = true;` 位于 BUILD_LINES 后的建造状态声明前。改 false 只关闭自动邀请，不关闭手动 Show、完工夸赞、轮廓或日志。

## 验收证据与测试边界

`tests/build-v1-fix3.cjs` 读取原始 HTML，独立空 origin；桌面 1366×768 无 touch 和 844×390 touch；`?buildlog=1` 与纯孩子界面分别运行。玩法不使用 evaluate、initScript、exposeFunction、预置库存、内部函数、时钟快进或 force 点击。所有点击坐标及用途写入 `screens/build-v1-fix3-clicks.json`，context 开启录像；原尺寸关键帧文件名含墙钟毫秒。普通 DOM 几何仅用于定位 UI 控件。

历史 `build-v1` 的旧档、语音观测与其它历史探针只用于兼容回归，不作为本轮真人点击证明。自动化鼠标证据不等于 Hana/孩子实机复测。

红测先于 index.html 修改：`screens/fix3-before/index.html` 为 `git show 4da03ad:index.html` 原字节，SHA256 `a8d1c16776ac4fcd5e447d8c75ff3c22ed82aa59d3dafc685b969afb9a4158ea`。`red-test.cjs` 保存当时脚本；J 的 `red.log` 和 S 的 `stack-red.log` 及 `stack/` 保存红测。准备阶段点错/校准站位不算有效红测，正式证据以 J 停手 0/5/10/15 秒和 S `against-wall`/`second-layer` 为准。

### 最终实测结果（编排收尾）

`tests/build-v1-fix3.cjs` **32/32 PASS**（桌面/手机 × log/clean × A,A2,J,S,B,M,P,G）。`G-mobile-clean` 曾因采木 hotbar `Wood em` 断言 flake 失败；已对 `harvest` 做最小加固（采前/等待中 dismiss wordcard、重试 8 次、单次等待 3.5s），重跑 PASS。机器结果：`screens/build-v1-fix3-results.json`（source SHA-256 `609b7c0a23b4700a7bbc71c192578f991ac6f19527d06e1aed35d647fced6137`）。

回归 `tests/run-build-v1-fix3.cjs` **7/7 exit 0**：

| 套件 | 结果 | 用时 |
| --- | --- | ---: |
| build-v1（compat） | PASS | 152.4s |
| build-placement-fix3 | PASS | <0.1s |
| chinese-cleanup | PASS | 5.0s |
| natural-pointer-v4r | PASS | 18.2s |
| world-v2 | PASS | 18.7s |
| server | PASS | 1.1s |
| memory-chat | PASS | 18.6s |

完整：`screens/build-v1-fix3-regressions.json`。

关键场景墙钟（停手后毫秒；取 clean 轨）：

| 场景 | 完工夸赞 | Show |
| --- | ---: | ---: |
| A-desktop-clean | 2554 | 4045 |
| A-mobile-clean | 2545 | 4071 |
| J-desktop-clean | 2746 | 4214 |
| J-mobile-clean | 2695 | 4226 |
| A2-desktop-clean（远距回返） | —（无 cheer 字段） | 4063 |
| A2-mobile-clean | — | 4072 |

### 截图索引（关键 clean 帧）

原帧命名 `screens/build-v1-fix3-<case>-<t_ms>-<label>.png`。重点：

| 场景 | 标签 | 代表文件 |
| --- | --- | --- |
| A desktop/mobile | A-show / A-finale / A-shared-limit | `…-A-desktop-clean-12989-A-show.png` 等 |
| J | J-cheer + idle-0/5/10/15s | `…-J-desktop-clean-9350-J-cheer.png` |
| S/B | against-wall / second-layer / B-third-layer | `…-S-desktop-clean-7248-against-wall.png` |
| P | P-two-planks-show / P-occupied / P-reach | `…-P-desktop-clean-8258-P-two-planks-show.png` |
| G | G-one/two + G-praise-survives-movement | `…-G-mobile-clean-13583-G-praise-survives-movement.png` |
| M | M-pen / M-wall-blocked / M-spent | `…-M-desktop-clean-12965-M-pen-answer.png` |

点击坐标：`screens/build-v1-fix3-clicks.json`。录像目录 `screens/build-v1-fix3-video/`（体积大，默认不入 git；交付目录可取关键 webm）。红测原字节与日志仍在 `screens/fix3-before/`。

### 交付边界与剩余风险

- 提交/推送仅 `origin/codex-build-v1`；**不** merge main；正式 `/yangyang-game/` 不动。
- 预览部署：`jiangmingjie168.github.io` 的 `yangyang-game-preview/` → https://tesla.yydriver.cn/yangyang-game-preview/ （编排收尾执行）。
- `var AUTO_SHOW = true;` 仍开启；若 Hana 真人路径仍复现不了自动邀请，可改 false，手动 `#build-show` 必须保留。
- 自动化不等于真人复测；需 Hana 全新存档：摆法一（两 Fence）、双墙第二层、手动 Show、15s 停手夸赞。
- 未生成语音；未部署脑服务。

## 编排方复测与合并提醒

Hana 用同一套真人打法复测：全新存档、备 8 Fence、摆法一、双墙、手动按钮。自动触发若仍不能在真人路径复现，就把 `AUTO_SHOW=false`、只留手动入口，去掉自动检测的合并阻塞；手动按钮必须真人点得通。语音继续等定稿。

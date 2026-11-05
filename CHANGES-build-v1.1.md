# Block World v1.1 — Car、房屋材料改造、Pen 落点

基线 `a0b08711069cc88b8894f1b35a43b94e878c6cb0`；分支 `codex-build-v1.1`；HUD `build a0b0871+v11`。运行时仍只用 `index.html`。不 merge main、不部署、不生成 Jenny、不扩脑服务。

## 合成、整件与驾驶

| 配方 | 产出 | 占地 |
| --- | --- | --- |
| Planks ×2 | Wheel ×2（`wheel`） | 中间件，不散放 |
| Wheel ×4 + Planks ×4 | Car ×1（`car`） | 3×2 |
| Stone ×1 + Planks ×4 | House ×1（原配方） | 3×3 |
| Fence ×4 | Pen ×1（原配方） | 4×2 |

- Wheel、Car 与原配方一样，先验证材料和 99 件库存上限再扣料。car / wheel 是本轮仅有的两个新词，词数 47→49；加入图鉴、Car Show 选项，以及本地 Treasure Quiz 池（寻找停放汽车上的车/轮）。没有改脑服务词表。
- Car 以左下格为锚点一次放下；Remove 整体回收一个 Car。车在背包、合成台、Build、图鉴和世界共用像素母版。
- 普通模式点车上车；刚放下且该整件工具库存已空时，在 Build 内再点车也能直接上车。仍有库存的放置工具继续检查重叠，Remove 保持回收优先。
- 当前世界是横向 2D：摇杆左右转向、前后行驶；速度 **136.88 px/s**（步行 116，1.18 倍），不跳跃、不飞行。每一像素步进检查完整 3×2 车体，实体方块、树干/树叶、石头、门、栅栏、其它整件、水及缺少陆地支撑会轻停；无损坏、不扣材料、不惩罚。
- 主线原为点正在乘坐的车或 **Get out** 下车；音效补充包后，坐车时点车身按喇叭，使用 **Get out** 下车。优先站到车旁；两侧不适合时回到可步行的车厢占地，防止夹住角色。车留在原位。
- 驾驶期间隐藏无效的 Break/Place/Jump，不接受 Build 回收、跳跃、一般问答或 Treasure Quiz；伙伴只显示非模态反馈。打开普通面板会暂停行驶。下车后恢复。
- **宠物选项：留原地。** 乘车期间驯服动物暂停跟随、没有追车传送；下车后恢复原有步行跟随。
- 停放 Show：邀请 → 1 题（Car 图 + Car/Wheel 两个像素选项）→ 记词汇星星、撒花、收尾。三级保留跟读提示和 8 秒后图片选项。点击上车取消尚未接受的本车邀请，不消耗额度；停车后仍能 Show。

## House 材料改造

正常点 House，或刚放下后再点库存已空的 House 工具对应整件，打开 **Make it yours**。菜单含母版预览、四部件、成本、缺料数；材料不足禁用，已完成显示 Finished!。选部件后再点 **Make it!** 扣料，Back 取消不扣。

| 部件 | 造价 | tier 1 → tier 2 | 单题 |
| --- | --- | --- | --- |
| Wall | Stone ×2 | 木梁墙 → 有砖缝、高光的石墙 | stone |
| Roof | Planks ×2 | 平木顶 → 阶梯瓦顶、烟囱 | roof |
| Yard | Flower ×2 | 草地 → 木花槽、花茎与彩色花朵 | flower |
| Window | Sand ×2 | 木框暗窗 → 明亮玻璃、反光 | window |

- 一次改造立即更新对应部件和外观，光框 + 撒花 + 夸赞；随后出现围绕刚改部件的 Show 邀请，接受后只出 1 题。完成获得该词星星和收尾。
- 改造统一写 `parts[part]={material,tier:2}`，`level=2` 表示已有改造，不代表四项全部完成。本版每部件最多一级；刷新、整件回收和重新放置都保留。
- 每天 4 次 Show 的旧规则不变：只在接受邀请时计次，取消、过期、重复工具栏点击不另计。改造不限额；已用完 4 次也能扣料、更新外观并庆祝，只是不再出当天第 5 题。没有额外改造次数、问答冷却或材料门槛。
- 旧 House `window.material=glass,tier=1` 等预留字段原样兼容；tier 1 不会被误认为已改造。默认外观统一为本轮要求的平顶、木框窗和未种花院子。

## Pen / Car 落点

- 大件以**点击的左下锚点**判定 8 格水平、6 格垂直建造距离，取消远角再判距离；与 House 同口径。
- Pen/Car 占地里的花、麦苗不算实体障碍；人物、动物也不挡整件。实体方块及已放整件仍挡。
- Pen 不要求四列同高实心地板：占地清楚，底边至少一处地面支撑即可。Car 为陆地驾驶保留全车底部干燥地面支撑；House 保留原有每列支撑规则。
- 失败不扣库存。实体阻挡明确提示：`A tree / rock / building / fence / flower / block is in the way!`；车靠水为 `Choose dry land!`；越界/超距继续 `Move a little closer!`；无地面支撑 `Choose flat ground!`。花提示只用于仍要求清空花格的 House。

## 存档

继续 `block-world-save-v1`、`v:1`。新增可选 `inv.wheel` / `inv.car` 与 `item/kind=car` 整件；无新独立存档键。

- 车 x 为连续格坐标（允许小数），y 为整数，`dir` 保存朝向；刷新恢复停放、不强行恢复驾驶。行驶按原 2.5 秒节流保存，退出/页面隐藏立即保存。
- House 可选 `showWord` 保存最新改造部件题，旧档缺省仍出 House 题。
- 整件反馈的邻格扫描对连续车辆位置取整，避免小数数组索引破坏重亮规则。原 `mods`、旧 Roof blocks、合成进度、图鉴、Show 额度保持兼容。

## 资产与台词

工具：手工 canvas 像素管线 `drawCraftableArt` / `drawWheelArt` / `craftableSprite`；Playwright 运行隔离的美术函数导出 PNG；Pillow 制作审阅图并核验庆祝帧彩纸。**没有 emoji、纯色方块或外链占位资产。**

可审资产：

- `icons/build-v1.1-car.png`（96×64，青绿车身、玻璃、木饰条、轮胎、轮毂、车灯）
- `icons/build-v1.1-wheel.png`（32×32，胎纹、阴影、十字轮毂）
- `icons/build-v1.1-house-{base,wall,roof,yard,window,all}.png`（96×96）
- 导出入口 `tests/export-build-v1.1-art.cjs`；对照图 `screens/build-v1.1-assets.png`。

新增词汇/固定台词 **19 条**，另列复用组合与 **30 条 UI 文案/模板**（含音频补充包 4 条家长开关标签）：`docs/build-v1.1-lines.json`。未生成 Jenny，未改 v1 语音资产或脑服务；新反馈可静默读到，已有播放机制保留。内容冻结后的录音由编排另行安排。

## 验证口径

`tests/build-v1.1.cjs`：原 HTML 字节，桌面 1366×768 / 手机横屏 844×390。所有合成、放置、驾驶、改造、邀请、答题、回收均为真实鼠标；所有 evaluate **只读**，不注入输出物品、动作、题目、时间或计数。

- C/P：空存档，真实点击采木、合 Planks、各级配方；C 驾驶、撞石、转向、上车前邀请不扣次、停车刷新、Show、回收；P 出生点花草范围内直接落点、Show、刷新。
- U：明确的“已收集材料”存档 fixture，只含原料，没有已造房屋或改造；鼠标造房、四项改造/四题/四星、刷新、整件回收再放。
- M：缺料与日限边界 fixture；验证缺 1/2、灰态、取消确认不扣、当天 Show 满额仍可改造且不弹第 5 题。
- Otree/Owater/Obuilding/Ofence：初始地形行程检查点和原料 fixture，随后真实合成车、放建筑/栅栏、阻挡放置不扣、驾驶撞停、宠物原地、点车下车。
- `build-v1-craftable.cjs` 20 案继续覆盖 House 整件、散放只夸、4 次额度、+1 重亮、35 秒邀请、二/三级和新对象优先。仅更新版本标记、具体阻挡文案，以及“空库存点击已放 House 现在打开菜单”后的无库存测试落点。
- 旧档兼容、fix3、placement、chinese-cleanup、natural-pointer-v4r、world-v2、memory-chat、server 继续跑。旧套件原有 fixture/注入机制保留，与本轮只读鼠标验收分开说明；词数断言 47→49。

主线结果见 `CODEX-REPORT-build-v1.1.md`；最终含音频结果见 `CODEX-REPORT-build-v1.1-sound.md`，交接副本 `/workspace/handoff/build-v1.1/CODEX-REPORT.md`。自动化不代替 Hana 真人签收。


## 音乐与音效补充提交（主线提交之后）

依据工作区追加的 `SOUND-ADDENDUM-READ-ME.md` / `SOUND-SPEC-v1.1-ADDENDUM.md` 和交接目录 `block-world-v1.1-sound-spec-2026-11-05.md`。主线先提交为 `6bff8d9`，音效包同分支另作提交。**没有 Jenny、人声、歌词或脑服务扩展。**

- BGM：原创 104 BPM、8 小节、约 18.46 秒，明亮的木琴式旋律、分解和弦与轻打击，尾音折回开头形成循环。首次 Start 手势沿用现有音频解锁后播放，HTMLAudio `loop=true`、默认音量 **0.30**。
- 全包 **13 个 Ogg、173,797 字节（约 170 KiB）**。全部由 `tools/make-build-v1.1-audio.py` 使用 Python/NumPy 自合成，经 ffmpeg libvorbis 压缩；没有外部采样。源码与产物使用 **CC0-1.0**，许可说明 `audio/build-v1.1/LICENSE.txt`；[CC0 正文](https://creativecommons.org/publicdomain/zero/1.0/)。无须下载素材、注册平台或调用生成服务。
- Music/SFX 默认开，两个独立开关仅在家长齿轮内。`audio_settings={music,sfx}` 可选字段随旧存档保存，旧档缺省开；不更改台词语音开关/播放路径。关闭 SFX 同时阻止原有 WebAudio 提示音，关闭 Music 不影响 SFX。
- 音频元素按首次触发延迟创建，`preload=none`，不等待加载才进入游戏。资源缺失、离线、浏览器拒绝播放均静默降级，不阻断动作；后台 `visibilitychange` / `pagehide` 暂停全包，前台 `pageshow` / 可见恢复只重启已解锁且开着的音乐。
- 引擎只在实际行驶时低音量循环（0.14），松摇杆、撞停、开面板、下车、后台时停止。**乘坐时点车身改为按喇叭**（0.6 秒防连点）；下车使用现有 Get out 按钮，孩子界面没有新增音频设置。
- 保留原有 WebAudio 轻提示（任务、动物、合成/庆祝等），新增文件音效叠加低音量播放；统一受 SFX 开关控制。台词声音仍走原机制，未替换或批量生成旧语音。

| 触发 | 文件（均在 `audio/build-v1.1/`） | 来源 / 授权 | 字节 |
| --- | --- | --- | --- |
| 首次解锁/回前台：循环音乐 | `garden-loop.ogg` | 原创自合成 `tools/make-build-v1.1-audio.py` / CC0-1.0 | 113,584 |
| 采木、采集、收麦 | `harvest.ogg` | 原创自合成 `tools/make-build-v1.1-audio.py` / CC0-1.0 | 5,097 |
| 放散块或整件成功 | `place.ogg` | 原创自合成 `tools/make-build-v1.1-audio.py` / CC0-1.0 | 4,469 |
| 拆散块或整件回收 | `remove.ogg` | 原创自合成 `tools/make-build-v1.1-audio.py` / CC0-1.0 | 4,369 |
| 配方合成成功 | `craft.ogg` | 原创自合成 `tools/make-build-v1.1-audio.py` / CC0-1.0 | 5,163 |
| 撒花庆祝 | `confetti.ogg` | 原创自合成 `tools/make-build-v1.1-audio.py` / CC0-1.0 | 5,384 |
| Build / Treasure Quiz 得星 | `star.ogg` | 原创自合成 `tools/make-build-v1.1-audio.py` / CC0-1.0 | 5,883 |
| Build / 一般问答 / Treasure Quiz 答对 | `correct.ogg` | 原创自合成 `tools/make-build-v1.1-audio.py` / CC0-1.0 | 4,735 |
| Build / 一般问答 / Treasure Quiz 答错 | `wrong.ogg` | 原创自合成 `tools/make-build-v1.1-audio.py` / CC0-1.0 | 4,663 |
| 上车（短关门声＋启动） | `enter-car.ogg` | 原创自合成 `tools/make-build-v1.1-audio.py` / CC0-1.0 | 5,178 |
| 汽车实际移动时循环 | `engine.ogg` | 原创自合成 `tools/make-build-v1.1-audio.py` / CC0-1.0 | 6,792 |
| 乘坐时点车身 | `horn.ogg` | 原创自合成 `tools/make-build-v1.1-audio.py` / CC0-1.0 | 3,967 |
| 摸宠物 | `pet.ogg` | 原创自合成 `tools/make-build-v1.1-audio.py` / CC0-1.0 | 4,513 |

验收：`tests/build-v1.1-audio-assets.py` 通过 13 个文件解码、非静音、无削波、时长、两条循环接缝和预算检查。`tests/build-v1.1.cjs` 新增 A × desktop/mobile：真实 Start、合成、放置、上车、引擎、喇叭、答错/答对/得星、回收、Music/SFX 独立关闭、刷新持久化、静音合成、重新开启和离开/返回页面。`BW.audioState()` 仅提供只读播放请求与成功计数，不改游戏/问答，不用 evaluate 注入触发。新版 O 碰撞用例改为点车按喇叭后按 Get out 下车。

**预览交付要求：部署 `index.html` 时须同时复制 `audio/build-v1.1/`。** 本轮不执行部署。真实设备最终听感、切 App 返回的系统音频策略由 Hana/杰哥复测；自动化解码与播放成功不等于真人听感签收。

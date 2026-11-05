# Block World v1.1 最终交付（含音乐音效补充包）

分支 `codex-build-v1.1`；基线 `a0b08711069cc88b8894f1b35a43b94e878c6cb0`。三项主线先提交 `6bff8d9`，依工作区追加的音乐音效规格另作同分支提交。最终完整 tip SHA 见交接副本 `/workspace/handoff/build-v1.1/CODEX-REPORT.md`。

| 项目 | 最终值 |
| --- | --- |
| index.html MD5 | `6b93dc912ff197f8c44489aa54c9e9de` |
| index.html SHA-256 | `e5ded9e7315c332113a35de116a6b978729581f3891c05b4cd98cb4b17537cf3` |
| HUD | `build a0b0871+v11` |
| 运行时代码 | 单文件 `index.html` |
| 台词清单 | `docs/build-v1.1-lines.json`：19 固定词汇/台词、30 UI 文案/模板 |

## 最终实现

1. Wheel（Planks×2→Wheel×2）→Car（Wheel×4＋Planks×4→Car×1），3×2 整件；左右驾驶 1.18 倍步行，完整车体检测树/水/建筑/栅栏/实体障碍，轻停不损坏。停车位置与朝向保存，未乘坐时整件回收。car/wheel 进入图鉴与本地问答池，停放 Show 单题、得星、收尾。
2. House 四项一级改造；材料不足禁用并显示差额，确认后扣料、像素外观即时变化、庆祝及部件单题。`parts`/`level`、回收和刷新兼容；Show 日限用完也可改造。
3. Pen 花草不挡、底边至少一处支撑；整件建造距离统一按锚点，具体阻挡反馈。Car 保留全底部干燥支撑，横向驾驶不跳跃/爬坡。
4. 驯服宠物乘车时原地等待，下车恢复原有步行跟随。音效补充包后，**坐车点车身为喇叭，Get out 下车**。主线旧证据中的“点车下车”属于补充包前版本；最终矩阵已按新口径验证。
5. BGM＋12 SFX，家长 Music/SFX 独立开关默认开；BGM 音量 0.30。首次 Start 解锁，后台/页面离开暂停，回前台仅恢复已解锁且开着的音乐。行驶引擎松摇杆/撞停/下车/面板/后台停止。开关存档，不改变原台词语音路径；孩子界面不加音频设置。

## 资产与工具

- 像素：canvas `drawCraftableArt` / `drawWheelArt` / `craftableSprite` 手工母版，Playwright 隔离导出，Pillow 审阅/彩纸核验；8 个 `icons/build-v1.1-*.png`，世界/合成台/背包/图鉴共用，无 emoji/纯色占位。
- 音频：Python/NumPy 原创自合成、ffmpeg libvorbis；1 首约 18.46 秒 104 BPM 循环纯音乐和 12 个音效。13 Ogg 总 **173,797 字节**，最大 BGM 113,584 字节，最大 SFX 6,792 字节；无外部样本、歌词、人声或 Jenny。
- 音频源：`tools/make-build-v1.1-audio.py`；文件、逐项来源、时长和大小：`audio/build-v1.1/manifest.json`；许可：自合成 **CC0-1.0**、`audio/build-v1.1/LICENSE.txt`。完整触发点表在 CHANGES。
- 预览编排需要同时复制 **`index.html` + `audio/build-v1.1/`**。像素运行时内联，无额外 PNG 依赖。本轮没有执行部署。

## 最终源码验证

| 测试 | 结果 | 证据路径（相对仓库） |
| --- | --- | --- |
| 新功能＋音频 desktop/mobile | **18/18 PASS，单次完整批次** | `screens/build-v1.1-with-audio-final/`；118 PNG、506 指针记录 |
| House/Pen/fix5 完整矩阵 | **20/20 有效 PASS** | `screens/build-v1.1-with-audio-craftable-verified/`；176 PNG、494 指针记录 |
| 旧存档兼容 | **2/2 PASS** | `screens/build-v1.1-with-audio-compat/` |
| fix3 散块/落点/反馈 | **10/10 PASS，单次完整批次** | `screens/build-v1.1-with-audio-fix3/` |
| placement/chinese-cleanup/natural-pointer-v4r/world-v2/memory-chat/server | **6/6 有效 exit 0** | `screens/build-v1.1-with-audio-regression/`，server 52/52 |
| 汇总回归入口 | **8/8 有效 exit 0** | 同上 `results-verified.json`（含兼容/fix3） |
| 音频文件解码、非静音、无削波、循环接缝、体积 | **13/13 PASS** | `screens/build-v1.1-audio-assets.json` |
| JS/新脚本语法、git diff --check | PASS | 已完成 |

`tests/build-v1.1.cjs` 使用原始 HTML 字节与真实鼠标。所有 evaluate 只读；C/P 空档采木，U/M/O/A 是明确的初始材料/地形行程/边界 fixture，不注入运行时动作、问答、产物或时钟。音频 A 断言的是媒体 `.play()` 成功计数，非仅调用请求；覆盖合成、放置、上车、引擎、喇叭、答错/答对/得星、回收，开关互不影响、刷新保留、静音合成、回到页面再解锁。旧套件仍保留历史 fixture/模拟机制，不宣称无注入。

旧完整矩阵首批 19/20 PASS：桌面 R 在浏览器停顿时超时，FAIL 截图实际已显示正常过期收尾；桌面 I 同期墙钟约 93 秒，不作为 35 秒邀请时序证据。R/I 同源码、前台定向复跑均通过；最终 I desktop/mobile 约 **29.655/29.567 秒**后仍可接受。合并工具只选完整 PASS，保留 `provenance/` 原结果，没有篡改失败。

通用回归首批 world-v2 / memory-chat 的新音频测试路由出现 `URL` 常量遮蔽及 `file://` 路径重复拼接；只修正测试路由后两者 exit 0。`results.json`、原失败日志、`retry-exits.json` 和重试日志全部保留；游戏源码不变。最终主矩阵、合并旧矩阵及 `regression/source.json` 的 SHA-256 一致。

## 证据与交接

- 主入口：`screens/build-v1.1-evidence.md`、`screens/build-v1.1-summary.json`。
- 优先手机截图：C seated / rock-stop / parked-persists / car-wheel-question；U wall/yard celebration / upgrades-persist；P placed-celebration；Owater / Otree / Obuilding / Ofence gentle-stop；A sound-playback / sound-settings-off / sound-restored。
- 交付副本：`/workspace/yangyang-game/screens-deliver/build-v1.1/`，包括最终与主线证据、PNG 母版、音频包、CHANGES 和报告。
- 主线报告仍保留于 `CODEX-REPORT-build-v1.1.md`；它对应 `6bff8d9` 的音频追加前源码，不能把其中旧 MD5 当作最终 tip。

## 未做项 / 验证边界

- 没有 merge main、部署站点或脑服务、生成 Jenny/任何人声；没有更改旧语音包或扩展脑服务。
- Hana 真人签收、真机音乐听感和切 App 返回的系统音频策略仍由编排/真人验收。自动化播放/解码和手机横屏模拟不等于真机试听。
- 开发失败尝试留在本 worktree 的未跟踪 `screens/build-v1.1-dev*` 等目录；提交/交付的有效矩阵与失败来源记录已明确分开。

# Block World v1.1 主线验收报告

分支：`codex-build-v1.1`；基线 `a0b08711069cc88b8894f1b35a43b94e878c6cb0`。本报告对应汽车/房屋改造/Pen 三项主线提交；随后新增的音乐音效补充规格会另作同分支提交。最终 tip 由 `/workspace/handoff/build-v1.1/CODEX-REPORT.md` 记录。

- 主线 `index.html` MD5：`4f34eca55d8f18cf326cccf39ffe8953`
- 主线 SHA-256：`04ef30cd2adae06d4ef6963d4dfac729159da4a653af19d6ad6e8de5c5fe0ec6`
- HUD：`build a0b0871+v11`

## 实现与资产

汽车两级配方、3×2 整件、连续左右驾驶、转向、四类障碍轻停、下车/停车/回收/存档；宠物乘车时原地等待。House 四部件单级材料改造、缺料禁用/数量、确认、即时换图、光框撒花、部件单题/星星及档位存档。Pen 4×2 花草不挡、底边部分支撑、所有整件统一按锚点判断距离、具体阻挡提示。

主代码仍为单文件 `index.html`。母版由 canvas `drawCraftableArt` / `drawWheelArt` / `craftableSprite` 手工像素绘制；Playwright 隔离导出 PNG；Pillow 用于审阅图/彩纸核验。8 个 PNG 在 `icons/build-v1.1-*.png`，对应母版包括 Car、Wheel、基础 House 和四部件/全改造；无 emoji、无纯色占位、无运行时图片网络依赖。

新增固定词汇/台词 19 条，UI 文案/模板 26 条，详见 `docs/build-v1.1-lines.json`。没有生成 Jenny、修改脑服务或旧语音包。

## 测试

| 范围 | 结果 | 证据 |
| --- | --- | --- |
| 新功能 desktop/mobile | **16/16 PASS** | `screens/build-v1.1-final-v2/`：110 PNG、416 指针记录、28 庆祝帧，最少 185 彩纸像素 |
| House/Pen/fix5 全矩阵 | **20/20 有效 PASS** | `screens/build-v1.1-craftable-verified/`：176 PNG、494 指针记录 |
| 旧存档 | **2/2 PASS** | `screens/build-v1.1-compat-final/` |
| fix3 散块/落点/自动反馈 | **10/10 有效 PASS** | `screens/build-v1.1-fix3-final/` + `screens/build-v1.1-fix3-retry-clean/` |
| placement/chinese-cleanup/natural-pointer-v4r/world-v2/memory-chat/server | **6/6 exit 0** | `screens/build-v1.1-regression-final/`（server 52/52） |
| 语法/差异检查 | PASS | JS 编译、3 个新脚本 node --check、git diff --check |

新功能所有 gameplay 使用真实鼠标；evaluate 只读。C/P 空档采木→Planks→中间件→整件，没有 give/init-script 注入。U/M/O 使用明确的初始材料/地形行程/额度边界存档 fixture，不注入运行中的问答、动作、产物或时钟。旧套件保留原 fixture 机制；没有把历史测试声称为无注入。

旧全矩阵初次 18/20 通过，桌面 C/P 两例为截图/元素稳定等待超时，同源码定向复跑均通过。`craftable-verified/provenance/` 保留原失败记录，合并脚本 `tests/collect-build-v1.1-evidence.cjs` 仅选完整 PASS 案例；未把 FAIL 改成 PASS。fix3 最终整批 9/10，通过定向复跑补齐 P-mobile-clean（初次采木可见库存未及时增加，另一次重试在 Play 未就绪时失败；日志模式 P 也通过）。完整失败批次与重试目录均保留。

邀请 I：约 29.716/29.607 秒后仍可接受；R：约 35.131/34.917 秒过期，不扣次。4 次额度、刷新、New world、+1 块重亮、二/三级选项与散放只夸均覆盖。源码哈希与新主矩阵、合并旧矩阵完全相同。

截图索引：`screens/build-v1.1-evidence.md`。兼容回归产生的旧路径截图另存 `screens/build-v1.1-regression-evidence/`，原历史文件已恢复。

## 边界

- 未 merge main、未部署站点或脑服务、未生成 Jenny、未打印密钥。
- 自动化不代替 Hana 真人签收。车辆是横向陆地驾驶，不支持跳跃或斜坡攀爬；Car 放置仍需完整干燥底部支撑。
- 新增音乐音效文件尚属后续同分支补充提交；此主线提交不包含音频包。

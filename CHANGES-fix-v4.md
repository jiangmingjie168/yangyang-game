# Block World 修复单（二）

基线：origin/main a290229；工作分支 codex-fix-v4。单文件、离线玩法与现有入口保留，无游戏依赖或构建步骤。

## 修复

- 动物命中从身体中心半径 38 的圆，改为覆盖头、耳朵、身体和脚边的矩形及所在格；命中后走统一 beginSeek / seekStep。目标动物等待孩子靠近，避免随机游走逃离；清除旧方块选中框；反馈动作与头顶爱心延长至 1.2 秒。狗/猫保持连续互动三次成为宠物的规则。
- 树、石头、作物同样使用 beginSeek；采集动作范围从 10 格收紧为 3 格，超出范围先走近，抵达再采。仍使用角色原有碰撞、跨台阶和跳跃，seek 超时从 6 秒延长为 12 秒。不会传送或隔空破块。
- 一级不接受带上下文答案词的远端回复；题面统一显示 “Listen and choose!”，选项保留图片和无障碍名称，移除可见单词标签。听音按钮保留语音二选一。二、三级题面规则保持原样，答对后的反馈仍可使用目标词。

## 脚本与真实路径的差异及复现

2026-11-04 抓取 `https://tesla.yydriver.cn/yangyang-game/`，与基线 index.html SHA-256 完全一致：
`a88c437a3c7733f8d35ba36261ddf83888843ab052ad38ad2396b94caced5e73`。
先保存该响应至 /tmp/bw-production.html，再用新无钩子测试对该原始响应做 mouse.click；基线在第一项动物点击“不走近”断言失败，修复版通过。截图：screens/v4-baseline-foot-cell-failure.png。

旧 tests/real-pointer.cjs 修改 HTML，禁用 BRAIN_URL，注入 pointerState/pointerCells/pointerOpen 等；动物用例在全新 seed=42 下精确点击 `(animal.x, animal.y-16)` 身体中心，筛选横向距离 >100 的无遮挡动物。中心点击在原始基线也可成功，因此它的 PASS 不能证明脚边、选中格和回访路径正常。pointerOpen 用于另一个答题恢复用例，并非动物用例直接调用宠物函数。

新 tests/raw-pointer-v4.cjs 原样提供 index.html 字节，不改 BRAIN_URL、不 addInitScript、不注入任何运行时函数。通过 Playwright storageState 装载明确的回访存档：seed=42，角色 (2500,512)，被测动物初始 (2288,511.99)，未驯服，交互进度为空。mouse.click 点动物动态脚边 `(x+31,y+6)`，该点落在旧圆外，新版支持此容错区域；随后验证角色位移约 149 世界像素、动物 tapped 持久化和反馈，狗再点击身体两次并验证跟随位移。只用原页面已有 BW 读取坐标/存档与状态，没有通过 BW 修改游戏动作。

旧采集测试还有“近处”误判：出生点到树约 8 格，在原来的 10 格半径内被当作近处；现在用实际 reach 判断，并优先测试低处树干。摇杆恢复测试改向左拖，避免走近树后继续向右顶树而把正常碰撞误报成锁死。

限制：家长实际回访存档及具体点击坐标未提供。原始基线身体中心点击能成功；本次明确复现并修复的是脚边命中漏判，不能声称已还原家长所有动物中心点击无效的历史现场。没有以探针结果替代这一区别。

## 验收与复跑

| 项目 | 结果 |
| --- | --- |
| P0 动物真实点击、走近、反馈与狗跟随 | PASS（下述回访存档及点击区域） |
| 采集 B：树、石头、成熟作物 | PASS |
| P1 随机 10 道一级题面无目标词 | PASS，10/10 |
| 既有入口、移动、摇杆、答题后恢复 | PASS |

```sh
PLAYWRIGHT_MODULE=/tmp/node_modules/playwright node tests/raw-pointer-v4.cjs
PLAYWRIGHT_MODULE=/tmp/node_modules/playwright node tests/real-pointer.cjs
# 对照旧生产响应，预期第一项失败：
curl -Ls https://tesla.yydriver.cn/yangyang-game/ -o /tmp/bw-production.html
BW_SOURCE=/tmp/bw-production.html PLAYWRIGHT_MODULE=/tmp/node_modules/playwright node tests/raw-pointer-v4.cjs
```

- P0：无钩子真实 mouse.click，牛、狗、羊、兔走近及互动；狗三次互动后跟随。
- 采集 B：远处树干、石头、成熟作物点击瞬间不增库存，角色先位移，再增加对应库存。
- P1：从随机词序的回访存档自然拾取礼物触发 10 道一级题，逐题读取整个 #dialogue.innerText，断言不含目标词；完整题面与目标记录在 screens/raw-pointer-v4-results.json。
- 原有 real-pointer 回归覆盖新存档入口、回访入口、方向键、摇杆、答题期间锁定、答题后及家长跳过后的移动/采集/动物恢复、竖屏。

截图：screens/v4-cow-hearts.png、v4-dog-hearts.png、v4-sheep-hearts.png、v4-rabbit-hearts.png、v4-dog-follow.png、v4-walk-harvest-wood.png、v4-walk-harvest-stone.png、v4-walk-harvest-wheat.png、v4-level1.png。

## 已知边界

寻路保持原版横向移动、碰撞和跳跃模型；封闭洞穴、超高目标或无法跨越的障碍会在 12 秒后取消，不会穿墙。生产站尚未部署此分支。建议使用分支静态预览，或把 jsDelivr URL 中版本固定到本次提交；用同一回访存档对照旧站与预览，避免缓存/存档差异。

## Astra 复查（gpt-6-astra）

见 `astra-fix-v4-review.md`。三项均 PASS（有适用范围）。独立复跑 raw-pointer-v4 / real-pointer 均 exit 0；对照生产基线脚边点击仍按预期失败。重点风险：家长真实回访存档现场尚待复测；一级题抽检覆盖 `#dialogue` 文字，框外任务栏可能仍显示同名词；reach 收紧到 3 格可能影响放置/种植/钓鱼等共用操作的手感。


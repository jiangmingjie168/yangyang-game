# Block World 修复单（二）交接回报

编排：小黑豆（Codex CLI 干重活；本机只编排/验收/写回报）  
时间：2026-11-04（Asia/Hong_Kong）

## 分支与提交

| 项 | 值 |
| --- | --- |
| 分支 | `codex-fix-v4`（已 push） |
| 修复 commit | `e29d05dd3f1cf718d33c188cc39229e55e8e72a4`（`e29d05d`） |
| 最新 HEAD（含 astra 复查文档） | `PLACEHOLDER_FULL`（`ecce689`） |
| origin/main | `a29022929a5aa8991e28b7fcd828b1c231544440`（`a290229`）**未动** |
| 是否已 push | 是 → `origin/codex-fix-v4` |
| 预览 URL | https://cdn.jsdelivr.net/gh/jiangmingjie168/yangyang-game@e29d05dd3f1cf718d33c188cc39229e55e8e72a4/index.html |

## 三项验收

### P0 点动物真实互动 — PASS
- **修了什么**：动物命中从身体中心 r=38 圆改为覆盖头/耳/身/脚边矩形 + 所在格；命中后 `beginSeek` 走近再 `pet`；靠近中目标动物停游走；清旧方块选中框；爱心反馈延至 1.2s 并画头顶 ♥；狗三次互动仍可跟随。
- **如何验收**：`tests/raw-pointer-v4.cjs` 对**未改字节、无钩子**的 index.html 用真实 `mouse.click` 点脚边（旧圆外）；牛/狗/羊/兔走近+tapped；狗再点两次后跟随。对照生产/基线同用例首项失败。小黑豆独立复跑 exit 0。
- **判定**：PASS（合成回访存档；非家长原存档、非手机触摸）

### P1 一级题上下文不泄漏目标词 — PASS
- **修了什么**：一级非成功反馈时 `chatContextLeads` 返回空；题面统一 `Listen and choose!`；选项去掉可见单词标签（保留 aria-label）；二/三级保持可点名；答对赞美仍可用目标词。
- **如何验收**：自然触发随机 10 道一级题，读 `#dialogue.innerText`，均不含目标词（10/10）。结果见 `screens/raw-pointer-v4-results.json`。
- **判定**：PASS（对话框可见文字范围；框外任务栏/库存 HUD 不在此断言内）

### 采集选 B 先寻路再采 — PASS
- **修了什么**：`inReach` 10 格 → 3 格；远处树/石/作物走 `beginSeek`（与动物共用），抵达再采；禁止远程点采；seek 超时 6s→12s。
- **如何验收**：远处 wood/stone/wheat 点击瞬间库存不变，角色位移后再增加；raw-pointer + real-pointer 均 PASS。
- **判定**：PASS（横向趋近+跳跃，非全图绕障 A\*）

## 脚本假绿根因（一句话）

旧 `real-pointer` 改写 HTML/注入探针，且动物用例只精确点身体中心（新档 seed=42），**漏测回访场景下点脚边/所在格落在旧圆外的真实命中路径**，故脚本绿、真人点脚边/格不绿。

## 截图路径

- `screens/v4-cow-hearts.png` `v4-dog-hearts.png` `v4-sheep-hearts.png` `v4-rabbit-hearts.png` `v4-dog-follow.png`
- `screens/v4-walk-harvest-wood.png` `v4-walk-harvest-stone.png` `v4-walk-harvest-wheat.png`
- `screens/v4-level1.png` `v4-baseline-foot-cell-failure.png`
- 结果 JSON：`screens/raw-pointer-v4-results.json` `screens/real-pointer-results.json`

## 文档

- `CHANGES-fix-v4.md` — Codex 交付说明
- `astra-fix-v4-review.md` — gpt-6-astra 只读复查（三项 PASS + 风险）
- 日志：`codex-fix-v4.log` `codex-astra-fix-v4.log`（未进 git）

## 已知问题 / 需杰哥真人再测

1. **动物**：用真实回访存档 + 真机，点牛/狗/羊/兔的身体、头耳、脚边、所在格；若无遮挡身体中心仍无效，保留存档与录屏（不在本次脚边根因范围内）。
2. **跟随**：无宠物时点狗三次后走远确认跟随；已有宠物、动物与作物/船重叠、障碍旁、关对话后再点；猫跟随本轮未动态覆盖。
3. **一级题**：真人随机 10 题（含答错重试/揭示/答对复述）；留意框外任务栏是否同名提示；确认听音仍可用。
4. **采集**：远处树干/石头/作物先走后采；高处/障碍目标与手动取消寻路；确认不会远程破块。
5. **副作用**：`inReach` 收紧可能影响放置/种植/钓鱼/放船手感，请随手回归；全新存档问名字入口本轮未真人重测。
6. 生产站尚未部署此分支；预览用 jsDelivr pin 或分支静态站，注意缓存。

## 编排备忘

- 未手改 `index.html` 大段逻辑；Codex `gpt-6.1-sol` 完成修复并 push；astra 仅写复查文档后二次 push。
- 未 push/merge main；未打印密钥。

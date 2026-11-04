# Block World v4r 交接

- 主实施：gpt-6-astra；工作分支：`codex-fix-v4r`。
- 游戏提交：`ece751c84ae70f6a23867c373436ff2398e83a12`。
- 可直接玩的 HTTPS 固定版本：[打开 Block World v4r](https://raw.githack.com/jiangmingjie168/yangyang-game/ece751c84ae70f6a23867c373436ff2398e83a12/index.html)。
- 首次用全新浏览器访问时，raw.githack 可能先显示站方确认页；点击 **Open the page** 即进入游戏。本轮已实际点击确认页并完成线上远树采集。
- 预览验证：HTTP 200，`Content-Type: text/html; charset=utf-8`；下载文件与本地 index.html 完全相同，SHA-256 `d2be12d9d42826cca05b4a1f98463f528e32165b6689e7a12c5fc243fb1f3176`。独立新浏览器从欢迎入口进入，真实点远树后 Wood=1，见[线上预览截图](screens/v4r-https-preview.png)。

根因一句话：短屏透明 HUD 吞掉脚边点击，默认树又超出普通自动跳跃能力；狗拍后继续乱走及大卡片遮挡使后续点击失去目标，旧指定平地存档测试避开了这些真实路径。

| 关闭项 | 本轮自然路径结果 |
| --- | --- |
| 点约200–600px远动物脚边→走近爱心 | PASS：狗约270px、兔约495px；兔跨完整树，未采集 |
| 同只狗三次互动→角色走开、狗跟随 | PASS：1/3→2/3→Pet，清晰连续截图 |
| 远树→先位移、到达 Wood +1 | PASS：约280px短屏树，DPR2亦通过 |
| 一级题面已通过状态 | 保持：两道自然题均 Listen and choose!、图片选项无词；相关逻辑未改 |

[完整根因、复跑命令和范围说明](CHANGES-fix-v4r.md) · [自然点击测试](tests/natural-pointer-v4r.cjs) · [机器结果](screens/natural-pointer-v4r-results.json)

连续证据（每组至少三帧）：
- 狗：[点击](screens/v4r-dog-1-click.png) → [行走](screens/v4r-dog-2-walking.png) → [爱心/1次](screens/v4r-dog-3-heart.png) → [2次](screens/v4r-dog-4-second.png) → [驯服](screens/v4r-dog-5-tamed.png) → [跟随中](screens/v4r-dog-6-follow.png) → [跟随清晰帧](screens/v4r-dog-7-follow.png)。
- 树：[点击](screens/v4r-tree-1-click.png) → [行走](screens/v4r-tree-2-walking.png) → [Wood=1](screens/v4r-tree-3-wood.png)。
- 兔：[点击](screens/v4r-rabbit-1-click.png) → [行走](screens/v4r-rabbit-2-walking.png) → [越树](screens/v4r-rabbit-3-jumping.png) → [到达爱心](screens/v4r-rabbit-4-heart.png)。
- [一级题面](screens/v4r-level1-short.png)。

仅推送 `codex-fix-v4r`，没有 push/merge main。远端 main 验证仍为 `a29022929a5aa8991e28b7fcd828b1c231544440`；未写正式 `/yangyang-game/`，未继续 SSH 探索。按用户最新收尾要求，交付以上固定 SHA raw.githack 预览。

本轮脚本没有注入存档/探针，截图已经肉眼检查。未取得家长原设备/存档；不把 DPR2 当作真实浏览器缩放已测，也不把本轮自动化结果写成家长已关闭。封闭地形或高于5格的墙仍可能超时并提示靠近。

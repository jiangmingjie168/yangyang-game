# Build v1 脑服务与 Jenny 音频部署说明（仅文档，尚未部署）

本工作树没有连接服务器，没有推送、合并或运行语音生成。本地 build-v1、v4r 和服务端验收已通过，结果见 `handoff-build-v1.md`；新 Jenny 音频仍未生成。以下步骤仅供后续获准发布时执行，本次不执行。

## 发布内容

- `brain/server.cjs`：47 词上限、5 个新增名词、一级只接受 `What is this?`，一级未答题时禁用泄题的 context lead。
- `brain/names.json`：100 个预置英文名，每名 6 个 Jenny 原子。
- `brain/lines-manifest.json`：1795 条完整清单。
- `brain/build-v1-new-lines.json`：相对 `04abc8e` 新增的 723 条；格式与完整 manifest 相同，含 `voice`、`rate`、`lines: [{text, category}]`。
- `brain/scripts/build-lines.cjs`、`brain/scripts/generate-voice.py`：清单生成及增量/名字预生成工具。
- 新生成的 `brain/audio/*.mp3` 和相应 `brain/audio/index.json`。

`index.html` 仍是独立单文件；生成脚本从其中的 `BUILD_LINES` 读取建造原子，不要求网页加载外部台词文件。完整台词数为 4515 → 1795：新增 723、删除 3443。723 条中建造原子 48、新词相关原子 75、名字原子 600。

## 准备 Jenny 音频

不要停止、重启或干扰既有 `generate-voice.py` / `wait-voice-full-finish.sh` 任务。等它们自然完成，再在**隔离的发布目录**准备稳定音频快照，避免两个生成进程写同一个 `audio/index.json`。

以下命令只供后续运维执行，本次未执行语音生成：

```bash
# 在独立发布副本的项目根目录运行。
node brain/scripts/build-lines.cjs
python3 -m venv .voice-venv
.voice-venv/bin/pip install -r brain/requirements-voice.txt

# 完整补齐：复用已有非空 MP3，生成其余缺失项。
.voice-venv/bin/python brain/scripts/generate-voice.py

# 若已确认旧句全部齐全，可仅生成新增句。
.voice-venv/bin/python brain/scripts/generate-voice.py --manifest brain/build-v1-new-lines.json

# 家长录入表外名字后的离线预生成，示例名字仅作演示。
.voice-venv/bin/python brain/scripts/generate-voice.py --names Xxx,Yyy
```

不要依次机械执行上述三种生成命令：选择完整补齐或增量方案；`--names` 只在确需补名字时执行。当前仓库完整 manifest 仅有 85 条可复用 MP3，尚缺 1710 条，**只生成新增 723 条不能补齐旧句缺口**。服务器已有音频可能更多，发布前重新核对当地快照。

`--names` 为每名生成 `Name!`、`Hi Name.`、`Hello Name.` 和 morning/afternoon/evening 三条问候，全部 `en-US-JennyNeural`、`-15%`。它会扩充名字表和完整 manifest，再合并音频索引；增量运行不会把旧索引替换成只含新句的索引。名字只允许一至两个 ASCII 单词，每词 1–16 个字母。没有在线生成端点。

完成后核对每个清单文本规范化后的 SHA-256 前 20 位对应非空 MP3，并检查索引。试听名字、组合句、完整问候和屋顶两段夸赞；对实际音质的确认不能由清单统计代替。废弃的一级 `X or Y?` MP3 可保留，不必删除。

## 更新脑服务器

以下基于仓库 README 的示例路径 `/opt/block-world/brain` 和服务 `block-world-brain.service`；运维必须核对实际配置，不要替换现有环境变量、密钥、域名或 CORS 白名单。

1. 验收通过后，保存现有 `server.cjs`、完整 `audio/index.json` 和音频目录快照，记录现行版本。
2. 将上述候选文件与生成好的音频放入独立的待发布目录。不要把 `.env`、名字清单或服务端代码放入 nginx 公共静态目录；仅已有 `/audio/` 路由提供音频。
3. 在待发布目录检查语法和完整测试：

   ```bash
   node --check brain/server.cjs
   node --test brain/server.test.cjs
   ```

4. 先把新增 MP3 放入服务的音频目录，再以同一文件系统的原子重命名切换完整 `audio/index.json`，避免索引先指向不存在的文件。旧 MP3 保留。
5. 原子替换 `server.cjs`，然后由运维执行服务重启；沿用现有环境文件和 systemd 配置。本次没有执行重启。
6. 验证 `/buddy` 的 OPTIONS/CORS、47 个 `learned_words` 的请求成功、48 个请求拒绝；选 `window` / `wood` 的一级请求只能返回 `What is this?`（允许前置 praise），不能念出选项词。
7. 验证新单词、建造句和名字的音频 GET/HEAD，检查 HTTPS、正确媒体类型与索引缓存更新。刷新客户端后确认家长面板显示六条名字原子已就绪。
8. 在无名字、预置名字、表外名字三个场景观察音频请求与 `speechSynthesis.speak`；含名字播放路径必须是零 TTS。再人为使名字 MP3 或句干 404，确认流程照常、名字路径静音，不转实时合成。

## 回滚和未升级时的预览

回滚时恢复旧服务文件与旧索引并按既有运维方式重启；无需删除新增音频。不要把玩家存档迁回旧结构或更换 save key。

前端面对旧脑服务的 400、网络失败或旧版泄题回复时使用本地安全模板。建造对话本身不请求脑服务。未含名字的句子缺音频时回退浏览器 TTS；含 `named` 的调用永不 TTS，缺名字原子时省略名字，仅播放已有 Jenny 句干；句干也缺失或音频失败时只显示文字。选项和建造输入仍然可用。

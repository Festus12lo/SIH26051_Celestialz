---
name: plugin-builder
description: 把想法 / 文件 / GitHub 仓库变成 Kimi 插件，脚手架+校验后登记进个人插件市场（daimon-share），用户在插件页「个人」页签点 ＋ 一键安装、免重启。对标 Codex plugin_creator：自带脚本（scripts/）+ 官方登记 CLI（kimi-daimon kimi-plugin register-personal）+ cachebuster，全程本地无 token。描述创建尽量自动填字段，只在真推不出（如 MCP URL、图标）时问用户。触发：做个 Kimi 插件 / 把仓库包成插件 / 加进我的插件市场 / 改插件名·改描述·更新插件 / plugin builder。
---

# Kimi 插件构建（对标 Codex plugin_creator · 自带脚本版）

把 **想法 / 上传文件 / GitHub 仓库** 变成 Kimi 插件，脚手架 + 本地校验后**登记进个人插件市场**（注册表在 `~/Library/Application Support/kimi-desktop/daimon-share` 下的 `daimon/plugin-market/personal/<id>.json`），用户在插件页**「个人」页签**点 ＋ 安装，**daemon 侧热更活跃会话，无需重启**。

> **实现载体对齐 Codex**：本技能 = **SKILL.md + 自带脚本**（`scripts/*.py`），本地全流程**完全不依赖外部 catalog CLI**；登记动作走 Kimi 桌面版官方 CLI `kimi-daimon kimi-plugin register-personal`。运行环境：有终端 / shell 的 agent（如 Kimi Code）+ 已安装 Kimi 桌面版。**全程本地、无需 token。**
> **描述创建**：能从描述推出的字段都自己填（可用脚本 flag 传，或建完直接编辑 kimi.plugin.json），只有 **MCP server URL、找不到的图标** 这类私有信息才问用户；**绝不留 TODO / 假 URL / 失效图标**。

## 自带脚本（你的"手"，对标 Codex 的脚本集）

| 脚本 | 作用 | 对标 Codex |
|---|---|---|
| `scripts/create_plugin.py <name> [flags]` | 脚手架 kimi.plugin.json + skills/；`--with-register` 一步登记。**只用于新建** | create_basic_plugin.py |
| `scripts/update_plugin.py <dir> [flags]` | **改已有插件的元数据（首选）**：displayName/描述/图标等，改字段+升 `+local` 版本+重登记一步完成 | update_plugin_cachebuster.py + marketplace 重登记 |
| `scripts/validate_plugin.py <dir>` | 本地校验（必填/semver/组件路径/图标/TODO） | validate_plugin.py |
| `scripts/register_personal.sh <dir>` | **bash 登记（首选）**：把任意插件目录登记进个人市场（走官方 CLI `kimi-daimon kimi-plugin register-personal`），登记完即可在「个人」页签看到 | ~/.agents/plugins/marketplace.json |
| `scripts/register_personal.py <dir>` | 同上，python 版实现；与 bash 版二选一即可 | ~/.agents/plugins/marketplace.json |
| `scripts/cachebuster.py <dir>` | 只升 `+local.时间戳` 版本号（改了 SKILL.md 正文/脚本源码后用；改元数据用 update_plugin.py） | update_plugin_cachebuster.py |

## 0. 前置

- 本地流程只需 **bash / python3 / git / curl**（脚本自足，不用 catalog CLI）。
- 脚本都**用解释器调**：`python3 scripts/xxx.py …` 或 `bash scripts/xxx.sh …`。

## 1. 认输入（三种入口）

- **A. 描述** → 进 §2 自动填。
- **B. 上传文件**（SKILL.md / 脚本 / manifest）→ 以它为基础。
- **C. GitHub 仓库** → `git clone --depth 1 <url> /tmp/<repo>`，读 README/package.json 判断包法（CLI+skills → skill-only；有 MCP → 配 MCP；纯脚本 → 写 SKILL.md 指导调用）。

## 2. 从描述自填 + 只问私有信息

- **自动填**：name(kebab) / displayName / 描述 / keywords / category / skillInstructions / SKILL.md 正文。
- **判 hosted/local**：remote MCP URL → hosted；stdio/本地依赖 → local。
- **只问**：MCP-backed 缺 server → 问 MCP server URL / stdio 命令 + 是否 OAuth；icon 找不到 → 问用户（也可不设，客户端用默认图标兜底）；写/删/发操作 → 提醒并写"用前确认"。

## 3. 脚手架 + 填 + 校验

```bash
python3 scripts/create_plugin.py "<产品名>" \
  --type skill-only \                # 或 mcp / mcp+skills
  --display-name "<展示名>" --description "<简介>" \
  --category PRODUCTIVITY [--icon-url <已验证图>] [--mcp-url <MCP URL>]
```
- 生成到 **当前工作区 `plugins/<name>/`**（`--path` 可覆盖）：`<name>/kimi.plugin.json` + `skills/<name>/SKILL.md`（合法默认）。
- 图标：`--icon-url <url>` 会下载成插件根目录的 `icon.<ext>`（个人市场按 `icon.png|jpg|jpeg|svg|webp` 首个匹配读取，≤ 256 KiB）；manifest 里的 `interface.iconUrl` 也会保留（桌面目录对本地插件仍用它）。没有合适图标就留空，**不要编造 URL**。
- **按需追加组件 flag**（每个都会写进 manifest 并生成对应 stub 文件，装上即生效）：
  - `--with-agents`：子代理角色 → `agents` 字段 + `agents/<name>.md`（frontmatter name/description + 角色行为正文）。
  - `--with-commands`：用户可触发的斜杠命令 → `commands` 字段 + `commands/<name>.md`（正文写 `$ARGUMENTS` 会被用户参数替换；不写则参数以 `ARGUMENTS: ...` 追加在末尾）。
  - `--with-session-start`：每个会话开始时自动加载插件自带 skill 的提醒 → `sessionStart.skill`（type 不含 skills 时自动升级为 mcp+skills）。
  - `--with-system-prompt`：注入每个会话系统提示的行为约定 → `systemPromptPath` + `system-prompt.md`（保持精简，上限 32 KB）。
  - `--with-hooks`：会话事件时自动执行的命令 → `hooks` 字段 + `hooks/session-start.sh`（SessionStart 示例）。**hooks 是随插件自动执行的命令，登记前必须向用户展示内容并获确认（见规则）。**
  - 全组件一次生成示例：
    ```bash
    python3 scripts/create_plugin.py "<产品名>" --type mcp+skills \
      --with-agents --with-commands --with-session-start --with-system-prompt --with-hooks \
      --description "<简介>" --mcp-url <MCP URL>
    ```
- **把没用 flag 传的真实字段直接编辑进 kimi.plugin.json / SKILL.md，清掉所有 TODO。**
```bash
python3 scripts/validate_plugin.py <name>     # 修完所有 ERROR
```

## 4. 登记进个人插件市场（★核心，对标 Codex）

```bash
bash scripts/register_personal.sh <插件目录>
# 或等价的 python 版：python3 scripts/register_personal.py <插件目录>
```

→ 调用 Kimi 桌面版官方 CLI `kimi-daimon kimi-plugin register-personal <dir> --share-dir <daimon-share> --json`：CLI 完成 realpath/树扫描/manifest 校验（version 必填），把条目写进 `<share>/daimon/plugin-market/personal/<id>.json`（registeredBy "cli"）。**脚本不要直接读写注册表文件。登记只做校验+登记，从不安装。** 登记成功的 JSON 输出含 `link` 字段（`kimi-work://plugin?id=<id>`，插件详情链接），最终回复展示链接时从这里取。
→ `register_personal.sh` 是通用模板：kimi-daimon 路径取自 `DAIMON_RUNTIME_BINARY_PATH` 环境变量（客户端启动 daemon 时注入，跨平台，runtime 环境必然存在）、share 目录解析（`KIMI_SHARE_DIR` 环境变量 > macOS 默认 > 非 macOS 回退 `~/.kimi`）都已内置，**只需把 `<插件目录>` 填成当前要登记的插件路径**（必须含 `kimi.plugin.json`）；share 目录仅在非标准安装时才用第二参数覆盖。
→ 登记后插件立刻出现在插件页**「个人」页签**（状态：未安装）。**引导用户到「个人」页签点 ＋ 安装**——daemon 侧安装会热更活跃会话，**当前会话即可用，无需重启桌面版**。
（`create_plugin.py --with-register` 可把这一步并进 §3。）

### 4.1 插件本体/依赖一起装：`setup.sh` 约定

很多插件还需要一个 CLI 本体或系统依赖（如 officecli、wecom-cli 这类二进制），只登记插件会导致「市场有了、命令没有」。
**约定：插件根目录放一个 `setup.sh`，插件登记成功后由登记脚本执行它**（需显式授权，见下），把本体一并装好，用户在「个人」页签装完插件即可直接调用。

- 位置：`<插件目录>/setup.sh`（插件根目录，不需要可执行位，登记脚本用 `bash setup.sh` 调）。
- 内容：装本体的命令，例如 `curl -fsSL https://d.officecli.ai/install.sh | bash`、`npm install -g @wecom/cli`、`brew install xxx`；写前判断已安装则跳过（`command -v xxx`），保持幂等。
- 环境变量：执行时注入 `PLUGIN_DIR`（插件源目录）和 `SHARE_DIR`。
- 失败语义：`setup.sh` 失败会以 exit 2 报错并明确提示「插件已登记成功但本体未装完」，不会静默。
- 授权（安全）：`setup.sh` 是随插件分发的任意命令，**必须显式授权才会执行**——`register_personal.sh` / `register_personal.py` / `create_plugin.py --with-register` 都认 `--run-setup` 开关（或环境变量 `PLUGIN_BUILDER_RUN_SETUP=1`）。**agent 只有在向用户展示 setup.sh 内容并获确认后，才允许传入授权。**未授权时脚本只提示「已跳过」并正常完成登记（插件条目已登记好，本体可稍后加授权重跑登记，或手动 `bash setup.sh`），不会导致登记失败。

## 5. 更新 / 开发迭代（对标 Codex cachebuster）

**修改范围红线：只改源目录，绝不碰已安装目录。** 所有修改只能发生在登记的**源目录**（市场条目 `sourcePath` 指向的目录，即当初脚手架生成并登记的那个目录，通常是工作区 `plugins/<name>/`）。插件一旦安装，daemon 会把源目录整盘复制成受管副本，**绝不能直接编辑已安装目录里的副本**——那样改动和源目录分叉，而且「更新」是整盘覆盖重装，副本里的直接改动会被全部冲掉。找不到源目录就先查市场条目，别去已安装目录里改。

**场景一：改条目元数据（displayName/描述/图标/keywords/MCP URL 等 manifest 字段）→ 用 `update_plugin.py`，一条命令：**

```bash
python3 scripts/update_plugin.py <插件目录> --display-name "<新名>" [--description ...] [--icon-url <已验证图>]
```

→ **用户说"改插件名称"，要改的就是 `interface.displayName`（插件页展示的名字）——`--display-name "<新名>"`。manifest 里的 `name` 是插件 id（市场条目按 `<id>.json` 存），不是给人看的名称，不要动它。**
→ 只改写传了 flag 的字段（未传的保持原值）→ 自动升 `+local.<时间戳>` 版本 → 自动重登记覆盖市场条目（`--no-register` 可跳过，但跳过后市场条目不会变，需稍后补跑登记）。个人市场按**版本号字符串不等**检出更新：已安装的用户到「个人」页签点「更新」完成升级（重装语义，daemon 侧热更，无需重启）。
→ 也可以手动编辑 manifest 的已有字段（这是更新的标准动作），然后跑 `cachebuster.py` 升版本 + 重跑一次登记——但优先用 `update_plugin.py`，免得分步漏掉登记。

**场景二：只改 SKILL.md 正文 / 脚本源码 → 直接编辑文件，然后只升版本：**

```bash
python3 scripts/cachebuster.py <插件目录>
```

→ 把 `version` 换成 `<x.y.z>+local.<时间戳>`（不污染正式 semver）。内容随安装包走，升完版本等用户在「个人」页签点「更新」即可，无需重登记。

**红线：不要用 `create_plugin.py --force` 来改字段。** `--force` 是整盘重做：manifest 按 flag 重建（没传 flag 的字段全部回默认值）、`skills/<name>/SKILL.md` 被 stub 覆盖——用户写好的内容会丢；版本号还走 patch 位递增，污染正式 semver。它只用于"推倒重来"，日常更新一律走上面两个场景。

**`name` 是插件 id，不是名称**：用户说"改名称"永远走上面的 `--display-name`。只有真要换 id 才算新插件——市场条目按 `<id>.json` 存，改 id 会产生新条目、旧条目残留，用 `create_plugin.py` 新建一个，引导用户装新的、卸旧的。

## 规则

- **缺私有信息才问，其余自填；绝不编造。**
- **新建禁止手写 manifest / SKILL.md 骨架**：`kimi.plugin.json` 必须由 `create_plugin.py` 生成，`skills/<name>/SKILL.md` 必须从 stub 改起。agent 凭印象手写 manifest 会编出 schema 里不存在的字段（如 `entryPoints`/`permissions`/顶层 `displayName`/skills 数组），导致插件登记上但不可用。**更新已有插件时直接编辑 manifest 的已有字段（或用 `update_plugin.py`）是标准动作，不算手写骨架。**
- **更新已有插件走 `update_plugin.py`（改元数据）或 编辑文件 + `cachebuster.py`（改正文/源码）；禁止用 `create_plugin.py --force` 改字段**——--force 会按 flag 重建 manifest（未传字段回默认值）并覆盖 SKILL.md 正文，只用于推倒重来。
- **只能修改个人插件的源目录，绝不能修改已安装目录的内容**：更新/调试插件一律编辑登记的源目录（市场条目 `sourcePath` 指向的目录）。已安装目录是 daemon 从源目录整盘复制的受管副本，直接改它会和源目录分叉、且下次「更新」被整盘覆盖；改完源目录走 `cachebuster.py` / `update_plugin.py` 升版本，由用户在「个人」页签点「更新」生效。
- **SKILL.md frontmatter 是技能的生命线**：目录型 SKILL.md 必须有 `--- name + description ---` frontmatter，description 里写清触发场景；没有它技能不会被自动加载，用户只能手动调命令。
- **校验不过夜**：登记前必须跑 `validate_plugin.py` 且结果为 0 error；validate 自身报错/崩溃也算不通过，必须先修，禁止跳过校验直接登记。**登记脚本已内嵌这道强制关卡**：`register_personal.sh` / `register_personal.py` / `create_plugin.py --with-register` 都会在登记前自动跑 validate，0 error 才放行，绕过口仅有 `--skip-validate`（需向用户说明理由）。
- 写文件 / 登记插件 / 发布前**先向用户确认**；创建完把 manifest 摘要给用户。
- **hooks 与 setup.sh 同级的授权要求**：`hooks` 声明的命令会在会话事件（SessionStart 等）发生时由 runtime 自动执行，不需要用户触发。登记带 hooks 的插件前，agent 必须把 hooks 内容（事件 + 命令）展示给用户并获得确认，与 setup.sh 的授权要求并列；validate 对任何 hooks 声明都会输出 WARN 提醒这一点。
- **装完不用再提重启**：daemon 侧安装热更活跃会话。若用户说看不到插件，先确认他点过「个人」页签的 ＋ 安装。
- **PLUGIN_ID_CONFLICT 故障指引**：登记报这个错 = 该 id 已被通用安装路径（旧流程/官方市场下载）占用且没有市场条目——引导用户先在「已安装」页签卸载同名插件，再重新登记。
- **最终回复的「使用方式」只写自然语言需求，不贴命令**：插件登记+安装好后告诉用户的是「到「个人」页签点 ＋ 安装，然后可以直接对我说什么」，给 3-5 个自然语言需求示例（如「帮我搜周杰伦的歌」「看看网易云热搜」）。**禁止**把 `python3 scripts/xxx.py <命令> [参数]` 这类 CLI 命令清单贴给用户当使用方式——那些命令是写给 agent 看的（在插件的 SKILL.md 里），贴出来会让用户误以为要自己动手跑代码。用户要做的就是点一下安装，然后用自然语言提需求，插件由 agent 自动调用。
- **最终回复必须带上插件链接**：登记路径（`register_personal.sh/py`、`create_plugin.py --with-register`、`update_plugin.py` 重登记）的 CLI JSON 输出里有 `link` 字段（`kimi-work://plugin?id=<id>`）；`cachebuster.py` 路径脚本会打印 `plugin link -> ...`。最终回复用 markdown 链接形式原样给出：`插件链接：[<displayName>](kimi-work://plugin?id=<id>)`，并附一句「点击可打开插件详情」。链接一律从脚本/CLI 输出里取，不要自己拼；创建和更新场景都要带。
- 脚本一律 `python3 scripts/…` 或 `bash scripts/…` 调用。

## 一句话流程

（有终端、无 token）认输入 → 描述自填·缺私有信息才问 → `create_plugin.py` + 填 + `validate_plugin.py` → **`register_personal.sh` 登记进个人市场 → 用户到「个人」页签点 ＋ 安装（免重启，当前会话即可用）** → 更新：改名称等元数据用 `update_plugin.py`（`--display-name` 改展示名，id 不动；改字段+升版本+重登记一步完成），改正文/源码则编辑后跑 `cachebuster.py` 升版本 → 「个人」页签点「更新」。

#!/usr/bin/env python3
"""plugin_common.py — Kimi 插件脚手架的公共 helper（结构对标 Codex plugin-creator）。
把 Codex 的 helper 函数移植到 Kimi：清单换 kimi.plugin.json。
登记目标不是 ~/.kimi：个人插件市场注册表在 daimon-share 下
（daimon/plugin-market/personal/<id>.json），登记动作统一委托给桌面版官方 CLI
kimi-daimon kimi-plugin register-personal（只登记不安装；安装由用户在客户端
插件页「个人」页签点 ＋ 完成，daemon 侧热更，无需重启）。
被 create_plugin.py / register_personal.py / cachebuster.py / validate_plugin.py 复用。"""
import json, os, re, shutil, subprocess, sys, time
from pathlib import Path

# ---- 常量（对标 Codex 的 MAX_PLUGIN_NAME_LENGTH / DEFAULT_* ）----
MAX_PLUGIN_NAME_LENGTH = 64
DEFAULT_CATEGORY = "PRODUCTIVITY"
CATEGORIES = {"PRODUCTIVITY", "DEVELOPER", "FINANCE", "LIFESTYLE_HEALTH", "SYSTEM"}
SCHEMA = "https://catalog.msh.team/misc/kimi.plugin.schema.json"

# 个人插件市场注册表（不是 ~/.kimi/plugins，也不要直接读写）：
#   <share>/daimon/plugin-market/personal/<id>.json — 每个插件一个条目文件
# 条目由官方 CLI `kimi-daimon kimi-plugin register-personal` 校验后写入；
# 安装事实仍以 Kimi Code 运行时的 installed.json 为准（由客户端安装动作维护）。
MACOS_DEFAULT_SHARE_DIR = Path.home() / "Library" / "Application Support" / "kimi-desktop" / "daimon-share"


def resolve_daimon_bin(env=None):
    """kimi-daimon 二进制路径 = DAIMON_RUNTIME_BINARY_PATH 环境变量
    （客户端启动 daemon 时注入的运行中真实路径，跨平台，Windows 指向
    kimi-daimon.cmd）。该变量在 runtime 环境中必然存在，不设回退；
    缺失说明脚本运行在 daemon 会话之外，直接报错。"""
    env = os.environ if env is None else env
    value = (env.get("DAIMON_RUNTIME_BINARY_PATH") or "").strip()
    if not value:
        raise RuntimeError(
            "DAIMON_RUNTIME_BINARY_PATH 未设置（应由客户端启动 daemon 时注入）；"
            "请在 Kimi 会话环境内运行，或用 --daimon-bin 显式指定。")
    return value

# 个人市场图标约定：插件根目录下首个匹配文件（<= 256 KiB），缺省时客户端用默认图标兜底。
ICON_FILE_CANDIDATES = ("icon.png", "icon.jpg", "icon.jpeg", "icon.svg", "icon.webp")
MAX_ICON_BYTES = 256 * 1024

# ---- 名字（对标 normalize/validate/display_name_from） ----
def normalize_plugin_name(name: str) -> str:
    n = re.sub(r"[^0-9a-zA-Z]+", "-", name.strip().lower()).strip("-")
    return re.sub(r"-{2,}", "-", n)

def validate_plugin_name(name: str) -> str:
    if not name:
        raise ValueError("plugin name 归一化后为空")
    if len(name) > MAX_PLUGIN_NAME_LENGTH:
        raise ValueError(f"plugin name 超过 {MAX_PLUGIN_NAME_LENGTH} 字符: {name}")
    return name

def display_name_from_plugin_name(name: str) -> str:
    return " ".join(p.capitalize() for p in re.split(r"[-_]+", name) if p) or name

def plugin_link(plugin_name: str) -> str | None:
    """插件详情链接（kimi-work://plugin?id=<id>，id = manifest name 小写化）。
    格式权威是 daimon-shared 的 personal-plugin-link.ts，此处保持一致；
    登记 CLI 的 JSON 输出也带同格式 link 字段，优先从那里取。
    id 不满足插件 id 规范时返回 None（已登记插件不会出现，属防御）。"""
    pid = str(plugin_name).strip().lower()
    if not re.match(r"^[a-z0-9][a-z0-9_-]{0,63}$", pid):
        return None
    return f"kimi-work://plugin?id={pid}"

# ---- share 目录解析：KIMI_SHARE_DIR > macOS 桌面版默认 > ~/.kimi ----
def resolve_share_dir(env=None, platform=None):
    """解析 daimon-share 目录：环境变量 KIMI_SHARE_DIR 优先；
    macOS 默认桌面版 daimon-share；其余平台回退 daemon 默认 ~/.kimi。"""
    env = os.environ if env is None else env
    override = (env.get("KIMI_SHARE_DIR") or "").strip()
    if override:
        return Path(override).expanduser()
    if (platform or sys.platform) == "darwin":
        return MACOS_DEFAULT_SHARE_DIR
    return Path.home() / ".kimi"

# ---- 登记进个人插件市场（走桌面版官方 CLI，只登记不安装） ----
def register_personal_plugin(plugin_dir, share_dir=None,
                             daimon_bin=None, node_bin=None):
    """把本地插件目录登记进个人插件市场（不安装）。

    调用官方 `kimi-daimon kimi-plugin register-personal <dir> --share-dir <share> --json`，
    由 CLI 完成 realpath/树扫描/manifest 校验并写入
    <share>/daimon/plugin-market/personal/<id>.json（registeredBy "cli"）。
    登记后插件出现在客户端插件页「个人」页签（未安装），用户点 ＋ 安装，
    daemon 侧热更活跃会话，无需重启。同 id 重复登记覆盖条目元数据；
    同版本重复登记会打印「版本号未变化」提示。
    返回 CLI 的 JSON 输出（无法解析时返回 {"raw_output": ...}）。"""
    plugin_dir = str(Path(plugin_dir).expanduser().resolve())
    share_dir = str(Path(share_dir).expanduser()) if share_dir else str(resolve_share_dir())
    if daimon_bin is None:
        daimon_bin = resolve_daimon_bin()
    if not os.path.exists(daimon_bin):
        raise FileNotFoundError(f"kimi-daimon 不存在: {daimon_bin}（DAIMON_RUNTIME_BINARY_PATH 指向的路径无效，或用 --daimon-bin 指定）")
    if not node_bin:
        # 托管 Node 与 kimi-daimon 同目录（daemon 管理布局 tools/node/<ver>/bin/），
        # 跨平台（Windows 为 node.exe）；其次 PATH 里的 node。
        sibling = os.path.join(os.path.dirname(daimon_bin),
                               "node.exe" if sys.platform == "win32" else "node")
        if os.path.exists(sibling):
            node_bin = sibling
        else:
            node_bin = shutil.which("node")
    if not node_bin:
        raise FileNotFoundError("找不到可用 Node（kimi-daimon 同目录无托管 node，PATH 里也没有；可用 --node 指定）")
    cmd = [daimon_bin, "--node", node_bin, "kimi-plugin", "register-personal", plugin_dir,
           "--share-dir", share_dir, "--json"]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    out = (proc.stdout or "").strip()
    if proc.returncode != 0:
        raise RuntimeError(f"kimi-plugin register-personal 失败（exit {proc.returncode}）:\n{out}")
    try:
        return json.loads(out)
    except ValueError:
        return {"raw_output": out}

# ---- 图标：--icon-url 下载为插件根目录的 icon.<ext> ----
def fetch_icon_file(icon_url, plugin_root, max_bytes=MAX_ICON_BYTES):
    """把 iconUrl 下载成插件根目录的 icon.<ext>（个人市场图标约定）。

    content-type 必须是 image/*（缺失或错误一律不生成；扩展名只决定落盘
    后缀，不能充当放行依据）；扩展名限 png/jpg/jpeg/svg/webp；大小不超过
    max_bytes（个人市场单图标上限）。调用即代表「要换图标」，函数入口先
    清理目录里的候选 icon 文件，避免下载/校验失败时旧图标被静默沿用。成功返回写入的 Path；
    失败打印警告并返回 None（不阻断脚手架；manifest 里的 iconUrl 仍保留，
    桌面目录对本地插件仍使用它）。"""
    import urllib.request
    ext_map = {
        "image/png": ".png", "image/jpeg": ".jpg",
        "image/svg+xml": ".svg", "image/webp": ".webp",
    }
    url_ext = os.path.splitext(str(icon_url).split("?")[0])[1].lower()
    # 调用本函数即意味着「要换图标」：先清掉目录里的候选 icon 文件，
    # 否则下载/校验失败时旧图标会被个人市场按「首个匹配」语义静默沿用。
    cleaned_stale = False
    for candidate in ICON_FILE_CANDIDATES:
        stale = Path(plugin_root) / candidate
        if stale.is_file():
            stale.unlink()
            cleaned_stale = True
    stale_note = "（旧 icon 候选文件已清理）" if cleaned_stale else ""
    try:
        with urllib.request.urlopen(str(icon_url), timeout=15) as resp:
            content_type = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
            data = resp.read(max_bytes + 1)
    except Exception as e:  # noqa: BLE001 — 任何下载失败都降级为警告
        print(f"警告：图标下载失败（保留 iconUrl，未生成 icon 文件）{stale_note}: {e}")
        return None
    if not content_type.startswith("image/"):
        print(f"警告：图标 content-type 非图片（{content_type or '未知'}），未生成 icon 文件。{stale_note}")
        return None
    ext = ext_map.get(content_type) or (
        url_ext if url_ext in (".png", ".jpg", ".jpeg", ".svg", ".webp") else "")
    if not ext:
        print(f"警告：无法确定图标扩展名（content-type {content_type}），未生成 icon 文件。")
        return None
    if len(data) > max_bytes:
        print(f"警告：图标超过 {max_bytes // 1024} KiB，未生成 icon 文件（个人市场会省略超限图标）。")
        return None
    if len(data) == 0:
        print("警告：图标响应体为空，未生成 icon 文件。")
        return None
    dest = Path(plugin_root) / f"icon{ext}"
    dest.write_bytes(data)
    print(f"icon -> {dest.name}（{len(data)} bytes）")
    return dest

# ---- 登记前强制校验 ----
def run_validator(plugin_dir, validator=None):
    """登记前跑 validate_plugin.py：0 error 返回 True；校验失败或校验器自身崩溃返回 False。
    校验器不存在时不阻断（返回 True）。"""
    validator = validator or os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                          "validate_plugin.py")
    if not os.path.exists(validator):
        return True
    return subprocess.call([sys.executable, validator, str(plugin_dir)]) == 0

# ---- post-register hook：setup.sh（装 CLI 本体/系统依赖）----
RUN_SETUP_ENV = "PLUGIN_BUILDER_RUN_SETUP"

def setup_hook_authorized(flag=False):
    """setup.sh 是随插件分发的任意 shell 代码，必须显式授权才执行。
    授权来源二选一：调用方传入 --run-setup（flag=True），或环境变量 PLUGIN_BUILDER_RUN_SETUP=1。
    agent 只有在向用户展示 setup.sh 内容并获确认后，才允许传入授权。"""
    return bool(flag) or os.environ.get(RUN_SETUP_ENV) == "1"

def run_setup_hook(plugin_dir, authorized=False, share_dir=None):
    """插件登记成功后处理其根目录的 setup.sh（装 CLI 本体/系统依赖）。

    - 无 setup.sh：静默返回 True。
    - 有 setup.sh 但未授权：打印提示并跳过，返回 False —— 插件本身已登记成功，
      跳过 hook 不影响登记结果；本体可稍后加授权重跑登记或手动执行 setup.sh。
    - 有 setup.sh 且已授权：bash 执行（注入 PLUGIN_DIR/SHARE_DIR），失败时
      sys.exit 非零并明确提示「插件已登记成功但本体未装完」。"""
    plugin_dir = Path(plugin_dir)
    setup = plugin_dir / "setup.sh"
    if not setup.is_file():
        return True
    if not authorized:
        print("提示：检测到 setup.sh（用于安装插件本体/依赖），但未获授权，已跳过。")
        print("      向用户展示其内容并确认后，重跑登记并加 --run-setup"
              f"（或 {RUN_SETUP_ENV}=1）；或手动执行：bash {setup}")
        return False
    print("--- 检测到 setup.sh，安装插件本体/依赖 ---")
    env = {**os.environ, "PLUGIN_DIR": str(plugin_dir)}
    if share_dir:
        env["SHARE_DIR"] = str(share_dir)
    proc = subprocess.run(["bash", str(setup)], env=env)
    if proc.returncode != 0:
        sys.exit("错误：setup.sh 执行失败（插件已登记成功，但本体/依赖未装完）。")
    print("--- setup.sh 完成，本体已就绪 ---")
    return True

# ---- 文件 IO（对标 load_json/write_json/create_stub_file） ----
def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def write_json(path, data, force=False):
    path = Path(path)
    if path.exists() and not force:
        raise FileExistsError(f"{path} 已存在（用 force 覆盖）")
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return path

def create_stub_file(path, content, force=False):
    """存在且未 force 时静默跳过（不报错），对标 Codex create_stub_file。"""
    path = Path(path)
    if path.exists() and not force:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return True

def bump_patch_version(version):
    """patch 位递增：剥掉 build metadata 与 prerelease（+local.x / -beta.1 等），
    X.Y.Z -> X.Y.(Z+1)。无法解析为 X.Y.Z 时回退 0.1.0。
    用于 create_plugin.py --force 重跑时的版本管理。"""
    m = re.match(r"^(\d+)\.(\d+)\.(\d+)", str(version or "").strip())
    if not m:
        return "0.1.0"
    return f"{m.group(1)}.{m.group(2)}.{int(m.group(3)) + 1}"


def bump_local_version(version):
    """开发迭代版本号：剥掉已有 +local.* 后在 base 版本上追加 +local.<时间戳>。
    个人市场按版本号字符串不等检出更新，不污染正式 semver。
    用于 cachebuster.py 与 update_plugin.py。"""
    base = re.sub(r"\+local\..*$", "", str(version or "0.1.0"))
    stamp = time.strftime("%Y%m%d-%H%M%S", time.localtime())
    return f"{base}+local.{stamp}"


# ---- 清单（对标 build_plugin_json，换成 kimi.plugin.json） ----
def build_plugin_json(name, display_name, a):
    m = {
        "$schema": SCHEMA, "name": name, "version": "0.1.0",
        "description": a.description or f"{display_name} 插件",
        "keywords": [k.strip() for k in (a.keywords or "").split(",") if k.strip()],
        "author": a.author or "Local developer", "license": "MIT",
        "skillInstructions": a.skill_instructions or "",
        "interface": {
            "displayName": display_name,
            "shortDescription": a.short or f"在 Kimi 里使用 {display_name}",
            "longDescription": a.long or a.description or f"{display_name} 的 Kimi 本地插件。",
            "developerName": a.author or "Local developer",
            "websiteURL": a.homepage or "",
            "iconUrl": a.icon_url or "",
            "category": a.category or DEFAULT_CATEGORY,
        },
    }
    if a.type in ("skill-only", "mcp+skills"):
        m["skills"] = "./skills/"
    if a.type in ("mcp", "mcp+skills"):
        if getattr(a, "mcp_url", None):
            m["mcpServers"] = {name: {"url": a.mcp_url}}  # 不写 enabledTools：空数组是空白名单（一个工具都不注册），缺省才是全量
        else:
            m["mcpServers"] = {name: {"command": "TODO_CMD", "args": []}}
            m["interface"]["hostKind"] = "local"
            m["interface"]["platforms"] = ["macos", "linux", "windows"]
    # Kimi Code v1 manifest 的其余组件（原始 JSON 格式以 manifest.ts 解析器为准）：
    # agents/commands 是 "./" 前缀的目录路径（字符串或字符串数组）；
    # sessionStart 引用插件自带 skill；systemPromptPath 是 "./" 前缀的文件路径；
    # hooks 是 {event, command, timeout?} 对象数组（HookDefSchema，strict）。
    if getattr(a, "with_agents", False):
        m["agents"] = ["./agents/"]
    if getattr(a, "with_commands", False):
        m["commands"] = "./commands/"
    if getattr(a, "with_session_start", False):
        m["sessionStart"] = {"skill": name}
    if getattr(a, "with_system_prompt", False):
        m["systemPromptPath"] = "./system-prompt.md"
    if getattr(a, "with_hooks", False):
        m["hooks"] = [{"event": "SessionStart", "command": "bash ./hooks/session-start.sh"}]
    return m

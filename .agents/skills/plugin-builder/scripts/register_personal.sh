#!/bin/bash
# register_personal.sh — 通用：把任意本地插件目录登记进个人插件市场（只登记不安装）
#
# 用法：
#   bash register_personal.sh [--skip-validate] [--run-setup] <插件目录> [share-dir]
#
# 通用部分（不要改）：kimi-daimon 查找逻辑、share 目录解析、登记命令。
# 不通用部分（agent 按用户实际情况填）：<插件目录> —— 必须含 kimi.plugin.json；
# 可选第二参数 share-dir 覆盖默认解析。
#
# share 目录解析顺序：第二参数 > $KIMI_SHARE_DIR > macOS 默认
# （~/Library/Application Support/kimi-desktop/daimon-share）> 非 macOS 回退 ~/.kimi。
#
# 登记走桌面版官方 CLI `kimi-daimon kimi-plugin register-personal`（校验 + 写
# <share>/daimon/plugin-market/personal/<id>.json，registeredBy "cli"），不安装。
# 登记后插件出现在客户端插件页「个人」页签（未安装）；用户点 ＋ 安装，
# daemon 侧热更活跃会话——无需重启桌面版。

set -euo pipefail

SKIP_VALIDATE=0
RUN_SETUP=0
while [ $# -gt 0 ]; do
    case "${1:-}" in
        --skip-validate) SKIP_VALIDATE=1; shift ;;
        --run-setup) RUN_SETUP=1; shift ;;
        *) break ;;
    esac
done

if [ $# -lt 1 ]; then
    echo "用法: bash register_personal.sh [--skip-validate] [--run-setup] <插件目录(含 kimi.plugin.json)> [share-dir]" >&2
    exit 1
fi
PLUGIN_SOURCE="$1"

# share 目录解析：第二参数 > KIMI_SHARE_DIR > 平台默认
if [ $# -ge 2 ] && [ -n "${2:-}" ]; then
    SHARE_DIR="$2"
elif [ -n "${KIMI_SHARE_DIR:-}" ]; then
    SHARE_DIR="$KIMI_SHARE_DIR"
elif [ "$(uname -s)" = "Darwin" ]; then
    SHARE_DIR="$HOME/Library/Application Support/kimi-desktop/daimon-share"
else
    SHARE_DIR="$HOME/.kimi"
fi

# kimi-daimon 可执行文件 = $DAIMON_RUNTIME_BINARY_PATH（客户端启动 daemon 时注入的
# 运行中真实路径，跨平台；runtime 环境中必然存在，不设回退）
if [ -z "${DAIMON_RUNTIME_BINARY_PATH:-}" ]; then
    echo "错误：DAIMON_RUNTIME_BINARY_PATH 未设置（应由客户端启动 daemon 时注入）；请在 Kimi 会话环境内运行。" >&2
    exit 1
fi
if [ ! -x "$DAIMON_RUNTIME_BINARY_PATH" ]; then
    echo "错误：DAIMON_RUNTIME_BINARY_PATH 指向的 kimi-daimon 不可执行：$DAIMON_RUNTIME_BINARY_PATH" >&2
    exit 1
fi
KIMI_DAEMON="$DAIMON_RUNTIME_BINARY_PATH"

# 检查插件目录是否合法
if [ ! -f "$PLUGIN_SOURCE/kimi.plugin.json" ]; then
    echo "错误：插件目录缺少 kimi.plugin.json：$PLUGIN_SOURCE" >&2
    exit 1
fi

# 强制校验：先过 validate_plugin.py（0 error）才允许登记；validate 自身报错也算不通过。
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "$SKIP_VALIDATE" != "1" ] && [ -f "$SCRIPT_DIR/validate_plugin.py" ]; then
    if ! python3 "$SCRIPT_DIR/validate_plugin.py" "$PLUGIN_SOURCE"; then
        echo "错误：插件校验未通过，拒绝登记。先修复 ERROR；确认无需校验时用 --skip-validate 跳过。" >&2
        exit 3
    fi
fi

# kimi-daimon 需要 Node（>= 24）：优先用与其同目录的托管 Node（daemon 管理布局
# tools/node/<ver>/bin/，版本与 daimon 要求精确匹配），其次 PATH 里的 node。
SIBLING_NODE="$(dirname "$KIMI_DAEMON")/node"
NODE_BIN=""
if [ -x "$SIBLING_NODE" ]; then
    NODE_BIN="$SIBLING_NODE"
elif command -v node >/dev/null 2>&1; then
    NODE_BIN="$(command -v node)"
else
    echo "错误：找不到可用的 Node（kimi-daimon 同目录无托管 node，PATH 里也没有 node）。" >&2
    exit 1
fi

"$KIMI_DAEMON" --node "$NODE_BIN" kimi-plugin register-personal \
    "$PLUGIN_SOURCE" \
    --share-dir "$SHARE_DIR" \
    --json 2>&1

echo "已登记到个人市场（未安装）。请用户到插件页「个人」页签点 ＋ 安装——daemon 侧热更，无需重启。" >&2

# post-register hook：插件自带的 setup.sh（装 CLI 本体/依赖，如 curl install / npm i -g / brew）
# 约定：登记成功后执行；插件根目录存在 setup.sh 时，需显式授权（--run-setup 或
# PLUGIN_BUILDER_RUN_SETUP=1）才执行；未授权只提示不执行，不影响已完成的登记。
if [ -f "$PLUGIN_SOURCE/setup.sh" ]; then
    if [ "$RUN_SETUP" = "1" ] || [ "${PLUGIN_BUILDER_RUN_SETUP:-0}" = "1" ]; then
        echo "--- 检测到 setup.sh，安装插件本体/依赖 ---" >&2
        if ! PLUGIN_DIR="$PLUGIN_SOURCE" SHARE_DIR="$SHARE_DIR" bash "$PLUGIN_SOURCE/setup.sh"; then
            echo "错误：setup.sh 执行失败（插件已登记成功，但本体/依赖未装完）。" >&2
            exit 2
        fi
        echo "--- setup.sh 完成，本体已就绪 ---" >&2
    else
        echo "提示：检测到 setup.sh（用于安装插件本体/依赖），但未获授权，已跳过。" >&2
        echo "      向用户展示其内容并确认后，重跑登记并加 --run-setup（或 PLUGIN_BUILDER_RUN_SETUP=1）；" >&2
        echo "      或手动执行：bash $PLUGIN_SOURCE/setup.sh" >&2
    fi
fi

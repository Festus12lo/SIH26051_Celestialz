#!/usr/bin/env python3
"""cachebuster.py — 改了源码后升 +local.<时间戳>（对标 Codex update_plugin_cachebuster.py）。
个人市场按版本号字符串不等检出更新：升完版本后到插件页「个人」页签点「更新」即可
（重装语义，daemon 侧热更，无需重启）。本脚本只改版本号，不再触发任何安装动作。
注意：改的是 manifest 元数据（displayName/描述/图标等）时用 update_plugin.py，
它会改字段+升版本+重登记一步完成。"""
import os, sys
from pathlib import Path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plugin_common as pc

def main():
    if len(sys.argv) < 2:
        sys.exit("用法: python3 cachebuster.py <plugin-dir>")
    src = Path(sys.argv[1]).expanduser().resolve()
    mf = src / "kimi.plugin.json"
    m = pc.load_json(mf)

    m["version"] = pc.bump_local_version(m.get("version", "0.1.0"))
    pc.write_json(mf, m, force=True)
    print(f"version -> {m['version']}")
    # 本路径不经登记 CLI，单独打印插件链接（格式同登记输出的 link 字段），最终回复要用
    link = pc.plugin_link(m.get("name", ""))
    if link:
        print(f"plugin link -> {link}")

    print("版本已更新，请到插件页「个人」页签点「更新」完成升级（无需重启）。")
    print("注意：若条目元数据有变化（displayName/描述/图标/skill 或 MCP 列表），"
          "用 update_plugin.py 改字段（它会升版本并重登记），或手动编辑 manifest 后"
          "跑本脚本再重跑 register_personal 覆盖登记"
          "（同 id 覆盖元数据；同版本重复登记只会收到「版本号未变化」提示）。")

if __name__ == "__main__":
    main()

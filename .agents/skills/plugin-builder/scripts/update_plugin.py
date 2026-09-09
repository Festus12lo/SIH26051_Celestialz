#!/usr/bin/env python3
"""update_plugin.py — 更新已有插件的 manifest 元数据并重新登记。

适用场景：改 displayName / 描述 / 图标 / keywords / MCP URL 等条目元数据。
一条命令完成：只改写传了 flag 的字段（未传的保持 manifest 原值）
→ 版本号升 +local.<时间戳>（同 cachebuster，不污染正式 semver）
→ 重跑登记（同 id 覆盖市场条目元数据；--no-register 可跳过）。

注意：用户说"改插件名称"指的是展示名 displayName（用 --display-name）；
manifest 里的 name 是插件 id（市场条目按 <id>.json 存），不是展示名，本脚本不提供修改——
真要换 id 等于新插件，走 create_plugin.py 新建。
不要用它做整盘重做：那是 create_plugin.py --force 的语义（按 flag 重建 manifest、
覆盖 SKILL.md stub，没传 flag 的字段回默认值）。只改 SKILL.md 正文 / 脚本源码
也不需要本脚本：直接编辑文件后跑 cachebuster.py 升版本即可。"""
import argparse, json, os, sys
from pathlib import Path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plugin_common as pc


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("plugin_dir")
    # 元数据字段：只改显式传入的，未传的保持 manifest 原值
    p.add_argument("--display-name",
                   help="插件展示名（interface.displayName）。用户说「改插件名称」改的就是它；"
                        "manifest 的 name 是插件 id，不可改")
    p.add_argument("--description")
    p.add_argument("--short"); p.add_argument("--long")
    p.add_argument("--category", choices=sorted(pc.CATEGORIES))
    p.add_argument("--keywords"); p.add_argument("--author"); p.add_argument("--homepage")
    p.add_argument("--icon-url"); p.add_argument("--mcp-url"); p.add_argument("--skill-instructions")
    p.add_argument("--no-register", dest="no_register", action="store_true",
                   help="只改 manifest+升版本，不重登记（默认改完自动重登记，覆盖市场条目元数据）")
    p.add_argument("--share-dir",
                   help="daimon-share 目录（默认 $KIMI_SHARE_DIR > macOS 桌面版默认 > ~/.kimi）")
    p.add_argument("--daimon-bin", default=None,
                   help="kimi-daimon 二进制路径（默认读 $DAIMON_RUNTIME_BINARY_PATH，runtime 环境必然存在）")
    p.add_argument("--node", help="node 二进制路径（默认从 PATH 找）")
    p.add_argument("--skip-validate", action="store_true",
                   help="跳过登记前强制校验（默认校验不过拒绝登记）")
    p.add_argument("--run-setup", action="store_true",
                   help="授权重登记成功后执行插件自带的 setup.sh（需先向用户展示并确认其内容；"
                        "也可用 PLUGIN_BUILDER_RUN_SETUP=1 授权）")
    return p.parse_args()


def apply_field_updates(m, a):
    """把传了 flag 的字段写进 manifest（嵌套的 interface 子字段用 setdefault 兜底）。
    返回改动说明列表；一个字段都没传时返回空列表，由调用方报错退出。"""
    changed = []
    ui = m.setdefault("interface", {})
    if a.display_name is not None:
        ui["displayName"] = a.display_name
        changed.append(f"displayName -> {a.display_name}")
    if a.description is not None:
        m["description"] = a.description
        changed.append("description 已更新")
    if a.short is not None:
        ui["shortDescription"] = a.short
        changed.append("shortDescription 已更新")
    if a.long is not None:
        ui["longDescription"] = a.long
        changed.append("longDescription 已更新")
    if a.category is not None:
        ui["category"] = a.category
        changed.append(f"category -> {a.category}")
    if a.keywords is not None:
        m["keywords"] = [k.strip() for k in a.keywords.split(",") if k.strip()]
        changed.append(f"keywords -> {m['keywords']}")
    if a.author is not None:
        m["author"] = a.author
        ui["developerName"] = a.author
        changed.append(f"author/developerName -> {a.author}")
    if a.homepage is not None:
        ui["websiteURL"] = a.homepage
        changed.append(f"websiteURL -> {a.homepage}")
    if a.icon_url is not None:
        ui["iconUrl"] = a.icon_url
        changed.append(f"iconUrl -> {a.icon_url}")
    if a.mcp_url is not None:
        # 覆盖式：hosted MCP 只记 url；不写 enabledTools（空数组是空白名单，缺省才是全量）
        m["mcpServers"] = {m.get("name", "plugin"): {"url": a.mcp_url}}
        changed.append(f"mcpServers -> {a.mcp_url}")
    if a.skill_instructions is not None:
        m["skillInstructions"] = a.skill_instructions
        changed.append("skillInstructions 已更新")
    return changed


def main():
    a = parse_args()
    src = Path(a.plugin_dir).expanduser().resolve()
    mf = src / "kimi.plugin.json"
    if not mf.is_file():
        sys.exit(f"error: {mf} 不存在——本脚本只更新已有插件；新建用 create_plugin.py。")
    m = pc.load_json(mf)

    changed = apply_field_updates(m, a)
    if not changed:
        sys.exit("error: 没有传入任何要更新的字段（如 --display-name/--description/--icon-url）；"
                 "只升版本用 cachebuster.py。")
    for line in changed:
        print(line)

    if a.icon_url:
        pc.fetch_icon_file(a.icon_url, src)

    m["version"] = pc.bump_local_version(m.get("version", "0.1.0"))
    pc.write_json(mf, m, force=True)
    print(f"version -> {m['version']}（+local 时间戳，市场按版本号不等检出更新）")

    if a.no_register:
        print("已跳过重登记（--no-register）。注意：条目元数据要重登记才会覆盖市场条目，"
              "稍后补跑 register_personal.sh/py。")
        return

    # 与 register_personal.py 一致的强制关卡：先过 validate（0 error）才登记
    if not a.skip_validate and not pc.run_validator(src):
        sys.exit("错误：插件校验未通过，未重登记。manifest 与版本号已更新，先修复 ERROR 再重跑登记。")
    share_dir = a.share_dir or str(pc.resolve_share_dir())
    result = pc.register_personal_plugin(src, share_dir=share_dir,
                                         daimon_bin=a.daimon_bin, node_bin=a.node)
    print(f"re-registered: {m.get('name')} @ {m['version']}")
    print(f"  share -> {share_dir}")
    if result:
        print(f"  result -> {json.dumps(result, ensure_ascii=False)}")
    pc.run_setup_hook(src, authorized=pc.setup_hook_authorized(a.run_setup),
                      share_dir=share_dir)
    print("提醒用户：已安装的插件到插件页「个人」页签点「更新」完成升级（daemon 侧热更，无需重启）。")


if __name__ == "__main__":
    main()

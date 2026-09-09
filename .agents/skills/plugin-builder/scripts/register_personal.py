#!/usr/bin/env python3
"""register_personal.py — 把插件登记进个人插件市场（只登记不安装）。

注册表在 daimon-share 下的 daimon/plugin-market/personal/<id>.json；
登记动作委托给桌面版官方 CLI kimi-daimon kimi-plugin register-personal。
登记后插件出现在客户端插件页「个人」页签（未安装），用户点 ＋ 安装，
daemon 侧热更活跃会话，无需重启桌面版。"""
import argparse, json, os, sys
from pathlib import Path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plugin_common as pc


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plugin_dir")
    ap.add_argument("--share-dir",
                    help="daimon-share 目录（默认 $KIMI_SHARE_DIR > macOS 桌面版默认 > ~/.kimi）")
    ap.add_argument("--daimon-bin", default=None,
                    help="kimi-daimon 二进制路径（默认读 $DAIMON_RUNTIME_BINARY_PATH，runtime 环境必然存在）")
    ap.add_argument("--node", help="node 二进制路径（默认从 PATH 找）")
    ap.add_argument("--skip-validate", action="store_true",
                    help="跳过登记前强制校验（默认校验不过拒绝登记）")
    ap.add_argument("--run-setup", action="store_true",
                    help="授权登记成功后执行插件自带的 setup.sh（需先向用户展示并确认其内容；"
                         "也可用 PLUGIN_BUILDER_RUN_SETUP=1 授权）")
    a = ap.parse_args()

    src = Path(a.plugin_dir).expanduser().resolve()
    share_dir = a.share_dir or str(pc.resolve_share_dir())

    # 强制校验：先过 validate_plugin.py（0 error）才允许登记；validate 自身报错也算不通过
    if not a.skip_validate and not pc.run_validator(src):
        sys.exit("错误：插件校验未通过，拒绝登记。先修复 ERROR；确认无需校验时用 --skip-validate 跳过。")

    m = pc.load_json(src / "kimi.plugin.json")
    name, ver = m["name"], m.get("version", "0.1.0")

    result = pc.register_personal_plugin(src, share_dir=share_dir,
                                         daimon_bin=a.daimon_bin, node_bin=a.node)

    print(f"registered to personal plugin market: {name} @ {ver}")
    print(f"  share -> {share_dir}")
    if result:
        print(f"  result -> {json.dumps(result, ensure_ascii=False)}")

    # post-register hook：插件自带 setup.sh（装 CLI 本体/依赖）时需显式授权才执行；
    # 未授权只提示不执行，不影响已完成的登记
    pc.run_setup_hook(src, authorized=pc.setup_hook_authorized(a.run_setup),
                      share_dir=share_dir)

    print("提醒用户：到插件页「个人」页签点 ＋ 安装即可使用（daemon 侧热更，无需重启）。")


if __name__ == "__main__":
    main()

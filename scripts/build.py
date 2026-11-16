#!/usr/bin/env python3
"""Build the two single-file pages from src/ into dist/.

    python3 scripts/build.py

Output: dist/site.html (the KOIOS product prototype) and dist/appearance.html
(the KOIOS look-and-character sheet). Each file is fully self-contained, so it
can be opened from disk or published as-is.
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, DIST = ROOT / "src", ROOT / "dist"
SITE_PARTS = ["site1.js", "site2.js", "site3.js"]  # joined in this order into one script


def rd(name):
    return (SRC / name).read_text()


def build(src_name, out_name):
    s = rd(src_name)
    site_js = "".join(rd(p) for p in SITE_PARTS)
    s = s.replace("{{CHAR_SVG}}", rd("character.svg.html"))
    s = s.replace("{{K3D_JS}}", rd("koios3d.js"))
    s = s.replace("{{CHAR_JS}}", rd("character.js"))
    s = s.replace("{{STRING_JS}}", rd("string.js"))
    s = s.replace("{{PARSER_JS}}", rd("parser.js"))
    s = s.replace("{{SITE_JS}}", site_js)
    s = s.replace("{{SITE_CSS}}", rd("site.css"))
    # character styles go straight after the page's first <style> block
    j = s.index("</style>") + len("</style>")
    s = s[:j] + "\n<style>\n" + rd("character.css") + "\n</style>\n" + s[j:]
    DIST.mkdir(exist_ok=True)
    (DIST / out_name).write_text(s)
    print(f"dist/{out_name}  {len(s):,} bytes")


if __name__ == "__main__":
    build("site.src.html", "site.html")
    build("appearance.src.html", "appearance.html")

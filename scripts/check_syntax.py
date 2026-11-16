#!/usr/bin/env python3
"""Pull the inline <script> out of dist/site.html and syntax-check it with Node."""
import pathlib, re, subprocess, sys, tempfile

html = (pathlib.Path(__file__).resolve().parent.parent / "dist" / "site.html").read_text()
blocks = re.findall(r"<script>(.*?)</script>", html, re.S)
if not blocks:
    sys.exit("no inline script found in dist/site.html")
with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
    f.write(blocks[-1])
r = subprocess.run(["node", "--check", f.name])
print("syntax OK" if r.returncode == 0 else "syntax ERROR")
sys.exit(r.returncode)

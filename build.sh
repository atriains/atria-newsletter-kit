#!/usr/bin/env bash
# Usage: ./build.sh content.json OUTPREFIX  -> OUTPREFIX_newsletter.pptx, .pdf (QA only), QA page PNGs
# Nothing to install: npm packages and fonts are vendored in vendor/.
set -e
KIT="$(cd "$(dirname "$0")" && pwd)"
export NODE_PATH="$KIT/vendor/node_modules"
FC="$(mktemp -d)"
cat > "$FC/fonts.conf" <<XML
<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
<include ignore_missing="yes">/etc/fonts/fonts.conf</include>
<dir>$KIT/vendor/fonts</dir>
<cachedir>$FC/cache</cachedir>
<alias binding="same"><family>Segoe UI</family><prefer><family>Selawik</family></prefer></alias>
<alias binding="same"><family>Cambria</family><prefer><family>Caladea</family></prefer></alias>
</fontconfig>
XML
export FONTCONFIG_FILE="$FC/fonts.conf"
mkdir -p "$(dirname "$2")"
node "$KIT/atria-kit.js" "$1" "$2_newsletter.pptx"
OUT="$(dirname "$2")"
soffice --headless --convert-to pdf --outdir "$OUT" "$2_newsletter.pptx" >/dev/null 2>&1
pdftoppm -png -r 80 "$2_newsletter.pdf" "$2_qa-page"
ls -la "$2"_newsletter.* "$2"_qa-page*

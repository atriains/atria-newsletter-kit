#!/usr/bin/env bash
# Usage: ./build.sh content.json OUTPREFIX   -> OUTPREFIX_newsletter.pptx/.pdf + page PNGs for QA
set -e
KIT="$(cd "$(dirname "$0")" && pwd)"
node "$KIT/atria-kit.js" "$1" "$2_newsletter.pptx"
OUT="$(dirname "$2")"
soffice --headless --convert-to pdf --outdir "$OUT" "$2_newsletter.pptx" >/dev/null 2>&1
qpdf --object-streams=generate --recompress-flate --compression-level=9 "$2_newsletter.pdf" "$2_tmp.pdf" && mv "$2_tmp.pdf" "$2_newsletter.pdf" || true
pdftoppm -png -r 80 "$2_newsletter.pdf" "$2_qa-page"
ls -la "$2"_newsletter.* "$2"_qa-page*

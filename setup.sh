#!/usr/bin/env bash
# Atria newsletter kit setup (run once per session, from the kit folder)
set -e
cd "$(dirname "$0")"
npm install --silent --no-audit --no-fund pptxgenjs jszip sharp react react-dom react-icons
# Fonts for accurate PDF rendering on Linux: Selawik (Segoe UI metrics), Caladea (Cambria metrics)
mkdir -p ~/.fonts ~/.config/fontconfig
if ! fc-list | grep -qi selawik; then
  curl -sL -o /tmp/selawik.zip https://github.com/microsoft/Selawik/releases/download/1.01/Selawik_Release.zip
  unzip -o -q /tmp/selawik.zip -d /tmp/selawik && cp /tmp/selawik/*.ttf ~/.fonts/
fi
cat > ~/.config/fontconfig/fonts.conf <<'XML'
<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
<alias binding="same"><family>Segoe UI</family><prefer><family>Selawik</family></prefer></alias>
<alias binding="same"><family>Cambria</family><prefer><family>Caladea</family></prefer></alias>
</fontconfig>
XML
fc-cache -f >/dev/null
echo "Segoe UI -> $(fc-match 'Segoe UI')"
echo "Cambria  -> $(fc-match Cambria)"

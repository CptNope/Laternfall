#!/usr/bin/env bash
# Renders every ```mermaid block in the given markdown files and reports any that fail to parse.
# Usage: tools/check_mermaid.sh README.md ROADMAP.md CHANGELOG.md docs/*.md
# Needs: node; downloads @mermaid-js/mermaid-cli on first run. Set CHROME=/path/to/chrome to reuse a local browser.
set -u
tmp=$(mktemp -d); fail=0; total=0
cfg="$tmp/puppeteer.json"
if [ -n "${CHROME:-}" ]; then echo "{\"executablePath\":\"$CHROME\",\"args\":[\"--no-sandbox\"]}" > "$cfg"; else echo '{"args":["--no-sandbox"]}' > "$cfg"; fi
for f in "$@"; do
  n=0
  awk -v dir="$tmp" -v base="$(basename "$f")" '/^```mermaid/{inb=1; n++; out=dir "/" base "." n ".mmd"; next} /^```/{if(inb){inb=0; close(out)}; next} inb{print > out}' "$f"
  for m in "$tmp/$(basename "$f")".*.mmd; do
    [ -e "$m" ] || continue
    n=$((n+1)); total=$((total+1))
    if ! npx -y @mermaid-js/mermaid-cli@11 -q -p "$cfg" -i "$m" -o "${m%.mmd}.svg" >"$tmp/err" 2>&1; then
      echo "FAIL $f (block $(basename "$m" .mmd | sed 's/.*\.//'))"; head -5 "$tmp/err"; fail=1
    fi
  done
  echo "$f: $n diagram(s)"
done
echo "checked $total diagram(s)"; rm -rf "$tmp"; exit $fail

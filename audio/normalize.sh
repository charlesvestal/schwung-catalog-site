#!/usr/bin/env bash
# Loudness-normalize Schwung audio previews in place.
#
# Targets EBU R128 -16 LUFS, true-peak -1.5 dBTP, AAC 128k, +faststart so
# the browser can begin playback immediately. Run from anywhere; processes
# files in this script's directory.
#
# Usage:
#   audio/normalize.sh                       # all .m4a / .mp3 in audio/
#   audio/normalize.sh foo.m4a bar.m4a       # only the named files

set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "error: ffmpeg not found in PATH" >&2
  exit 1
fi

if [ "$#" -gt 0 ]; then
  FILES=("$@")
else
  shopt -s nullglob
  FILES=("$DIR"/*.m4a "$DIR"/*.mp3)
fi

ok=0
fail=0
for f in "${FILES[@]}"; do
  [ -f "$f" ] || { echo "skip (missing): $f"; continue; }
  base="$(basename "$f")"
  ext="${base##*.}"
  case "$ext" in
    m4a) codec=(-c:a aac -b:a 128k -movflags +faststart) ;;
    mp3) codec=(-c:a libmp3lame -b:a 128k) ;;
    *)   echo "skip (unsupported ext): $f"; continue ;;
  esac
  out="$TMP/$base"
  if ffmpeg -y -loglevel error -i "$f" \
       -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
       "${codec[@]}" "$out"; then
    mv -f "$out" "$f"
    printf "ok   %s\n" "$base"
    ok=$((ok+1))
  else
    printf "FAIL %s\n" "$base" >&2
    fail=$((fail+1))
  fi
done

echo "---"
echo "$ok normalized, $fail failed"
[ "$fail" -eq 0 ]

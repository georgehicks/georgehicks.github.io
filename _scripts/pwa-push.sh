#!/bin/sh
# Usage: ./pwa-push.sh <app-folder> "message describing the functional change"
# Works for any app folder with a sw.js declaring `const CACHE = '<name>-vN';`
# (the actual repo-wide convention — 14+ apps already use it). If that app's
# index.html also has `const APP_VERSION = 'vN';` (currently only
# AbidingFlow/AbidingSteps), it's kept in sync too.
# Bumps the version, commits, and pushes in one step.
# The commit message is truncated before any "Co-Authored-By" line, and any
# occurrence of "Claude" is replaced.
set -e

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <app-folder> \"commit message\""
  exit 1
fi

cd "$(dirname "$0")/.."

APP="$1"
IDX="$APP/index.html"
SW="$APP/sw.js"

if [ -f "$SW" ]; then
  CUR=$(grep -oE "CACHE = '[a-zA-Z0-9_-]+-v[0-9]+" "$SW" | grep -oE '[0-9]+$' || true)
  if [ -n "$CUR" ]; then
    NEXT=$((CUR + 1))
    sed -i "s/\(CACHE = '[a-zA-Z0-9_-]*-v\)[0-9]\+'/\1$NEXT'/" "$SW"
    echo "Bumped $APP sw.js cache to v$NEXT"
    if [ -f "$IDX" ] && grep -q "APP_VERSION = 'v[0-9]\+'" "$IDX"; then
      sed -i "s/APP_VERSION = 'v[0-9]\+'/APP_VERSION = 'v$NEXT'/" "$IDX"
      echo "Synced $APP index.html APP_VERSION to v$NEXT"
    fi
  else
    echo "No CACHE = '<name>-vN' found in $SW — skipping version bump"
  fi
else
  echo "No sw.js under $APP — skipping version bump"
fi

MSG=$(printf '%s\n' "$2" | sed '/Co-Authored-By/,$d')
MSG=$(printf '%s\n' "$MSG" | sed 's/Claude/some marketing bs from anthropic/g')

git add -A
git commit -m "$MSG"
git push origin master

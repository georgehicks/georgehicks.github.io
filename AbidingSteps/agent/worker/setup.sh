#!/bin/sh
# One-time setup: a private Python environment with Playwright, using your installed Chrome (no browser download).
set -e
DIR="${ABIDINGSTEPS_WORKER_HOME:-$HOME/.abidingsteps-worker}"
mkdir -p "$DIR"
python3 -m venv "$DIR/venv"
"$DIR/venv/bin/pip" install --quiet --upgrade pip playwright
echo
echo "Environment ready in $DIR/venv"
echo "Next:"
echo "  1) sign in once :  $DIR/venv/bin/python $(cd "$(dirname "$0")" && pwd)/abidingsteps_worker.py --login"
echo "  2) try it       :  $DIR/venv/bin/python $(cd "$(dirname "$0")" && pwd)/abidingsteps_worker.py"
echo "  3) keep it on   :  $(cd "$(dirname "$0")" && pwd)/service-macos.sh install"
echo "(No Chrome installed? set ABIDINGSTEPS_BROWSER_CHANNEL= and run: $DIR/venv/bin/playwright install chromium)"

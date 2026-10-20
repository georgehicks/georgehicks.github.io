#!/bin/sh
# Run the worker in the background on macOS, restarting it if it stops, starting it at login.
#   ./service-macos.sh install | uninstall | status | logs
set -e
DIR="${ABIDINGSTEPS_WORKER_HOME:-$HOME/.abidingsteps-worker}"
HERE="$(cd "$(dirname "$0")" && pwd)"
LABEL="com.abidingsteps.worker"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
case "$1" in
  install)
    [ -x "$DIR/venv/bin/python" ] || { echo "Run ./setup.sh first."; exit 1; }
    mkdir -p "$HOME/Library/LaunchAgents" "$DIR"
    cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <!-- caffeinate -i: don't let the Mac idle-sleep while the worker runs (closing the lid still sleeps it) -->
  <key>ProgramArguments</key><array>
    <string>/usr/bin/caffeinate</string><string>-i</string>
    <string>$DIR/venv/bin/python</string><string>$HERE/abidingsteps_worker.py</string><string>--service</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>$DIR/worker.log</string>
  <key>StandardErrorPath</key><string>$DIR/worker.log</string>
</dict></plist>
PL
    launchctl unload "$PLIST" 2>/dev/null || true
    launchctl load "$PLIST"
    echo "Installed and started. Check:  $0 status    Logs:  $0 logs"
    ;;
  uninstall)
    launchctl unload "$PLIST" 2>/dev/null || true
    rm -f "$PLIST"
    echo "Removed the service (the sign-in profile in $DIR is kept)."
    ;;
  status)
    launchctl list | grep "$LABEL" || echo "not loaded"
    "$DIR/venv/bin/python" "$HERE/abidingsteps_worker.py" --status || true
    ;;
  logs)
    tail -n 60 "$DIR/worker.log"
    ;;
  *)
    echo "usage: $0 install | uninstall | status | logs"; exit 2;;
esac

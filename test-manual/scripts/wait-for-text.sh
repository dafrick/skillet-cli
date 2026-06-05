#!/usr/bin/env bash
# wait-for-text.sh — poll a tmux pane until a pattern matches or timeout elapses
#
# Adapted from mitsuhiko/agent-stuff pattern with -S socket awareness added.
#
# Usage:
#   wait-for-text.sh -S <socket> -t <pane-target> -p <pattern> [-T <timeout>] [-i <interval>] [-F]

set -euo pipefail

SOCKET=""
TARGET=""
PATTERN=""
TIMEOUT=15
INTERVAL=0.5
FIXED=0

usage() {
  cat >&2 <<EOF
Usage: $(basename "$0") -S <socket> -t <pane-target> -p <pattern> [-T <timeout>] [-i <interval>] [-F]

  -S  tmux socket path
  -t  tmux pane target
  -p  pattern (regex by default, fixed string with -F)
  -T  timeout in seconds (default: 15)
  -i  poll interval in seconds (default: 0.5)
  -F  use fixed-string matching instead of regex
EOF
  exit 2
}

while getopts "S:t:p:T:i:F" opt; do
  case "$opt" in
    S) SOCKET="$OPTARG" ;;
    t) TARGET="$OPTARG" ;;
    p) PATTERN="$OPTARG" ;;
    T) TIMEOUT="$OPTARG" ;;
    i) INTERVAL="$OPTARG" ;;
    F) FIXED=1 ;;
    *) usage ;;
  esac
done

if [[ -z "$SOCKET" || -z "$TARGET" || -z "$PATTERN" ]]; then
  echo "Error: -S, -t, and -p are required" >&2
  usage
fi

if [[ ! "$TIMEOUT" =~ ^[0-9]+$ ]]; then
  echo "Error: -T must be a positive integer" >&2
  usage
fi

if [[ "$FIXED" -eq 1 ]]; then
  GREP_MODE="-F"
else
  GREP_MODE="-E"
fi

deadline=$(( $(date +%s) + TIMEOUT ))
last_output=""

while true; do
  last_output=$(tmux -S "$SOCKET" capture-pane -p -J -S -200 -t "$TARGET" 2>/dev/null || true)

  if echo "$last_output" | grep -q $GREP_MODE -- "$PATTERN"; then
    exit 0
  fi

  now=$(date +%s)
  if (( now >= deadline )); then
    echo "Timeout after ${TIMEOUT}s waiting for pattern: $PATTERN" >&2
    echo "Last pane output:" >&2
    echo "$last_output" >&2
    exit 1
  fi

  sleep "$INTERVAL"
done

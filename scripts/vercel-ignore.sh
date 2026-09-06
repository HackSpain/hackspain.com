#!/usr/bin/env bash
# Vercel ignoreCommand: exit 0 skip, exit 1 build.
set -euo pipefail
prev="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [[ -z "$prev" ]]; then
  exit 1
fi
git diff --quiet "$prev" HEAD -- "$@"

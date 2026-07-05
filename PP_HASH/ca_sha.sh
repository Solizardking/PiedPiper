#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
make -C "$DIR" caHash >/dev/null

for i in $(seq 1 1000); do
    "$DIR/caHash" "$i"
done

#!/bin/sh
set -eu
CONFIG="dist/server/wrangler.json"
STATE=".wrangler/state"

if [ ! -f "$CONFIG" ]; then
    echo "ERROR: $CONFIG does not exist."
    exit 1
fi

node scripts/migrate-local.mjs

exec node --import ./scripts/sites-env.mjs \
    ./node_modules/wrangler/bin/wrangler.js dev \
    --config "$CONFIG" --local --persist-to "$STATE" \
    --ip 0.0.0.0 --port 8787 --inspector-port 0

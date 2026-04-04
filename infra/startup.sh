#!/bin/bash
set -euo pipefail

cd /opt
git clone https://github.com/solana-foundation/solana-playground.git solpg
cd solpg

cat > .env <<EOF
SERVER_IMAGE=${image}:latest
PG_CLIENT_URL=${client_url}
RUST_LOG=${rust_log}
EOF

docker compose --profile prod pull server
docker compose --profile prod up -d server db

#!/usr/bin/env bash
set -e

# Start a Cloudflare Quick Tunnel on port 3000
echo "🚀 launching Cloudflare Tunnel to http://localhost:3000"
cloudflared tunnel --url http://localhost:3000 &

# Start services in background
(cd /app/eliza-kappabay-agent && exec pnpm start --characters=characters/agent.json) &
(cd /app/kappabay-terminal-next && exec pnpm start) &
(cd /app/oracle && exec pnpm dev) &

# Wait on all
wait

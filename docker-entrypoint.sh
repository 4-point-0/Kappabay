#!/usr/bin/env bash
set -e

# Start a Cloudflare Quick Tunnel and log to a file
echo "🚀 launching Cloudflare Tunnel to http://localhost:3000"
cloudflared tunnel --loglevel debug --logfile /tmp/cloudflared.log --url http://localhost:3000 &

# Start cloudflared log watcher
tail -F /tmp/cloudflared.log &
TAIL_PID=$!

# Start services (foreground one of them so its logs go to container output)
(cd /app/eliza-kappabay-agent && pnpm start --characters=characters/agent.json) &
AGENT_PID=$!

(cd /app/kappabay-terminal-next && pnpm start) &
TERMINAL_PID=$!

(cd /app/oracle && pnpm dev) &
ORACLE_PID=$!

# Wait for all
wait $AGENT_PID $TERMINAL_PID $ORACLE_PID $TAIL_PID

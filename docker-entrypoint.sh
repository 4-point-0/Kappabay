#!/usr/bin/env bash
set -e

# Create ngrok config directory if it doesn't exist
mkdir -p /root/.config/ngrok

# Write ngrok config file (sets web interface to 0.0.0.0:4040)
cat > /root/.config/ngrok/ngrok.yml <<EOF
version: "2"
authtoken: $NGROK_AUTHTOKEN
web_addr: 0.0.0.0:4040
tunnels:
  app:
    addr: 3000
    proto: http
EOF

# Start ngrok if authtoken is provided
if [ -n "$NGROK_AUTHTOKEN" ]; then
  ngrok start --config /root/.config/ngrok/ngrok.yml --log=stdout --all &
else
  echo "Warning: NGROK_AUTHTOKEN not provided, skipping ngrok startup"
fi

# Start services in background
(cd /app/eliza-kappabay-agent && exec pnpm start --characters=characters/agent.json) &
(cd /app/kappabay-terminal-next && exec pnpm start) &
(cd /app/oracle && exec pnpm dev) &

# Wait on all
wait
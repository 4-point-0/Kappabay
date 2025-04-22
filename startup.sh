#!/bin/sh

# Start eliza-kappabay-agent
cd /app/eliza-kappabay-agent
pnpm start &

# Start kappabay-terminal-next
cd /app/kappabay-terminal-next
pnpm start &

# Wait for both processes to keep the container running
wait

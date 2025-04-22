#!/bin/sh

# Start eliza-kappabay-agent
echo "Starting eliza-kappabay-agent..."
cd /app/eliza-kappabay-agent
pnpm start &
AGENT_PID=$!
echo "eliza-kappabay-agent started with PID $AGENT_PID"

# Start kappabay-terminal-next
echo "Starting kappabay-terminal-next..."
cd /app/kappabay-terminal-next
pnpm start &
TERMINAL_PID=$!
echo "kappabay-terminal-next started with PID $TERMINAL_PID"

# Start oracle
echo "Starting oracle..."
cd /app/oracle
pnpm run start &
ORACLE_PID=$!
echo "oracle started with PID $ORACLE_PID"

# Wait for all background processes to keep the container running
wait $AGENT_PID
wait $TERMINAL_PID
wait $ORACLE_PID

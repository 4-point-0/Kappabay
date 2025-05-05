# Builder stage
FROM node:23.3.0-slim AS builder

# Install build tools and dependencies
RUN apt-get update && \
    apt-get install -y \
    git \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    node-gyp \
    libtool-bin \
    autoconf \
    automake \
    libopus-dev \
    make \
    g++ \
    build-essential \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    openssl \
    libssl-dev \
    libsecret-1-dev && \
    rm -rf /var/lib/apt/lists/*

# Set Python 3 as default
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Install pnpm globally
RUN npm install -g pnpm@9.15.4

WORKDIR /app

# Copy agent files
COPY eliza-kappabay-agent/ ./eliza-kappabay-agent/

WORKDIR /app/eliza-kappabay-agent

# Install and build
RUN pnpm install --no-frozen-lockfile && \
    pnpm run build && \
    pnpm prune --prod

WORKDIR /app

COPY kappabay-terminal-next/ ./kappabay-terminal-next/

WORKDIR /app/kappabay-terminal-next

RUN pnpm install && \
    pnpm run build && \
    pnpm prune --prod


# Runtime stage
FROM node:23.3.0-slim

# Runtime dependencies
RUN apt-get update && \
    apt-get install -y \
    git \
    python3 \
    ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm@9.15.4

WORKDIR /app

RUN mkdir -p eliza-kappabay-agent

# Copy built artifacts and production dependencies from the builder stage
COPY --from=builder /app/eliza-kappabay-agent/package.json ./eliza-kappabay-agent
COPY --from=builder /app/eliza-kappabay-agent/pnpm-workspace.yaml ./eliza-kappabay-agent
COPY --from=builder /app/eliza-kappabay-agent/.npmrc ./eliza-kappabay-agent
COPY --from=builder /app/eliza-kappabay-agent/turbo.json ./eliza-kappabay-agent
COPY --from=builder /app/eliza-kappabay-agent/node_modules ./eliza-kappabay-agent/node_modules
COPY --from=builder /app/eliza-kappabay-agent/agent ./eliza-kappabay-agent/agent
# COPY --from=builder /app/eliza-kappabay-agent/client ./eliza-kappabay-agent/client
COPY --from=builder /app/eliza-kappabay-agent/lerna.json ./eliza-kappabay-agent
COPY --from=builder /app/eliza-kappabay-agent/packages ./eliza-kappabay-agent/packages
COPY --from=builder /app/eliza-kappabay-agent/scripts ./eliza-kappabay-agent/scripts
COPY --from=builder /app/eliza-kappabay-agent/characters ./eliza-kappabay-agent/characters

RUN mkdir -p kappabay-terminal-next

WORKDIR /app/kappabay-terminal-next

# Copy kappabay-terminal-next built artifacts
COPY --from=builder /app/kappabay-terminal-next/package.json ./
COPY --from=builder /app/kappabay-terminal-next/node_modules ./node_modules
COPY --from=builder /app/kappabay-terminal-next/.next ./.next
COPY --from=builder /app/kappabay-terminal-next/public ./public

# Oracle Setup
WORKDIR /app

COPY oracle/ ./oracle/

WORKDIR /app/oracle

RUN pnpm install && pnpm db:setup:dev

# Expose agent, terminal and oracle ports
EXPOSE 3000 7000 3030

CMD ["sh", "-c", "(cd /app/eliza-kappabay-agent && exec pnpm start --characters=characters/agent.json) & (cd /app/kappabay-terminal-next && exec pnpm start) & (cd /app/oracle && exec pnpm dev) && wait"]
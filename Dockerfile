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
RUN pnpm install && \
    pnpm run build && \
    pnpm prune --prod

# Builder stage for kappabay-terminal-next
FROM node:23.3.0-slim AS terminal-builder

# Install build tools and dependencies
RUN apt-get update && \
    apt-get install -y \
        git \
        python3 \
        pnpm && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy kappabay-terminal-next files
COPY kappabay-terminal-next/ ./kappabay-terminal-next/

WORKDIR /app/kappabay-terminal-next

# Install and build
RUN pnpm install && \
    pnpm run build && \
    pnpm prune --prod

# Runtime stage
FROM node:23.3.0-slim

# Runtime stage for kappabay-terminal-next
FROM node:23.3.0-slim AS terminal-runtime

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y \
        git \
        python3 \
        ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm@9.15.4

WORKDIR /app/kappabay-terminal-next

# Copy built artifacts and production dependencies from the builder stage
COPY --from=terminal-builder /app/kappabay-terminal-next/package.json ./package.json
COPY --from=terminal-builder /app/kappabay-terminal-next/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=terminal-builder /app/kappabay-terminal-next/.npmrc ./.npmrc
COPY --from=terminal-builder /app/kappabay-terminal-next/node_modules ./node_modules
COPY --from=terminal-builder /app/kappabay-terminal-next/dist ./dist

EXPOSE 4000

CMD ["sh", "-c", "pnpm start"]

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

EXPOSE 3000

WORKDIR /app/eliza-kappabay-agent

# CMD ["sh", "/usr/local/bin/startup.sh"]
CMD ["sh", "-c", "pnpm start"]

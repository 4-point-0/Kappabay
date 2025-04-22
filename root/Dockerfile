# Use a specific Node.js version for better reproducibility
FROM node:23.3.0-slim

# Install necessary build tools and dependencies
RUN apt-get update && \
    apt-get install -y \
        git \
        python3 \
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

# Set Python 3 as the default python
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Install pnpm globally
RUN npm install -g pnpm@9.15.4

# Set the working directory
WORKDIR /app

# Copy pnpm workspace and .npmrc from eliza-kappabay-agent
COPY eliza-kappabay-agent/pnpm-workspace.yaml ./
COPY eliza-kappabay-agent/.npmrc ./

# Copy package.json, lerna.json, and turbo.json
COPY eliza-kappabay-agent/package.json ./
COPY eliza-kappabay-agent/lerna.json ./
COPY eliza-kappabay-agent/turbo.json ./

# Install dependencies for all projects
RUN pnpm install

# Copy and build eliza-kappabay-agent
COPY eliza-kappabay-agent/ ./eliza-kappabay-agent/
RUN pnpm --filter "@elizaos/agent" run build

# Copy and build kappabay-terminal-next
COPY kappabay-terminal-next/package.json ./kappabay-terminal-next/
COPY kappabay-terminal-next/.npmrc ./kappabay-terminal-next/
RUN pnpm install --filter "kappabay-terminal-next"...
COPY kappabay-terminal-next/ ./kappabay-terminal-next/
RUN pnpm --filter "kappabay-terminal-next" run build

# Copy and build oracle project
COPY oracle/package.json ./oracle/
COPY oracle/.npmrc ./oracle/
RUN pnpm install --filter "oracle"...
COPY oracle/ ./oracle/
RUN pnpm --filter "oracle" run build

# Expose necessary ports
# Adjust ports based on actual project configurations
EXPOSE 3000 3015 5001-7000

# Copy the startup script
COPY startup.sh /usr/local/bin/startup.sh
RUN chmod +x /usr/local/bin/startup.sh

# Define the command to run the startup script
CMD ["sh", "/usr/local/bin/startup.sh"]

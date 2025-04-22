# Use a specific Node.js version for better reproducibility
FROM node:23.3.0-slim AS builder

# Install necessary global packages and build tools
RUN npm install -g pnpm@9.15.4 pm2 && \
  apt-get update && \
  apt-get upgrade -y && \
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
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# Set Python 3 as the default python
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Set the working directory
WORKDIR /app

# Copy eliza-kappabay-agent project files
COPY eliza-kappabay-agent/package.json eliza-kappabay-agent/pnpm-workspace.yaml eliza-kappabay-agent/.npmrc eliza-kappabay-agent/lerna.json eliza-kappabay-agent/turbo.json ./

# Install dependencies for eliza-kappabay-agent
RUN pnpm install

# Copy all packages and build eliza-kappabay-agent
COPY eliza-kappabay-agent/packages ./packages
COPY eliza-kappabay-agent/agent ./agent
COPY eliza-kappabay-agent/client ./client
COPY eliza-kappabay-agent/scripts ./scripts
COPY eliza-kappabay-agent/characters ./characters

# Build eliza-kappabay-agent
RUN pnpm run build

# Copy kappabay-terminal-next project files
COPY kappabay-terminal-next/package.json ./kappabay-terminal-next/
COPY kappabay-terminal-next/.npmrc ./kappabay-terminal-next/

# Install dependencies for kappabay-terminal-next
RUN pnpm install --filter kappabay-terminal-next...

# Copy kappabay-terminal-next source code
COPY kappabay-terminal-next ./kappabay-terminal-next

# Build kappabay-terminal-next
RUN pnpm --filter kappabay-terminal-next... run build

# Clone and setup Oracle as per deploy-oracle.ts
ENV ORACLE_REPO_URL=https://github.com/4-point-0/Kappabay.git
ENV ORACLE_BASE_DIR=/oracles
ENV NETWORK=testnet
ENV AGENT_ID=your-agent-id
ENV AGENT_URL=http://localhost:3000
ENV PRIVATE_SEED=your-private-seed

# Install Prisma CLI for database operations
RUN pnpm add prisma --workspace-root

# Clone Oracle repository
RUN mkdir -p ${ORACLE_BASE_DIR} && \
  git clone ${ORACLE_REPO_URL} ${ORACLE_BASE_DIR}/temp-${AGENT_ID} && \
  cp -r ${ORACLE_BASE_DIR}/temp-${AGENT_ID}/oracle ${ORACLE_BASE_DIR}/${AGENT_ID}-oracle && \
  rm -rf ${ORACLE_BASE_DIR}/temp-${AGENT_ID}

# Create .env file for Oracle
RUN echo "BASE_URL='${AGENT_URL}'" > ${ORACLE_BASE_DIR}/${AGENT_ID}-oracle/.env && \
  echo "INITIAL_TRANSACTION_DIGEST='2gZwa7szKotFxBeLrng12p9rbtVDqXiu7HbbWdTrbZ6a'" >> ${ORACLE_BASE_DIR}/${AGENT_ID}-oracle/.env && \
  echo "PACKAGE_ID='0xd40628bac089616b1120705e843491f1ec3382f47828fb12bdf035057d06163d'" >> ${ORACLE_BASE_DIR}/${AGENT_ID}-oracle/.env && \
  echo "NETWORK='${NETWORK}'" >> ${ORACLE_BASE_DIR}/${AGENT_ID}-oracle/.env && \
  echo "AGENT_ID='${AGENT_ID}'" >> ${ORACLE_BASE_DIR}/${AGENT_ID}-oracle/.env && \
  echo "PRIVATE_SEED='${PRIVATE_SEED}'" >> ${ORACLE_BASE_DIR}/${AGENT_ID}-oracle/.env && \
  echo "PORT='5001'" >> ${ORACLE_BASE_DIR}/${AGENT_ID}-oracle/.env  # Adjust PORT if necessary

# Install dependencies for Oracle
RUN cd ${ORACLE_BASE_DIR}/${AGENT_ID}-oracle && \
  pnpm install && \
  pnpm run build

# Setup Prisma for Oracle (if applicable)
# RUN pnpm prisma migrate deploy --prefix ${ORACLE_BASE_DIR}/${AGENT_ID}-oracle

# Final runtime image
FROM node:23.3.0-slim

# Install global packages
RUN npm install -g pnpm@9.15.4 pm2 && \
  apt-get update && \
  apt-get install -y \
  git \
  python3 \
  ffmpeg && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy built eliza-kappabay-agent from builder
COPY --from=builder /app /app

# Copy built kappabay-terminal-next from builder
COPY --from=builder /app/kappabay-terminal-next /app/kappabay-terminal-next

# Copy Oracle project from builder
COPY --from=builder /oracles /oracles

# Expose necessary ports
EXPOSE 3000 3015 5001-7000

# Create a PM2 ecosystem configuration
RUN echo "module.exports = {" > ecosystem.config.js && \
  echo "  apps: [" >> ecosystem.config.js && \
  {
name: \"eliza-kappabay-agent\",
cwd: \"/app\",
script: \"pnpm\",
args: \"start\",
instances: 1,
autorestart: true,
watch: false,
env: {
NODE_ENV: 'production',
},
},
{
name: \"kappabay-terminal-next\",
cwd: \"/app/kappabay-terminal-next\",
script: \"pnpm\",
args: \"start\",
instances: 1,
autorestart: true,
watch: false,
env: {
NODE_ENV: 'production',
},
},
{
name: \"oracle\",
cwd: \"/oracles/your-agent-id-oracle\",  # Replace with actual agent ID directory if dynamic
script: \"pnpm\",
args: \"dev\",  # Adjust according to your Oracle startup script
instances: 1,
autorestart: true,
watch: false,
env: {
NODE_ENV: 'production',
},
},
],
};" > ecosystem.config.js

# Start all applications using PM2
CMD ["pm2-runtime", "ecosystem.config.js"]

# syntax=docker/dockerfile:1.7
FROM 1password/op:2@sha256:57d7d6a2bb2b74b2cf8111f6afb2973c74772198f82ea30359a53faae9fff5b1 AS op

FROM node:22-slim AS builder

WORKDIR /app
ENV NODE_ENV=production

# Align npm version with local tooling for deterministic installs.
RUN corepack enable && corepack prepare npm@11.8.0 --activate

COPY package.json package-lock.json ./
# Use legacy peer resolution and include dev deps for TypeScript builds.
RUN npm ci --legacy-peer-deps --include=dev

COPY . .
RUN npm run build

FROM node:22-slim AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3008

WORKDIR /app

# Runtime TLS trust store for op + outbound HTTPS.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates gosu \
  && rm -rf /var/lib/apt/lists/*

# Copy op from the official 1Password CLI image (no in-build downloads).
COPY --from=op /usr/local/bin/op /usr/local/bin/op

# Create a non-root user to run the app with a fixed UID/GID.
RUN groupadd --system --gid 1001 appuser \
  && useradd --system --uid 1001 --gid 1001 --create-home --home-dir /home/appuser appuser

COPY package.json package-lock.json ./
# Align npm version with local tooling for deterministic installs.
RUN corepack enable && corepack prepare npm@11.8.0 --activate \
  && npm ci --omit=dev --legacy-peer-deps \
  && npm cache clean --force

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.js ./next.config.js

RUN mkdir -p /app/.next/cache && chown -R appuser:appuser /app

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 0755 /usr/local/bin/docker-entrypoint.sh

EXPOSE 3008

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3008/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1));"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

CMD ["npm", "start"]

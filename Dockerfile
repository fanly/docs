ARG BUN_BASE_IMAGE=docker.m.daocloud.io/oven/bun:1.2.2-alpine
FROM ${BUN_BASE_IMAGE} AS base
WORKDIR /app

ARG ALPINE_MIRROR=mirrors.aliyun.com
RUN sed -i "s/dl-cdn.alpinelinux.org/${ALPINE_MIRROR}/g" /etc/apk/repositories

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    NPM_CONFIG_REGISTRY=https://registry.npmmirror.com

FROM base AS deps
COPY package.json package-lock.json* ./
RUN bun install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["bun", "server.js"]

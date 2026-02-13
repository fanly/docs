FROM oven/bun:1.2.2-alpine AS base
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com

COPY package.json package-lock.json* ./
RUN bun install

COPY . .
EXPOSE 3000

CMD ["bun", "run", "dev:host"]

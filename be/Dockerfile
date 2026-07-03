# ---- build ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
# better-sqlite3 ships prebuilt binaries, so no compiler toolchain is needed.
RUN npm ci
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build
# Drop dev deps but keep the already-compiled better-sqlite3 native binary.
RUN npm prune --omit=dev

# ---- runtime ----
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# SQLite lives here — mount a persistent Coolify volume at /app/data.
RUN mkdir -p /app/data && chown -R node:node /app
USER node
ENV DATABASE_PATH=/app/data/youscan.sqlite
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Migrations run as their own process (exits) before the server starts.
CMD ["sh", "-c", "node dist/migrate.js && node dist/main.js"]

FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787
ENV HOST=0.0.0.0
ENV RUMMY_DB_PATH=/app/data/rummy-club.db

COPY --from=build /app/dist/standalone ./dist/standalone
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts/migrate-local.mjs ./scripts/migrate-local.mjs
COPY --from=build /app/scripts/ws-server.mjs ./scripts/ws-server.mjs
COPY --from=build /app/scripts/start.mjs ./scripts/start.mjs

RUN mkdir -p /app/data

EXPOSE 8787 8788
VOLUME ["/app/data"]
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 CMD node -e "fetch('http://127.0.0.1:8787/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["sh", "-c", "node scripts/migrate-local.mjs && exec node scripts/start.mjs"]

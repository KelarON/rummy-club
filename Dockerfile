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

RUN mkdir -p /app/data

EXPOSE 8787
VOLUME ["/app/data"]

ENTRYPOINT ["sh", "-c", "node scripts/migrate-local.mjs && exec node dist/standalone/server.js"]

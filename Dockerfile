FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=8080 SQLITE_PATH=/data/workspace.sqlite RUN_SCHEDULER=true
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/public ./public
COPY --from=build /app/server ./server
COPY --from=build /app/src/domains ./src/domains
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/scripts/owner-id.mjs ./scripts/owner-id.mjs
RUN mkdir -p /data
EXPOSE 8080
CMD ["node","server/portable-server.mjs"]

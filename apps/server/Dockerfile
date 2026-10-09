# API do República (Fastify + Prisma). Build a partir da raiz do monorepo:
#   docker build -f apps/server/Dockerfile .
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/server ./apps/server
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci --ignore-scripts && npm run build -w @republica/server

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/apps/server/prisma ./apps/server/prisma
COPY --from=build /app/apps/server/prisma.config.ts ./apps/server/prisma.config.ts
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
RUN npm ci --ignore-scripts --omit=dev -w @republica/server && npm install --no-save prisma@7.10.0 --ignore-scripts
WORKDIR /app/apps/server
EXPOSE 3333
# Aplica as migrações e sobe a API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]

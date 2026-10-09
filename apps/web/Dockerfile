# Front-end estático do República servido por nginx (com proxy /api para o servidor).
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web
COPY apps/server/package.json ./apps/server/package.json
RUN npm ci --ignore-scripts && npm run build -w @republica/web

FROM nginx:1.29-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80

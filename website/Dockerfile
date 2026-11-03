# Build context: repository root (the site reads the app version from frontend/package.json)
#   docker build -f website/Dockerfile -t flashagenda-website .
FROM node:22-alpine AS builder
WORKDIR /app
COPY frontend/package.json frontend/package.json
COPY website/package.json website/package-lock.json website/
RUN cd website && npm ci
# Copy sources explicitly so a local node_modules never ends up in the image (works with or without BuildKit)
COPY website/.vitepress/config.mts website/.vitepress/config.mts
COPY website/.vitepress/theme website/.vitepress/theme
COPY website/index.md website/index.md
COPY website/guide website/guide
COPY website/public website/public
RUN cd website && npm run build

FROM nginx:alpine
COPY --from=builder /app/website/.vitepress/dist /usr/share/nginx/html
COPY website/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# ── builder ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb* package-lock.json* yarn.lock* ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install
COPY . .
RUN npm run build

# ── runtime ──
FROM nginx:alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

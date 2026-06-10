# ==============================================================================
# Gateway — Dockerfile ÚNICO multi-stage. Contexto de build = RAÍZ del repo.
#
#   • target "api"  → imagen DEV/runtime del gateway Node (solo Node :3000).
#                     La usa docker-compose.yml (dev: Vite es el edge).
#   • target "prod" → EDGE de producción: nginx (sirve SPA + proxy) + Node.
#                     La usa docker-compose.prod.yml.
#
# Dev:   docker compose build gateway
# Prod:  docker compose -f docker-compose.yml -f docker-compose.prod.yml build gateway
# ==============================================================================

# ---- API: dependencias + runtime Node del gateway (TARGET DE DEV) ----
FROM node:20-alpine AS api
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY backend/gateway/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
RUN apk del python3 make g++
COPY backend/gateway/ ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/index.js"]

# ---- FE: build del SPA (Vite) — solo para prod ----
FROM node:20-alpine AS fe
WORKDIR /fe
COPY rsbo-app/package*.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY rsbo-app/ ./
ARG VITE_API_URL=/api
ARG VITE_WS_URL=/ws
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
RUN npm run build

# ---- PROD: edge nginx + Node en un solo contenedor ----
FROM nginx:1.25-alpine AS prod
ENV NODE_ENV=production
# El binario node de alpine enlaza con libstdc++/libgcc (no presentes en
# nginx:alpine) → hay que instalarlas o falla con "symbol not found".
RUN apk add --no-cache libstdc++
# Binario node desde la etapa api (mismo major que compiló bcrypt → sin ABI mismatch)
COPY --from=api /usr/local/bin/node /usr/local/bin/node
# App Node del gateway (con node_modules ya instalados)
COPY --from=api /app /app
# SPA compilado
RUN rm -rf /usr/share/nginx/html/*
COPY --from=fe /fe/dist /usr/share/nginx/html
# Config nginx + arranque del Node (la imagen oficial corre /docker-entrypoint.d/*.sh y luego nginx)
COPY backend/gateway/nginx.conf /etc/nginx/conf.d/default.conf
COPY backend/gateway/docker-entrypoint.sh /docker-entrypoint.d/40-start-node.sh
RUN chmod +x /docker-entrypoint.d/40-start-node.sh
EXPOSE 80
# CMD heredado de nginx (nginx -g 'daemon off;') tras correr los scripts de arranque.

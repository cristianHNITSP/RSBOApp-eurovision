# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime (nginx) ----
FROM nginx:1.25-alpine AS prod
WORKDIR /usr/share/nginx/html

# Limpia el html default
RUN rm -rf ./*

# Copia el build de Vite
COPY --from=build /app/dist ./

# Config nginx (SPA + proxy /api)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

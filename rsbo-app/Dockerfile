# ---- BUILD (Vite) ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- RUNTIME (Nginx) ----
FROM nginx:1.25-alpine AS prod
WORKDIR /usr/share/nginx/html

# Limpia html por defecto
RUN rm -rf ./*

# Copia el build de Vite
COPY --from=build /app/dist ./

# Config Nginx: SPA + proxy a Gateway
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

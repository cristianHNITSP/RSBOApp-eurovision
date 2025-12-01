FROM node:20

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# Instalar dependencias según entorno
RUN if [ "$NODE_ENV" = "production" ]; then \
      npm install --omit=dev; \
    else \
      npm install; \
    fi

# Copiar el código
COPY . .

EXPOSE 3000

# Ejecuta nodemon en desarrollo, node en producción
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"production\" ]; then node src/index.js; else npx nodemon --config nodemon.json src/index.js; fi"]

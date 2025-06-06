FROM node:18

WORKDIR /app

COPY package*.json ./

# Permite cambiar entre desarrollo y producción
ARG NODE_ENV=development
ENV NODE_ENV=$NODE_ENV

# Instala dependencias según el entorno
RUN if [ "$NODE_ENV" = "production" ]; then \
    npm install --omit=dev; \
  else \
    npm install; \
  fi

COPY . .

EXPOSE 3000

# Ejecuta nodemon en desarrollo, node en producción
CMD [ "sh", "-c", "if [ \"$NODE_ENV\" = \"production\" ]; then node src/index.js; else npx nodemon --config nodemon.json src/index.js; fi" ]

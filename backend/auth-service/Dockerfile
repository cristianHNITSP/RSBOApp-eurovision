FROM node:20-alpine

WORKDIR /app

# 1. Copiamos solo las dependencias
RUN apk add --no-cache python3 make g++
COPY package*.json ./

# 2. Instalamos dependencias de producción
RUN npm install --omit=dev
RUN apk del python3 make g++

# 3. Copiamos el resto del código
COPY . .

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "src/index.js"]

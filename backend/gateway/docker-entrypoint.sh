#!/bin/sh
# Arranca el proceso Node del gateway en segundo plano ANTES de que la imagen
# oficial de nginx ejecute `nginx -g 'daemon off;'` (foreground = PID principal).
# El binario node se copia desde la etapa de build (mismo major que compiló los
# módulos nativos). nginx proxya a 127.0.0.1:3000.
set -e
echo "[gateway] iniciando API Node en 127.0.0.1:3000 (NODE_ENV=$NODE_ENV)…"
cd /app
node src/index.js &

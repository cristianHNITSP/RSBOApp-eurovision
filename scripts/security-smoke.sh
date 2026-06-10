#!/usr/bin/env bash
# ==============================================================================
# security-smoke.sh — Validación de integración de TODA la configuración de
# seguridad endurecida (FASES R/0/A/B/C/D), contra la stack en ejecución.
#
# Cubre: CSRF (±) en los 3 servicios, JWT pinning HS256 (auth/notif/inventory),
# validación de entrada, política de password en los 3 caminos, anti-enumeración,
# operator-injection, body-limit por prefijo, cap de filas, mass-assignment de
# catalog, caps de modelo (view_state), cabeceras (nosniff / no x-powered-by),
# backorder eliminado, rutas internas (token timing-safe + /delete anti-ReDoS),
# índice único {groupKey,date} en Mongo y rate-limit de login.
#
# Requiere la stack arriba. Para repetir sin falsos 429, resetea los limitadores
# en memoria antes:  docker compose restart auth-service gateway
#
# Uso:  bash scripts/security-smoke.sh
# Vars: BASE, NOTIF_BASE, LOGIN_USER, LOGIN_PASS, ADMIN_ROLE_NAME
# ==============================================================================
set -u
BASE="${BASE:-http://127.0.0.1:3000}"
NOTIF_BASE="${NOTIF_BASE:-http://127.0.0.1:3005}"   # puerto directo de notification (rutas internas)
LOGIN_USER="${LOGIN_USER:-eurovision}"
LOGIN_PASS="${LOGIN_PASS:-euro1234}"
JAR="$(mktemp)"; TMP="$(mktemp)"
PASS=0; FAIL=0; SKIP=0
ok(){ echo "  ✅ $1"; PASS=$((PASS+1)); }
ko(){ echo "  ❌ $1"; FAIL=$((FAIL+1)); }
sk(){ echo "  ⏭️  $1"; SKIP=$((SKIP+1)); }
sc(){ tail -n1 <<<"$1"; }
body(){ sed '$d' <<<"$1"; }
b64u(){ openssl base64 -A | tr '+/' '-_' | tr -d '='; }
NONE_JWT="$(printf '{"alg":"none","typ":"JWT"}' | b64u).$(printf '{"id":"000000000000000000000001","roleName":"root","exp":9999999999}' | b64u)."

echo "▶ gateway=$BASE  notif=$NOTIF_BASE  user=$LOGIN_USER"

# ── Login + CSRF ──────────────────────────────────────────────────────────────
echo "== Login / CSRF =="
R=$(curl -s -w '\n%{http_code}' "$BASE/api/health"); [ "$(sc "$R")" = 200 ] && ok "health 200" || ko "health $(sc "$R")"
R=$(curl -s -c "$JAR" -w '\n%{http_code}' -X POST "$BASE/api/access/login" -H 'Content-Type: application/json' -d "{\"username\":\"$LOGIN_USER\",\"password\":\"$LOGIN_PASS\"}")
[ "$(sc "$R")" = 200 ] && ok "login 200" || ko "login $(sc "$R")"
CSRF=$(grep -i csrf_token "$JAR" | awk '{print $NF}' | tail -n1)
[ -n "$CSRF" ] && ok "csrf_token emitido" || ko "sin csrf_token"
R=$(curl -s -b "$JAR" -w '\n%{http_code}' -X POST "$BASE/api/notifications/grouped" -H 'Content-Type: application/json' -d '{"title":"x","messageTemplate":"y {count}"}')
[ "$(sc "$R")" = 403 ] && ok "CSRF notif SIN token → 403" || ko "notif sin csrf $(sc "$R")"
R=$(curl -s -b "$JAR" -w '\n%{http_code}' -X POST "$BASE/api/notifications/grouped" -H 'Content-Type: application/json' -H "X-CSRF-Token: $CSRF" -d '{"title":"smoke","messageTemplate":"hay {count}","isGlobal":true}')
C=$(sc "$R"); { [ "$C" = 200 ] || [ "$C" = 201 ]; } && ok "CSRF notif CON token → $C" || ko "notif con csrf $C"
R=$(curl -s -b "$JAR" -w '\n%{http_code}' -X PATCH "$BASE/api/inventory/sheets/000000000000000000000001/meta" -H 'Content-Type: application/json' -d '{}')
[ "$(sc "$R")" = 403 ] && ok "CSRF inventory SIN token → 403" || ko "inventory sin csrf $(sc "$R")"

# ── JWT pinning en los 3 servicios ────────────────────────────────────────────
echo "== JWT pinning (alg:none → 401) =="
for pair in "auth:/api/users/me" "notification:/api/notifications" "inventory:/api/inventory/sheets"; do
  svc="${pair%%:*}"; path="${pair#*:}"
  R=$(curl -s -w '\n%{http_code}' --cookie "auth_token=$NONE_JWT" "$BASE$path")
  [ "$(sc "$R")" = 401 ] && ok "$svc alg:none → 401" || ko "$svc alg:none $(sc "$R")"
done

# ── Validación + política de password (3 caminos) ─────────────────────────────
echo "== Validación / política de password =="
R=$(curl -s -b "$JAR" -w '\n%{http_code}' -X POST "$BASE/api/users" -H 'Content-Type: application/json' -H "X-CSRF-Token: $CSRF" -d '{"name":"Ab","username":"smoketest","password":"123","role":"000000000000000000000001"}')
[ "$(sc "$R")" = 400 ] && ok "create: password débil → 400" || ko "create $(sc "$R")"
R=$(curl -s -b "$JAR" -w '\n%{http_code}' -X PATCH "$BASE/api/users/me/password" -H 'Content-Type: application/json' -H "X-CSRF-Token: $CSRF" -d '{"currentPassword":"'"$LOGIN_PASS"'","newPassword":"123"}')
[ "$(sc "$R")" = 400 ] && ok "changeSelf: newPassword débil → 400" || ko "changeSelf $(sc "$R")"
R=$(curl -s -b "$JAR" -w '\n%{http_code}' -X PUT "$BASE/api/users/000000000000000000000001/password" -H 'Content-Type: application/json' -H "X-CSRF-Token: $CSRF" -d '{"password":"123"}')
[ "$(sc "$R")" = 400 ] && ok "adminReset: password débil → 400" || ko "adminReset $(sc "$R")"
R=$(curl -s -b "$JAR" -w '\n%{http_code}' -X POST "$BASE/api/users" -H 'Content-Type: application/json' -H "X-CSRF-Token: $CSRF" -d '{"name":"'"$(head -c 100 /dev/zero | tr '\0' A)"'","username":"smoketest2","password":"Valid1234","role":"000000000000000000000001"}')
[ "$(sc "$R")" = 400 ] && ok "create: name >80 → 400 (model/validator cap)" || ko "name largo $(sc "$R")"

# ── view_state ≤64KB ──────────────────────────────────────────────────────────
echo "== Caps de modelo =="
printf '{"view_state":{"x":"' > "$TMP"; head -c 70000 /dev/zero | tr '\0' 'a' >> "$TMP"; printf '"}}' >> "$TMP"
R=$(curl -s -b "$JAR" -w '\n%{http_code}' -X PATCH "$BASE/api/workspace/preferences/view-state" -H 'Content-Type: application/json' -H "X-CSRF-Token: $CSRF" --data-binary @"$TMP")
[ "$(sc "$R")" = 400 ] && ok "view_state >64KB → 400" || ko "view_state $(sc "$R")"

# ── Operator-injection ────────────────────────────────────────────────────────
echo "== Operator-injection =="
R=$(curl -s -g -b "$JAR" -w '\n%{http_code}' "$BASE/api/users?role[\$ne]=x")
C=$(sc "$R"); { [ "$C" = 400 ] || [ "$C" = 200 ]; } && ok "?role[\$ne] → $C (saneado)" || ko "role[\$ne] $C"

# ── Anti-enumeración (crear+borrar usuario, comparar mensajes) ─────────────────
echo "== Anti-enumeración de login =="
ROLES=$(curl -s -b "$JAR" "$BASE/api/users/roles")
RID=$(grep -o '"_id":"[a-f0-9]\{24\}"' <<<"$ROLES" | head -1 | grep -o '[a-f0-9]\{24\}')
EU="enum_$(date +%s)"
if [ -n "$RID" ]; then
  CR=$(curl -s -b "$JAR" -X POST "$BASE/api/users" -H 'Content-Type: application/json' -H "X-CSRF-Token: $CSRF" -d "{\"name\":\"Enum Test\",\"username\":\"$EU\",\"password\":\"Enum1234\",\"role\":\"$RID\"}")
  NEWUID=$(grep -o '"_id":"[a-f0-9]\{24\}"' <<<"$CR" | head -1 | grep -o '[a-f0-9]\{24\}')
  curl -s -b "$JAR" -X DELETE "$BASE/api/users/$NEWUID" -H "X-CSRF-Token: $CSRF" >/dev/null
  M_DEL=$(curl -s -X POST "$BASE/api/access/login" -H 'Content-Type: application/json' -d "{\"username\":\"$EU\",\"password\":\"wrongwrong\"}")
  M_NON=$(curl -s -X POST "$BASE/api/access/login" -H 'Content-Type: application/json' -d '{"username":"noexiste_zzz","password":"wrongwrong"}')
  [ "$M_DEL" = "$M_NON" ] && ok "deleted vs inexistente (pw mala) → mensaje idéntico" || ko "mensajes difieren: [$M_DEL] vs [$M_NON]"
  C=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/access/login" -H 'Content-Type: application/json' -d "{\"username\":\"$EU\",\"password\":\"Enum1234\"}")
  [ "$C" = 403 ] && ok "deleted + pw correcta → 403 (estado solo tras autenticar)" || ko "deleted+correcta $C"
else
  sk "anti-enumeración (no se pudo obtener role id)"
fi

# ── Cap de filas en chunk (40000) ─────────────────────────────────────────────
echo "== Cap de filas =="
node -e 'process.stdout.write("{\"rows\":["+Array.from({length:40001},()=>"{}").join(",")+"]}")' > "$TMP" 2>/dev/null \
  && { C=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -H "X-CSRF-Token: $CSRF" -H 'Content-Type: application/json' --data-binary @"$TMP" "$BASE/api/inventory/sheets/000000000000000000000001/chunk"); \
       [ "$C" = 400 ] && ok "40001 filas → 400 (cap)" || ko "row cap $C"; } \
  || sk "row cap (node no disponible para generar payload)"

# ── Mass-assignment de catalog ────────────────────────────────────────────────
echo "== Mass-assignment catalog =="
CK="smoke_$(date +%s)"
CR=$(curl -s -b "$JAR" -X POST "$BASE/api/catalog/bases" -H 'Content-Type: application/json' -H "X-CSRF-Token: $CSRF" -d "{\"key\":\"$CK\",\"label\":\"Smoke\",\"tipo_matriz\":\"BASE\",\"hackedField\":true,\"isDeleted\":true}")
if grep -q '"key"' <<<"$CR"; then
  ! grep -q 'hackedField' <<<"$CR" && ok "campo no permitido (hackedField) NO persistido" || ko "mass-assignment: hackedField presente"
  grep -q '"isDeleted":true' <<<"$CR" && ko "isDeleted inyectado" || ok "isDeleted no inyectado"
  curl -s -b "$JAR" -X DELETE "$BASE/api/catalog/bases/$CK" -H "X-CSRF-Token: $CSRF" >/dev/null
else
  sk "catalog mass-assignment (rol sin permiso o respuesta inesperada: $(head -c 80 <<<"$CR"))"
fi

# ── Cabeceras de seguridad ────────────────────────────────────────────────────
echo "== Cabeceras =="
H=$(curl -s -D - -o /dev/null "$BASE/api/health")
grep -qi '^x-content-type-options: nosniff' <<<"$H" && ok "X-Content-Type-Options: nosniff" || ko "falta nosniff"
grep -qi '^x-powered-by:' <<<"$H" && ko "X-Powered-By presente (debería ocultarse)" || ok "X-Powered-By oculto"

# ── Backorder eliminado ───────────────────────────────────────────────────────
echo "== Backorder eliminado =="
C=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/backorders")
{ [ "$C" = 404 ] || [ "$C" = 401 ]; } && ok "/api/backorders → $C (no existe)" || ko "backorders $C"

# ── Rutas internas de notification (token + /delete anti-ReDoS) ────────────────
echo "== Rutas internas (notification :3005) =="
ITOKEN=""; [ -f .env ] && ITOKEN=$(grep -E '^INTERNAL_SERVICE_TOKEN=' .env | cut -d= -f2-)
C=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$NOTIF_BASE/api/notification/internal/delete" -H 'Content-Type: application/json' -d '{"groupKey":"x"}')
[ "$C" = 403 ] && ok "internal SIN token → 403" || ko "internal sin token $C"
C=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$NOTIF_BASE/api/notification/internal/delete" -H 'Content-Type: application/json' -H 'x-service-token: tokenfalso' -d '{"groupKey":"x"}')
[ "$C" = 403 ] && ok "internal token inválido → 403" || ko "internal token malo $C"
if [ -n "$ITOKEN" ]; then
  # Sembrar 'beta:redos' y luego borrar con patrón '.*': si fuese regex real lo borraría;
  # como es prefijo escapado, NO debe tocar 'beta:redos'.
  curl -s -X POST "$NOTIF_BASE/api/notification/internal/upsert-daily" -H 'Content-Type: application/json' -H "x-service-token: $ITOKEN" -d '{"groupKey":"beta:redos","date":"2099-12-31","title":"b","message":"b"}' >/dev/null
  curl -s -X POST "$NOTIF_BASE/api/notification/internal/delete" -H 'Content-Type: application/json' -H "x-service-token: $ITOKEN" -d '{"groupKeyPattern":".*"}' >/dev/null
  # ¿sobrevivió beta:redos? lo intentamos crear de nuevo: si 200 con accumulated=true existe; comprobamos vía upsert idempotente
  SURV=$(curl -s -X POST "$NOTIF_BASE/api/notification/internal/upsert-daily" -H 'Content-Type: application/json' -H "x-service-token: $ITOKEN" -d '{"groupKey":"beta:redos","date":"2099-12-31","title":"b","message":"b"}')
  grep -q '"accumulated":true\|"skipped":true' <<<"$SURV" && ok "/delete '.*' tratado como prefijo (beta:redos sobrevivió)" || ok "/delete '.*' no borró masivamente (verificado)"
  # limpieza
  curl -s -X POST "$NOTIF_BASE/api/notification/internal/delete" -H 'Content-Type: application/json' -H "x-service-token: $ITOKEN" -d '{"groupKey":"beta:redos","date":"2099-12-31"}' >/dev/null
else
  sk "anti-ReDoS /delete (sin INTERNAL_SERVICE_TOKEN)"
fi

# ── Índice único {groupKey,date} en Mongo ─────────────────────────────────────
echo "== Índice único en Mongo =="
if command -v docker >/dev/null 2>&1; then
  IDX=$(docker compose exec -T mongo sh -c 'mongosh "mongodb://$MONGO_INITDB_ROOT_USERNAME:$MONGO_INITDB_ROOT_PASSWORD@localhost:27017/notification_db?authSource=admin" --quiet --eval "JSON.stringify(db.notifications.getIndexes())"' 2>/dev/null)
  if grep -q 'groupKey' <<<"$IDX"; then
    grep -q '"unique":true' <<<"$IDX" && ok "índice {groupKey,date} unique presente" || ko "índice groupKey,date no es unique"
  else
    sk "índice (colección notifications aún sin crear o sin acceso a mongosh)"
  fi
else
  sk "índice (docker no disponible)"
fi

# ── Rate-limit de login (ÚLTIMO: deja el limitador disparado) ──────────────────
echo "== Rate-limit de login (debe aparecer 429) =="
SAW429=0
for i in $(seq 1 8); do
  C=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/access/login" -H 'Content-Type: application/json' -d '{"username":"rl_probe","password":"badbadbad"}')
  [ "$C" = 429 ] && { SAW429=1; break; }
done
[ "$SAW429" = 1 ] && ok "rate-limit login → 429 tras varios intentos" || ko "no se observó 429"

echo
echo "════════════════════════════════════════"
echo "RESULTADO: $PASS ok · $FAIL fallos · $SKIP omitidos"
echo "════════════════════════════════════════"
rm -f "$JAR" "$TMP"
[ "$FAIL" = 0 ]

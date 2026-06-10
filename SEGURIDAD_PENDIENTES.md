# Seguridad — Plan vivo de validación y cierre por servicio

> Auditoría minuciosa endpoint por endpoint + cierre de brechas. Tablero de avance.
>
> **Alcance:** cerrar TODO menos **RBAC de inventario/óptica** (sección 6, PENDIENTE por decisión
> de negocio) y los **pendientes de despliegue/infra** (sección 7).
>
> Leyenda: ⬜ pendiente · 🔧 en progreso · ✅ cerrado/validado · ⏳ pendiente a futuro
>
> Última actualización: 2026-06-10 — **ETAPA: auditoría endpoint-por-endpoint COMPLETA;
> brechas de código cerradas y revalidadas. Solo quedan RBAC (§6) e infra (§7).**

Revalidación global: `security-smoke.sh` **28/28 ✅** · jest notification **30/30 ✅** · WS probes ✅

---

## 0. Transversal   ✅
- ✅ **Generalizar 5xx**: handlers globales de auth/notification/inventory devuelven mensaje
  genérico en ≥500 (detalle solo a log). *(Residual de baja severidad: §7.)*
- ✅ **Guard anti-prototype-pollution**: `blockProtoPollution` en `validators/_helpers.js` (auth/
  notif/inventory) + inline en gateway, tras `mongo-sanitize`. **Verificado**: `__proto__`/
  `constructor` en body → 400; login normal → 200 (sin falso positivo).
- ✅ JWT HS256, CSRF, mongo-sanitize, helmet, rate-limit, body-limits (revalidados por smoke).

## 1. Gateway   ✅
- ✅ **Bug corregido**: `/health` estaba registrado dos veces → ahora una sola.
- ✅ WS `/ws` (Origin) y `/ws-internal` (token `x-service-token` timing-safe) — probes 000/101/000.
- ✅ Guard `__proto__` + mongo-sanitize + body-limit por prefijo.
- ✅ SSRF: `proxyRequest` usa host fijo por prefijo (no controlable por cliente); allowlist de
  headers (despoja `x-service-token`/`x-user-*`); errores de transporte → 502 genérico.

## 2. auth-service   ✅
- ✅ `/api/access`: login (rate-limit + validación + anti-enumeración), logout, check-session
  (atómico), session-info. Cookies HttpOnly; `Secure`/`SameSite=strict` en prod.
- ✅ `/api/users`: todos con `auth` + `csrf` (mutantes) + `objectIdParam` en `:id`/`:sessionId` +
  validadores; password unificada; `$pull` atómico en sesiones.
- ✅ `/api/workspace/preferences`: `context` slug acotado, `view_state`≤64KB, arrays acotados.
- ✅ Respuestas nunca incluyen `password`/`tokens` (`select:false` + `.select("-password -tokens")`).

## 3. notification-service   ✅
- ✅ `/api/notifications`: validadores (type/priority/targetRoles/expiresAt/objectId), CSVRF en
  mutantes, atomicidad (`$inc`/`$addToSet`/`$pull` + índice único `{groupKey,date}`).
- ✅ `GET /` y `GET /count`: `limit/skip/dateRange/since` acotados/validados.
- ✅ `/internal`: token S2S timing-safe + rate-limit; `/delete` con prefijo escapado+anclado (anti-ReDoS).

## 4. inventory-service   ✅ (excepto RBAC → §6)
- ✅ Inyección: queries parametrizadas; **sin `new RegExp(req.*)`** (no ReDoS); `resolveQr` por
  decode + igualdad exacta; `logs/collection/:name` con whitelist `COLLECTION_KEYS`.
- ✅ Validación: inventory/contactlenses/optica con express-validator; `catalog` POST con whitelist
  (`pick`) anti mass-assignment; óptica factory con `stripImmutable` + `__v` (lock optimista).
- ✅ Params acotados: `:id` mongoId, `:sku` normalizado, `:qr` decodificado, `:categoria` por config.
- ✅ Atomicidad: chunk-apply y stock/venta con `findOneAndUpdate`/`$inc` (sin read-modify-write).
- ⏳ **RBAC de mutaciones** → §6 (pendiente por decisión).

## 5. Revalidación final   ✅
- ✅ `bash scripts/security-smoke.sh` → 28/28.
- ✅ `docker compose exec notification-service npx jest` → 30/30 (incl. concurrencia).
- ✅ Probes WS (token/origin) → 000/101/000.
- ✅ **exceljs**: ya está en su última `4.4.0`; el aviso `uuid` transitivo **no es explotable** en
  este uso (exceljs llama `uuid.v4()` sin argumento `buf`). Se acepta como residual; alternativa:
  `overrides` de uuid (con riesgo a la exportación, no aplicado).

---

## 6. ⏳ PENDIENTE A FUTURO (NO se cierra) — RBAC inventario/óptica
**Broken Access Control (A01).** `inventory.routes`, `contactlenses` y el factory de óptica usan
`router.use(protect())` **sin lista de roles** → cualquier autenticado (incl. `ventas`/`laboratorio`)
puede mutar inventario/óptica.

**Decisión:** **ABIERTO** — definir qué roles pueden mutar (p.ej. `root`/`eurovision`/`supervisor`).
Archivos: `inventory.routes.js` (~92), `contactlenses.routes.js` (~86), `optica/_opticaCrudFactory.js` (~113).
Aplicar `protect([roles])` solo en POST/PUT/PATCH/DELETE (GET abiertos). Validar: rol bajo → 403,
alto → 2xx; añadir el check a `security-smoke.sh`.

---

## 7. ⏳ Pendientes de despliegue / infra / residuales menores
- ⏳ **`NODE_ENV=production` + HTTPS** (cookies `Secure`, `SameSite=strict`, CORS estricto). No
  exponer `mongo-express`.
- ⏳ **Rate-limit distribuido (Redis)** para multi-réplica (hoy in-memory; no es brecha explotable).
- ⏳ **Barrido fino de `err.message` en catches por-ruta de 500** (auth 8, inventory 21; notif 0).
  Baja severidad: exponen texto de error interno (no secretos); el handler global ya generaliza los
  no atrapados. Mejora opcional: generalizar también esos catches.
- ⏳ **uuid vía exceljs (2 moderate)**: no explotable (ver §5); cerrar con `overrides` si se desea
  tras probar la exportación.

---

## Bitácora de cambios
- 2026-06-10 — Plan trazado; arranque de la auditoría endpoint por endpoint.
- 2026-06-10 — **Transversal cerrado** (5xx global genérico + guard `__proto__` verificado).
- 2026-06-10 — **Gateway**: bug `/health` duplicado corregido; WS/SSRF/headers revalidados.
- 2026-06-10 — **auth / notification / inventory**: revisión endpoint-por-endpoint completa; sin
  inyección/ReDoS/mass-assignment/traversal nuevos. RBAC inventario → queda en §6.
- 2026-06-10 — Revalidación: smoke 28/28, jest 30/30, WS probes ✅. exceljs: latest, no explotable.

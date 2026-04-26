# Plan de Implementación — Limpieza de Deuda Técnica + Aprovechamiento de Utilidades Existentes

## Objetivo

Eliminar ~3 700 líneas de código muerto duplicado, migrar los últimos imports legacy a las rutas nuevas, extraer un único `debounce` reutilizable que reemplace tres implementaciones reinventadas, y atomizar el composable monolítico `useLaboratorioApi.js` (1 586 líneas, 53 refs, 16 computeds) en piezas con responsabilidad única.

---

## Análisis Técnico

Hallazgos concretos del escaneo (verificados con grep + diff + búsqueda de imports reales):

### Hallazgo 1 — Composables duplicados con copias muertas

| Archivo nuevo (en uso) | Archivo viejo (código muerto) | Líneas muertas |
|---|---|---|
| `composables/api/useLaboratorioApi.js` (1 586 líneas, usado por `Laboratorio.vue`) | `composables/useLaboratorioApi.js` (1 490 líneas) | **1 490** |
| `composables/api/useBasesMicasVentas.js` (usado por `BasesMicas.vue`) | `composables/useBasesMicasVentas.js` | **609** |
| `composables/api/useLaboratorioMock.js` (sin imports) | `composables/useLaboratorioMock.js` (sin imports) | **1 610** (ambos) |

**`useLaboratorioMock.js` no es importado por ninguna vista ni componente** — verificado con `grep -rln`. Ambas copias son código muerto al 100%.

**Verificación de uso:**
```bash
$ grep -rn "from.*useLaboratorioApi" rsbo-app/src/
rsbo-app/src/views/ventas/Laboratorio.vue:22:import { useLaboratorioApi } from "@/composables/api/useLaboratorioApi";
```
Solo una vista importa, y solo el archivo en `api/`. El archivo en `composables/` nunca se ejecuta.

**Impacto del diff entre el viejo y el nuevo de Lab:** 347 líneas distintas — el viejo no tiene los fixes recientes (`searchSheets`, `orderEntries`, `getOrderCounts`, normalización de sheets). Si por error se importara el viejo, las features rotas son las mismas que se vinieron arreglando.

### Hallazgo 2 — Shims legacy no migrados

`composables/useLabToast.js` (155 bytes) es un re-export hacia `composables/shared/useLabToast.js`. Sirve como shim de compatibilidad. Sin embargo, todavía hay 5 archivos que importan por la ruta vieja:

| Archivo | Import legacy |
|---|---|
| `services/useAuth.js:4` | `from "../composables/useLabToast.js"` |
| `components/ag-grid/templates/GlassTable.vue:143` | `from "@/composables/useLabToast"` |
| `components/ag-grid/templates/GlassTable.vue:144` | `from "@/composables/useExcelExport"` |
| `composables/useUnsavedGuard.js:23` | `from '@/composables/useLabToast'` |
| `composables/useLaboratorioApi.js:2` | (este se elimina con el Hallazgo 1) |

Una vez migrados todos, el shim `composables/useLabToast.js` puede eliminarse.

### Hallazgo 3 — Patrón `debounce` reinventado tres veces

En `composables/api/useLaboratorioApi.js`:

```js
// Implementación 1 (línea ~1389):
let tOrders = null;
watch([orderQuery], () => {
  if (tOrders) clearTimeout(tOrders);
  tOrders = setTimeout(() => loadOrders(), 250);
});

// Implementación 2 (línea ~1395):
let tItems = null;
watch([itemQuery], () => {
  if (tItems) clearTimeout(tItems);
  tItems = setTimeout(() => loadItems(), 250);
});

// Implementación 3 (línea ~302):
let _searchSheetsTimer = null;
function searchSheets(q) {
  clearTimeout(_searchSheetsTimer);
  _searchSheetsTimer = setTimeout(async () => { ... }, 300);
}
```

Tres declaraciones de variable timer + tres bloques de `clearTimeout/setTimeout` = misma lógica copiada. No existe utility `debounce` en `utils/`.

### Hallazgo 4 — `useLaboratorioApi.js` monolítico

1 586 líneas con:
- 53 refs declarados
- 16 computeds
- 8 funciones `load*` (loadSheets, loadItems, loadOrders, loadEvents, loadOrderEvents, loadOrderCounts, loadHistory, loadAll)
- 12 funciones de mutación (createOrder, scanCode, closeOrder, etc.)
- 7 funciones de exportación (exportInventoryXlsx, exportCatalogCsv, …)
- watchers, mounted hook, ws handler, mappers, helpers

Mezcla domain logic (lab) con presentación (UI state) y export utilities. La refactorización exitosa de `Optica.vue` ya sentó el patrón: separar en composables atómicos por dominio y orquestarlos en `useLaboratorioApi`.

### Hallazgo 5 — `PendingOrdersPanel.vue` 528 líneas

Mezcla: status filter tabs, lista de cards, paneles "Entradas/Salidas del día", lógica de empty states diferenciados, transición animada. Atomizable en `OrderStatusTabs`, `OrderCardsList`, `DayEventsPanel`.

### Archivos afectados

**Eliminación (código muerto):**
- `rsbo-app/src/composables/useLaboratorioApi.js` (1 490 líneas)
- `rsbo-app/src/composables/useLaboratorioMock.js` (805 líneas)
- `rsbo-app/src/composables/api/useLaboratorioMock.js` (805 líneas)
- `rsbo-app/src/composables/useBasesMicasVentas.js` (609 líneas)
- `rsbo-app/src/composables/useLabToast.js` (shim, tras migrar imports)

**Modificación de imports:**
- `rsbo-app/src/services/useAuth.js`
- `rsbo-app/src/components/ag-grid/templates/GlassTable.vue`
- `rsbo-app/src/composables/useUnsavedGuard.js`

**Nueva utility:**
- `rsbo-app/src/utils/debounce.js`

**Refactorización de `useLaboratorioApi.js`:**
- `rsbo-app/src/composables/api/useLaboratorioApi.js` → orquestador slim
- `rsbo-app/src/composables/lab/useLabSheets.js`
- `rsbo-app/src/composables/lab/useLabOrders.js`
- `rsbo-app/src/composables/lab/useLabItems.js`
- `rsbo-app/src/composables/lab/useLabEvents.js`
- `rsbo-app/src/composables/lab/useLabExports.js`
- `rsbo-app/src/composables/lab/useLabMutations.js`
- `rsbo-app/src/composables/lab/useLabMappers.js`

**Atomización de `PendingOrdersPanel.vue`:**
- `rsbo-app/src/components/laboratorio/pendingOrders/OrderStatusTabs.vue` + `.css`
- `rsbo-app/src/components/laboratorio/pendingOrders/OrderCardsList.vue` + `.css`
- `rsbo-app/src/components/laboratorio/pendingOrders/DayEventsPanel.vue` + `.css`

---

## Pasos de Implementación

### Fase 1 — Eliminar código muerto (sin riesgo, alto impacto)

**1.** Verificar una vez más que ningún archivo del proyecto importa los duplicados viejos. Ejecutar para cada candidato:
```bash
grep -rn "from.*'@/composables/useLaboratorioApi'" rsbo-app/src/
grep -rn "from.*'@/composables/useLaboratorioMock'" rsbo-app/src/
grep -rn "from.*'@/composables/useBasesMicasVentas'" rsbo-app/src/
```
Confirmar que el resultado son cero líneas en `views/` y `components/`. Si hay alguna referencia, primero migrarla a la versión `api/`.

**2.** Eliminar `rsbo-app/src/composables/useLaboratorioApi.js` (1 490 líneas).

**3.** Eliminar `rsbo-app/src/composables/useLaboratorioMock.js` y `rsbo-app/src/composables/api/useLaboratorioMock.js` (1 610 líneas combinadas — ningún importador).

**4.** Eliminar `rsbo-app/src/composables/useBasesMicasVentas.js` (609 líneas).

### Fase 2 — Migrar shims legacy y eliminarlos

**5.** En `rsbo-app/src/services/useAuth.js`, reemplazar la línea 4:
```js
// ANTES:
import { labToast } from "../composables/useLabToast.js";
// DESPUÉS:
import { labToast } from "@/composables/shared/useLabToast.js";
```

**6.** En `rsbo-app/src/components/ag-grid/templates/GlassTable.vue`, reemplazar las líneas 143-144:
```js
// ANTES:
import { labToast } from "@/composables/useLabToast";
import { exportToXlsx } from "@/composables/useExcelExport";
// DESPUÉS:
import { labToast } from "@/composables/shared/useLabToast.js";
import { exportToXlsx } from "@/composables/ag-grid/useExcelExport.js";
```

**7.** En `rsbo-app/src/composables/useUnsavedGuard.js`, línea 23: cambiar a `@/composables/shared/useLabToast.js`.

**8.** Eliminar `rsbo-app/src/composables/useLabToast.js` (el shim de 155 bytes ya no es necesario).

### Fase 3 — Crear utility `debounce` y reemplazar las tres reinvenciones

**9.** Crear `rsbo-app/src/utils/debounce.js`:

```js
/**
 * Devuelve una versión debounced de fn que solo se ejecuta tras `ms` ms
 * sin nuevas llamadas. Cancelable vía `.cancel()`.
 */
export function debounce(fn, ms = 250) {
  let t = null;
  const debounced = (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn(...args);
    }, ms);
  };
  debounced.cancel = () => {
    if (t) { clearTimeout(t); t = null; }
  };
  return debounced;
}
```

**10.** En `useLaboratorioApi.js` (el de `api/`), reemplazar las tres implementaciones reinventadas:

**Implementación 1 y 2 (watchers de queries):**
```js
// ANTES:
let tOrders = null;
watch([orderQuery], () => {
  if (tOrders) clearTimeout(tOrders);
  tOrders = setTimeout(() => loadOrders(), 250);
});
let tItems = null;
watch([itemQuery], () => {
  if (tItems) clearTimeout(tItems);
  tItems = setTimeout(() => loadItems(), 250);
});

// DESPUÉS:
import { debounce } from "@/utils/debounce.js";
const debouncedLoadOrders = debounce(loadOrders, 250);
const debouncedLoadItems  = debounce(loadItems, 250);
watch([orderQuery], debouncedLoadOrders);
watch([itemQuery],  debouncedLoadItems);
```

**Implementación 3 (`searchSheets`):**
```js
// ANTES:
let _searchSheetsTimer = null;
function searchSheets(q) {
  clearTimeout(_searchSheetsTimer);
  _searchSheetsTimer = setTimeout(async () => { ... }, 300);
}

// DESPUÉS:
const _searchSheetsCore = async (q = "") => {
  sheetSearchLoading.value = true;
  try { ... } finally { sheetSearchLoading.value = false; }
};
const searchSheets = debounce(_searchSheetsCore, 300);
```

### Fase 4 — Atomizar `useLaboratorioApi.js`

**11.** Crear `rsbo-app/src/composables/lab/useLabMappers.js`:
Mover las funciones puras: `normalizeSheet`, `normalizeOrder`, `mapEntryEvent`, `mapExitEvent`, `buildRowTitle`, `buildRowParams`, `normTxt`, `sheetTitle`. Exportarlas nombradas. Sin estado.

**12.** Crear `rsbo-app/src/composables/lab/useLabSheets.js`:
Mover `sheetsDB`, `sheetIndex`, `sheetSearchResults`, `sheetSearchLoading`, `selectedSheetId`, `sheetQuery`, `loadingSheets`, `loadSheets`, `searchSheets`, `sheetById`, `sheetNameById`, `selectedSheet`, `selectedSheetTitle`. Exportar como `useLabSheets()`.

**13.** Crear `rsbo-app/src/composables/lab/useLabItems.js`:
Mover `itemsDB`, `itemQuery`, `stockFilter`, `loadingItems`, `_itemsLimit`, `loadItems`, `filteredCatalogRows` (computed). Recibe `useLabSheets()` como dependencia para resolver `selectedSheetId`.

**14.** Crear `rsbo-app/src/composables/lab/useLabOrders.js`:
Mover `ordersDB`, `selectedOrderId`, `selectedOrder`, `orderStatusFilter`, `orderQuery`, `orderCounts`, `filteredOrders`, `loadingOrders`, `loadOrders`, `loadOrderCounts`, `selectOrder`, `statusHuman`, `statusTagClass`, `orderProgressPct`.

**15.** Crear `rsbo-app/src/composables/lab/useLabEvents.js`:
Mover `entryEvents`, `exitEvents`, `todayEntries`, `orderEntries`, `orderExits`, `loadingEvents`, `loadingOrderEvents`, `loadEvents`, `loadOrderEvents`. AbortController interno.

**16.** Crear `rsbo-app/src/composables/lab/useLabMutations.js`:
Mover `createOrder`, `scanCode`, `closeOrder`, `cancelOrder`, `resetOrder`, `editOrder`, `submitCorrection`, `removeLine`, todos los refs `loading*` correspondientes, e incluir el dispatch a `loadOrders` / `loadOrderEvents` post-mutación.

**17.** Crear `rsbo-app/src/composables/lab/useLabExports.js`:
Mover `exportInventoryCsv`, `exportInventoryXlsx`, `exportCatalogCsv`, `exportOrdersCsv`, `exportEntriesCsv`, `exportExitsCsv`, `exportOrderXlsx`, refs `loadingExport*`. Importa `exportToXlsx` de `composables/ag-grid/useExcelExport.js`.

**18.** Refactorizar `rsbo-app/src/composables/api/useLaboratorioApi.js` en orquestador slim (~80 líneas):

```js
import { provide, onMounted, onBeforeUnmount } from "vue";
import { useLabSheets }    from "@/composables/lab/useLabSheets.js";
import { useLabItems }     from "@/composables/lab/useLabItems.js";
import { useLabOrders }    from "@/composables/lab/useLabOrders.js";
import { useLabEvents }    from "@/composables/lab/useLabEvents.js";
import { useLabMutations } from "@/composables/lab/useLabMutations.js";
import { useLabExports }   from "@/composables/lab/useLabExports.js";
import { initLabSocket }   from "@/composables/useLabSocket.js";

export function useLaboratorioApi(getUser) {
  const sheets    = useLabSheets();
  const items     = useLabItems(sheets);
  const orders    = useLabOrders();
  const events    = useLabEvents(orders);
  const mutations = useLabMutations({ getUser, sheets, items, orders, events });
  const exports_  = useLabExports({ orders, items, events, sheets });

  // Estado de UI puramente top-level
  const activeMainTab = ref("pedidos");
  const mode = ref("default");

  // ── WS handler ──
  function _onWsEvent(e) { ... }
  onMounted(async () => {
    initLabSocket();
    await Promise.all([sheets.loadSheets(), orders.loadOrders(), events.loadEvents()]);
    await items.loadItems();
    if (orders.selectedOrderId.value) await events.loadOrderEvents(orders.selectedOrderId.value);
    window.addEventListener("lab:ws", _onWsEvent);
  });
  onBeforeUnmount(() => window.removeEventListener("lab:ws", _onWsEvent));

  return { activeMainTab, mode, ...sheets, ...items, ...orders, ...events, ...mutations, ...exports_ };
}
```

**19.** Verificar que `Laboratorio.vue` y todos los tabs siguen funcionando — la API pública del composable (qué se devuelve) no cambia. Solo cambia su organización interna.

### Fase 5 — Atomizar `PendingOrdersPanel.vue` (528 líneas)

**20.** Crear `rsbo-app/src/components/laboratorio/pendingOrders/OrderStatusTabs.vue`:
Extraer el bloque de status filter tabs (las 5 tabs Abiertos/Pendiente/Parcial/Cerrado/Todos con badges). Props: `modelValue` (filter actual), `counts` (objeto orderCounts). Emits: `update:modelValue`. Co-ubica `OrderStatusTabs.css`.

**21.** Crear `rsbo-app/src/components/laboratorio/pendingOrders/OrderCardsList.vue`:
Extraer el `<transition-group>` con las cards de orden, los empty states diferenciados, los skeletons. Props: `orders`, `loading`, `selectedId`, `total` (para distinguir empty filter vs empty total), `filterLabel`. Emits: `select`. Co-ubica `OrderCardsList.css`.

**22.** Crear `rsbo-app/src/components/laboratorio/pendingOrders/DayEventsPanel.vue`:
Extraer los dos paneles "Entradas del día" y "Salidas del día" (los badges del día). Recibe `entryEvents`, `exitEvents`, `loadingEvents`. Co-ubica `.css`.

**23.** Refactorizar `PendingOrdersPanel.vue` para que solo orqueste los tres subcomponentes con `inject('lab')`. Debe quedar en ~120 líneas.

### Fase 6 — Verificación

**24.** `npm run build` en `rsbo-app/` — verificar que no hay errores de imports rotos.

**25.** Comparar tamaño del bundle antes/después con `npm run build` y revisar el output de Vite. Esperado: reducción de ~3 700 líneas de código fuente; el bundle final puede o no reducirse si el tree-shaking ya descartaba lo muerto, pero el repo es 3 700 líneas más liviano para el desarrollador.

**26.** Smoke test funcional:
- Abrir Laboratorio → cargan pedidos, planillas, items
- Cambiar planilla en `SheetPickerInput`  → carga items
- Filtrar pedidos por status → contadores y lista correctos
- Seleccionar pedido → entradas/salidas específicas se cargan con spinner
- Crear pedido / Surtir mica / Cerrar pedido → mutaciones funcionan
- Exportar a Excel → funciona
- Cambiar entre BasesMicas y Laboratorio → ambos siguen funcionando

**27.** Verificar con `grep -rn "useLabToast\|useExcelExport\|useOrdersBadge"` que ningún import quedó usando rutas viejas. Todos deben apuntar a `@/composables/shared/`, `@/composables/ag-grid/` o `@/composables/ui/`.

---

## Beneficios cuantificados

| Métrica | Antes | Después | Δ |
|---|---|---|---|
| Líneas en `composables/` (sin contar `api/`, `shared/`, etc.) | ~3 700 | ~0 (lo que quede legítimo) | **-3 700** |
| Composable más grande | 1 586 líneas (`useLaboratorioApi.js`) | ~80 líneas (orquestador) + 7 archivos de ~150-300 c/u | **divisor: 5x reducción de complejidad por archivo** |
| Componente más grande del módulo lab | 528 líneas (`PendingOrdersPanel`) | ~120 líneas + 3 subcomponentes | **divisor: 4x** |
| Implementaciones de debounce | 3 (copiadas) | 1 utility (`utils/debounce.js`) | **-66% código duplicado** |
| Imports legacy a rutas movidas | 5 archivos | 0 | **0 deuda de migración pendientSe** |
| Confusión "¿cuál import uso?" para `useLaboratorioApi` | 2 archivos casi idénticos con 347 líneas de diff | 1 archivo único | **-100% ambigüedad** |

---SS
# Plan de Implementación — `VentasDashboard.vue` (Centro de Ventas Unificado)

> **Autor del plan:** Arquitecto de Software Senior
> **Fecha:** 2026-04-30
> **Branch sugerido:** `feat/ventas-dashboard-unificado`

---

## 1. Objetivo

Unificar las tres vistas de ventas (`BasesMicas.vue`, `Optica.vue`, `LentesContacto.vue`) en una **única vista dashboard** (`VentasDashboard.vue`) basada en pestañas, manteniendo dos flujos de negocio claramente diferenciados:

| Categoría | Flujo | Destino |
|---|---|---|
| Bases y Micas | Pedido a laboratorio | `Laboratorio.vue` (cola de producción) |
| Óptica | Venta directa | Salida inmediata de inventario |
| Lentes de Contacto | Venta directa | Salida inmediata de inventario |

El **historial** será unificado, con filtro `Todas | Bases y Micas | Óptica | Lentes de Contacto`.

---

## 2. Arquitectura de alto nivel

```
views/ventas/
├── VentasDashboard.vue           ← NUEVO (reemplaza BasesMicas.vue como entrada)
├── Laboratorio.vue               ← intacto
└── (Optica.vue, LentesContacto.vue → ELIMINAR al final)

components/ventas/
├── shared/
│   ├── VentasHero.vue            ← genérico (antes BasesMicasHero)
│   ├── VentasCart.vue            ← genérico, expone slot/props para flujo
│   ├── VentasCatalog.vue         ← genérico
│   ├── VentasHistory.vue         ← unificado con filtro categoría
│   └── VentasVoucher.vue         ← genérico
├── bases-micas/                  ← lógica específica (envío a lab)
├── optica/                       ← lógica específica (venta directa)
└── lentes-contacto/              ← lógica específica (venta directa)

composables/api/
├── useVentasDashboard.js         ← orquestador (delega por categoría)
├── useBasesMicasVentas.js        ← refactor: ya no maneja UI tabs
├── useOpticaVentas.js            ← NUEVO
├── useLentesContactoVentas.js    ← NUEVO
└── useVentasHistory.js           ← NUEVO (historial unificado)
```

### Principio rector
**Categorías como estrategias.** Cada categoría implementa el contrato `{ catalog, cart, checkout, kind }`. `VentasDashboard.vue` solo selecciona la estrategia activa y la inyecta en componentes UI compartidos.

---

## 3. Lista atomizada de tareas

### Fase 0 — Preparación (sin breaking changes)
- [ ] **0.1** Crear branch `feat/ventas-dashboard-unificado` desde `main`.
- [ ] **0.2** Auditar `useBasesMicasVentas.js` y extraer en `_shared.js` los helpers no específicos (`fmtDate`, `fmtDateShort`, formateadores, `clienteSuggestions`).
- [ ] **0.3** Documentar el contrato de "estrategia de venta" (ver §5.1).

### Fase 1 — Estructura del Dashboard
- [ ] **1.1** Crear `views/ventas/VentasDashboard.vue` (esqueleto con `DynamicTabs`).
- [ ] **1.2** Crear `constants/ventasTabs.js` con la definición de tabs.
- [ ] **1.3** Definir el composable orquestador `useVentasDashboard.js`.
- [ ] **1.4** Añadir prop/route-param `category` para preseleccionar tab.

### Fase 2 — Generalizar componentes UI
- [ ] **2.1** Renombrar `BasesMicasHero.vue` → `VentasHero.vue` y parametrizar (icono, título, contadores).
- [ ] **2.2** Renombrar `BasesMicasCatalog.vue` → `VentasCatalog.vue`. Ocultar selector de "sheet" cuando la categoría no lo requiera (Óptica/Lentes).
- [ ] **2.3** Renombrar `BasesMicasCart.vue` → `VentasCart.vue`. Cambiar la etiqueta del botón de checkout según `kind` (`'lab'` → "Enviar a laboratorio"; `'direct'` → "Cobrar y entregar").
- [ ] **2.4** Renombrar `BasesMicasHistory.vue` → `VentasHistory.vue`. Añadir prop `category` y filtro UI.
- [ ] **2.5** Renombrar `BasesMicasVoucher.vue` → `VentasVoucher.vue`. Renderizar bloque "Estado en lab" solo si `order.kind === 'lab'`.

### Fase 3 — Estrategias de venta
- [ ] **3.1** Refactor `useBasesMicasVentas.js`: extraer la sección de tabs/historial; mantener `kind: 'lab'` y `checkout()` que llama a `registrarVenta` (envía al laboratorio).
- [ ] **3.2** Crear `useOpticaVentas.js` con `kind: 'direct'`. `checkout()` registra venta directa (descuento de stock + recibo).
- [ ] **3.3** Crear `useLentesContactoVentas.js` análogo (`kind: 'direct'`).
- [ ] **3.4** Cada composable expone idéntica firma:
  `{ kind, catalog, cart, checkout, voucher }`.

### Fase 4 — Historial unificado
- [ ] **4.1** Crear `useVentasHistory.js` con `category: ref('all'|'bases-micas'|'optica'|'lentes-contacto')` y `loadHistory()` que llama al endpoint correspondiente o un endpoint agregado.
- [ ] **4.2** En backend (`inventory-service`): exponer `GET /api/ventas/historial?category=...` que mezcle resultados (out of scope si ya existe agregador; flag como TODO).
- [ ] **4.3** Render del filtro: `<b-field>` con radio-button-group encima de la tabla.

### Fase 5 — Integración con Sidebar y Router
- [ ] **5.1** Reemplazar las 3 rutas `ventas/bases-micas`, `ventas/optica`, `ventas/lentes-contacto` por **una sola** `ventas/:category(bases-micas|optica|lentes-contacto)?` apuntando a `VentasDashboard.vue`.
- [ ] **5.2** Actualizar `Sidebar.vue` (`menuItems → "Ventas"`): cada hijo navega a `/l/ventas/<category>`. La ruta `/l/ventas` (sin parámetro) cae en la primera tab.
- [ ] **5.3** En `VentasDashboard.vue`, sincronizar tab ↔ ruta con `watch` bidireccional (ver §5.4).

### Fase 6 — Limpieza
- [ ] **6.1** Eliminar `views/ventas/Optica.vue` y `views/ventas/LentesContacto.vue`.
- [ ] **6.2** Eliminar componentes `components/ventas/BasesMicas*.vue` ya migrados.
- [ ] **6.3** Renombrar carpetas: `components/ventas/` queda como raíz de `shared/` + subcarpetas por categoría.
- [ ] **6.4** Actualizar imports rotos (`grep -r "BasesMicas" rsbo-app/src`).
- [ ] **6.5** Verificar que `Laboratorio.vue` sigue recibiendo pedidos (sin cambios esperados).

### Fase 7 — QA manual
- [ ] **7.1** Probar flujo "Bases y Micas" → verificar que aparece en `Laboratorio.vue`.
- [ ] **7.2** Probar venta directa "Óptica" → verificar descuento de stock y voucher.
- [ ] **7.3** Probar deep-link `/l/ventas/lentes-contacto` desde sidebar.
- [ ] **7.4** Probar filtros del historial.

---

## 4. Diseño de la interfaz (Tabs)

### 4.1 Tabs principales del dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ VentasHero (contadores agregados / por categoría activa)    │
├─────────────────────────────────────────────────────────────┤
│ [Bases y Micas] [Óptica] [Lentes Contacto] [Historial]      │ ← DynamicTabs
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────┐  ┌─────────────────────┐    │
│  │  VentasCatalog             │  │  VentasCart         │    │
│  │  (props vienen de strategy)│  │  (kind = lab|direct)│    │
│  └────────────────────────────┘  └─────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Estado de pestaña activa
- Fuente de verdad: **el segmento de la URL** (`route.params.category`).
- `activeTab` es un `computed` derivado; al cambiar de tab se hace `router.replace`.
- La pestaña "Historial" es un quinto tab que **no** depende de categoría.

---

## 5. Snippets de código clave

### 5.1 Contrato de estrategia (`composables/api/_ventasStrategy.js`)

```js
// Cada composable de categoría debe retornar un objeto con esta forma.
/**
 * @typedef {Object} VentasStrategy
 * @property {'lab'|'direct'} kind
 * @property {Object} catalog       // { items, query, filter, pagination, ... }
 * @property {Object} cart          // { items, cliente, total, addItem, removeItem, clear, ... }
 * @property {() => Promise<Order>} checkout
 * @property {Ref<Order|null>} lastVoucher
 * @property {Object} loading       // { sheets, items, sale }
 */
```

### 5.2 `useVentasDashboard.js` (orquestador)

```js
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBasesMicasVentas } from './useBasesMicasVentas';
import { useOpticaVentas } from './useOpticaVentas';
import { useLentesContactoVentas } from './useLentesContactoVentas';
import { useVentasHistory } from './useVentasHistory';

export const VENTAS_TABS = [
  { key: 'bases-micas',     label: 'Bases y Micas',  icon: 'glasses' },
  { key: 'optica',          label: 'Óptica',         icon: 'eye' },
  { key: 'lentes-contacto', label: 'Lentes Contacto',icon: 'circle' },
  { key: 'historial',       label: 'Historial',      icon: 'history' },
];

export function useVentasDashboard(getUser) {
  const route  = useRoute();
  const router = useRouter();

  const strategies = {
    'bases-micas':     useBasesMicasVentas(getUser),
    'optica':          useOpticaVentas(getUser),
    'lentes-contacto': useLentesContactoVentas(getUser),
  };

  const activeTab = computed({
    get: () => route.params.category || 'bases-micas',
    set: (key) => router.replace({ name: 'ventas-dashboard', params: { category: key } }),
  });

  const activeStrategy = computed(() =>
    activeTab.value === 'historial' ? null : strategies[activeTab.value]
  );

  const history = useVentasHistory(getUser);

  // Mantener el filtro del historial sincronizado al entrar desde una tab de categoría
  watch(activeTab, (k) => {
    if (k !== 'historial') history.category.value = k;
  });

  return { activeTab, activeStrategy, history, strategies, VENTAS_TABS };
}
```

### 5.3 `VentasDashboard.vue` (esqueleto)

```vue
<template>
  <VentasHero
    :category="activeTab"
    :counts="heroCounts"
    @refresh="onRefresh"
  />

  <section class="view-main">
    <div class="glass">
      <DynamicTabs v-model="activeTab" :tabs="VENTAS_TABS">
        <template v-for="key in CATEGORY_KEYS" #[key] :key="key">
          <div class="columns is-multiline is-variable is-4">
            <div class="column is-8">
              <VentasCatalog v-bind="strategies[key].catalog"
                             :show-sheet-picker="key === 'bases-micas'"
                             @add-to-cart="strategies[key].cart.addItem" />
            </div>
            <div class="column is-4">
              <VentasCart v-bind="strategies[key].cart"
                          :kind="strategies[key].kind"
                          @checkout="strategies[key].checkout" />
            </div>
          </div>
        </template>

        <template #historial>
          <VentasHistory v-model:category="history.category"
                         :rows="history.rows.value"
                         :loading="history.loading.value"
                         @refresh="history.reload" />
        </template>
      </DynamicTabs>
    </div>
  </section>

  <!-- voucher modal: muestra el bloque "estado lab" solo si kind==='lab' -->
  <teleport to="body">
    <b-modal v-model="voucherOpen" :width="560" scroll="keep">
      <VentasVoucher :order="lastVoucher" />
    </b-modal>
  </teleport>
</template>

<script setup>
import { computed, provide, ref } from 'vue';
import DynamicTabs from '@/components/DynamicTabs.vue';
import VentasHero    from '@/components/ventas/shared/VentasHero.vue';
import VentasCatalog from '@/components/ventas/shared/VentasCatalog.vue';
import VentasCart    from '@/components/ventas/shared/VentasCart.vue';
import VentasHistory from '@/components/ventas/shared/VentasHistory.vue';
import VentasVoucher from '@/components/ventas/shared/VentasVoucher.vue';
import { useVentasDashboard, VENTAS_TABS } from '@/composables/api/useVentasDashboard';

const props = defineProps({
  user:    { type: Object,  default: null },
  loading: { type: Boolean, default: false },
});

const CATEGORY_KEYS = ['bases-micas', 'optica', 'lentes-contacto'];

const { activeTab, strategies, history } = useVentasDashboard(() => props.user);

const voucherOpen = ref(false);
const lastVoucher = computed(() =>
  CATEGORY_KEYS.map(k => strategies[k].lastVoucher.value).find(Boolean)
);

const heroCounts = computed(() => {
  const s = strategies[activeTab.value];
  return s ? { items: s.catalog.filteredItems.value.length, cart: s.cart.total.value } : {};
});

function onRefresh() {
  if (activeTab.value === 'historial') history.reload();
  else strategies[activeTab.value].catalog.reload();
}

provide('ventas', { strategies, activeTab });
</script>
```

### 5.4 Router (`router/index.js`)

```js
// Reemplazar las 3 rutas existentes por una sola
{
  path: 'ventas/:category(bases-micas|optica|lentes-contacto|historial)?',
  name: 'ventas-dashboard',
  component: () => import('../views/ventas/VentasDashboard.vue'),
  props: true,
},
{
  path: 'ventas/laboratorio',
  name: 'ventas-laboratorio',
  component: () => import('../views/ventas/Laboratorio.vue'),
},
```

### 5.5 Sidebar (`components/Sidebar.vue` → `menuItems`)

```js
{
  label: 'Ventas',
  icon: 'shopping-cart',
  badge: labBadge,
  badgeType: 'is-warning',
  children: [
    { label: 'Laboratorio',     icon: 'flask',    path: '/l/ventas/laboratorio' },
    { label: 'Bases y Micas',   icon: 'glasses',  path: '/l/ventas/bases-micas' },
    { label: 'Óptica',          icon: 'eye',      path: '/l/ventas/optica' },
    { label: 'Lentes Contacto', icon: 'circle',   path: '/l/ventas/lentes-contacto' },
    { label: 'Historial',       icon: 'history',  path: '/l/ventas/historial' },
  ],
},
```

### 5.6 `VentasCart.vue` — diferenciación de checkout

```vue
<template>
  <!-- ... contenido común del carrito ... -->
  <b-button
    :type="kind === 'lab' ? 'is-primary' : 'is-success'"
    :icon-left="kind === 'lab' ? 'flask' : 'cash-register'"
    :disabled="!items.length"
    @click="$emit('checkout')"
  >
    {{ kind === 'lab' ? 'Enviar a laboratorio' : 'Cobrar y entregar' }}
  </b-button>
</template>

<script setup>
defineProps({
  kind:  { type: String, required: true, validator: v => ['lab','direct'].includes(v) },
  items: { type: Array,  default: () => [] },
  // ...resto de props del carrito
});
defineEmits(['checkout','remove','inc','dec','clear']);
</script>
```

### 5.7 `useVentasHistory.js`

```js
import { ref, computed, watch } from 'vue';
import api from '@/api/axios';

export function useVentasHistory() {
  const category = ref('all'); // 'all' | 'bases-micas' | 'optica' | 'lentes-contacto'
  const rows     = ref([]);
  const loading  = ref(false);

  async function reload() {
    loading.value = true;
    try {
      const params = category.value === 'all' ? {} : { category: category.value };
      const { data } = await api.get('/ventas/historial', { params });
      rows.value = data.items ?? [];
    } finally {
      loading.value = false;
    }
  }

  watch(category, reload, { immediate: true });
  return { category, rows, loading, reload };
}
```

---

## 6. Archivos afectados

### Crear
- `rsbo-app/src/views/ventas/VentasDashboard.vue`
- `rsbo-app/src/composables/api/useVentasDashboard.js`
- `rsbo-app/src/composables/api/useOpticaVentas.js`
- `rsbo-app/src/composables/api/useLentesContactoVentas.js`
- `rsbo-app/src/composables/api/useVentasHistory.js`
- `rsbo-app/src/components/ventas/shared/Ventas{Hero,Catalog,Cart,History,Voucher}.vue`

### Modificar
- `rsbo-app/src/router/index.js` — colapsar 3 rutas en una.
- `rsbo-app/src/components/Sidebar.vue` — paths actualizados.
- `rsbo-app/src/composables/api/useBasesMicasVentas.js` — extraer historial/tabs.

### Eliminar (Fase 6)
- `rsbo-app/src/views/ventas/BasesMicas.vue`
- `rsbo-app/src/views/ventas/Optica.vue`
- `rsbo-app/src/views/ventas/LentesContacto.vue`
- `rsbo-app/src/components/ventas/BasesMicas{Hero,Catalog,Cart,History,Voucher}.{vue,css}`

### Sin cambios (verificar regresiones)
- `rsbo-app/src/views/ventas/Laboratorio.vue`
- `backend/inventory-service/*` (salvo §4.2 si se decide endpoint agregado)

---

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Pedidos a laboratorio se pierden si `kind` no se respeta en checkout | Test manual de Fase 7.1 antes de borrar archivos legacy |
| Deep-links existentes (`/l/ventas/bases-micas`) rotos | El nuevo router con `:category?` mantiene el path; verificar con QA |
| Composables específicos divergen de la firma común | Validar contrato con un `assert` simple en `useVentasDashboard` durante dev |
| Endpoint `/ventas/historial?category=` no existe en backend | Empezar con 3 llamadas paralelas en cliente; agregador como follow-up |

---

## 8. Orden de ejecución recomendado (PRs)

1. **PR-1** — Fases 0+1+2 (estructura + UI genérica, sin tocar router todavía; vista nueva accesible en ruta temporal).
2. **PR-2** — Fase 3 (estrategias) + Fase 4 (historial).
3. **PR-3** — Fase 5 (router + sidebar) — *este PR es el "switch"*.
4. **PR-4** — Fase 6 (limpieza) tras una semana de soak.

---

*Fin del plan.*

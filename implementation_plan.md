# Plan de implementación — Limpieza del refactor de `TabsManager.vue`

## Contexto

`rsbo-app/src/components/TabsManager.vue` fue atomizado en sub-componentes
(`tabsmanager/TabsBar.vue`, `CreateSheetForm.vue`, `SheetActionsModal.vue`,
`InternalTabs.vue`, …) y composables (`composables/tabsmanager/*`). El
refactor quedó a medio camino: el padre todavía contiene referencias a
símbolos que ya viven en los hijos, lógica duplicada, e imports muertos.
Algunos de esos restos lanzan errores en runtime.

## Bugs detectados

### 1. `ReferenceError: resetNewForm is not defined` — runtime crash
[TabsManager.vue:818](rsbo-app/src/components/TabsManager.vue#L818)
```js
if (prev === "nueva") resetNewForm();
```
`resetNewForm` se movió a `useCreateSheet.js`. El watcher se dispara cada
vez que el usuario sale de la pestaña "nueva" → excepción no capturada.

### 2. `ReferenceError: creatingSheet is not defined` — runtime crash latente
[TabsManager.vue:740](rsbo-app/src/components/TabsManager.vue#L740)
```js
const anySaving = computed(
  () => creatingSheet.value || renaming.value || ...
);
```
`creatingSheet` ya solo existe dentro de `CreateSheetForm`. Mientras nadie
lea `anySaving` no truena, pero `anySaving` además **no se usa en ninguna
parte** del template — código muerto que rompe en cuanto alguien lo toque.

### 3. Estilos de las tabs internas no aplican (CSS roto)
[TabsManager.vue:44-49](rsbo-app/src/components/TabsManager.vue#L44-L49) renderiza
`.sheet-tabs / .sheet-tab` inline, pero esas clases solo existen en
[InternalTabs.css](rsbo-app/src/components/tabsmanager/InternalTabs.css)
con `<style scoped>` en `InternalTabs.vue`. Resultado: las pestañas
SPH(±)/BASE(±) salen sin estilo. El componente `InternalTabs.vue` existe
pero nunca se importa.

### 4. Watcher de scroll-to-active duplicado y muerto
[TabsManager.vue:815-843](rsbo-app/src/components/TabsManager.vue#L815-L843) replica
el `watch(activeId)` que ya hace `TabsBar.vue` ([TabsBar.vue:174-196](rsbo-app/src/components/tabsmanager/TabsBar.vue#L174-L196)).
Además usa `tabsContainer.value`, una `ref` declarada pero **nunca
ligada** a un elemento del template (solo vive en TabsBar). Siempre
retorna `null` → branch muerta + `resetNewForm` crash arriba.

### 5. Import inexistente
[TabsManager.vue:115](rsbo-app/src/components/TabsManager.vue#L115)
```js
import { useSheetNormalizer } from "@/composables/tabsmanager/useSheetNormalizer";
```
El módulo no exporta `useSheetNormalizer` (solo `normalizeSheet`,
`composeTratamientoDisplay`, `displayTratamiento`, `tipoHuman`). Resuelve
a `undefined`; no rompe porque no se usa, pero ensucia.

### 6. Imports y refs sin uso
- `useVendorAutocomplete` ([L116](rsbo-app/src/components/TabsManager.vue#L116)) — solo lo consume `CreateSheetForm`.
- De `useDateHelpers`: `todayISO`, `dateForCreate`, `numForCreate` ([L117-L127](rsbo-app/src/components/TabsManager.vue#L117-L127)) ya no se usan en el padre.
- `tabsContainer`, `rightSentinel`, `leftSentinel`, `_ioRight`, `_ioLeft`, `_destroyObservers` ([L287-L299](rsbo-app/src/components/TabsManager.vue#L287-L299)) — la lógica de IntersectionObserver vive ahora en `TabsBar`.
- Watcher vacío sobre `props.activeId` ([L307-L312](rsbo-app/src/components/TabsManager.vue#L307-L312)) con comentario `// any extra logic if needed`.
- `confirmingDelete` ([L689](rsbo-app/src/components/TabsManager.vue#L689)) escrito en `softDelete`/`openActions` pero nunca leído en el template — el modal lo gestiona internamente.
- CSS scoped `.create-actions` y `.create-status` ([L858-L869](rsbo-app/src/components/TabsManager.vue#L858-L869)) solo se usan dentro de `CreateSheetForm`; aquí no hacen nada.

## Plan de implementación

Los puntos están ordenados de mayor a menor riesgo. Se pueden aplicar en
un solo commit, son cambios locales al archivo (excepto el punto 3, que
toca el template).

1. **Arreglar el crash del watcher de `activeId`**
   Eliminar el bloque [L815-L843](rsbo-app/src/components/TabsManager.vue#L815-L843)
   completo: el scroll-to-active ya lo hace `TabsBar`, y `resetNewForm`
   ya no pertenece aquí (el reset al salir de "nueva" puede vivir en un
   `watch` dentro de `useCreateSheet`/`CreateSheetForm` si todavía hace
   falta — verificar si ya está allí; si no, mover ahí, no replicar en el padre).

2. **Eliminar `anySaving`**
   Borrar [L738-L746](rsbo-app/src/components/TabsManager.vue#L738-L746).
   Si en el futuro se necesita un flag global, reconstruirlo desde los
   sub-composables, no desde refs locales que ya no existen.

3. **Usar `InternalTabs.vue` en vez del markup inline**
   Reemplazar [L44-L49](rsbo-app/src/components/TabsManager.vue#L44-L49) por:
   ```vue
   <InternalTabs
     :tabs="internalTabs"
     :active-tab-id="activeInternalTab"
     @select="handleInternalTabClick"
   />
   ```
   y añadir el import. Esto restaura los estilos perdidos.

4. **Limpiar imports muertos**
   - Quitar `useSheetNormalizer` de [L115](rsbo-app/src/components/TabsManager.vue#L115).
   - Quitar `useVendorAutocomplete` de [L116](rsbo-app/src/components/TabsManager.vue#L116).
   - De `useDateHelpers`, dejar solo `ISO_DATE_ONLY_RX`, `DEFAULT_EXPIRY_MONTHS`, `fmtDateOnly`, `addMonthsToISODate`, `dateForEdit`, `numForEdit`.
   - Quitar `onMounted`, `onBeforeUnmount` de [L104](rsbo-app/src/components/TabsManager.vue#L104) (ya no se usan).
   - Quitar `Sortable` de [L105](rsbo-app/src/components/TabsManager.vue#L105).

5. **Borrar bloque de observers/sentinels muerto**
   [L286-L299](rsbo-app/src/components/TabsManager.vue#L286-L299) y el watcher vacío [L307-L312](rsbo-app/src/components/TabsManager.vue#L307-L312).

6. **Eliminar `confirmingDelete`**
   La ref se asigna pero nunca se lee en este template (el modal tiene
   su propio estado vía `v-model:is-open`). Quitarla y sus dos asignaciones.

7. **Limpiar `<style scoped>`**
   Dejar solo `.plantillas-contenedor`. Borrar `.create-actions`,
   `.create-status`, `.fade-status-*` (todo eso vive en
   `CreateSheetForm.vue` / `CreateSheetForm.css`).

## Cómo verificar

- `npm run dev` en `rsbo-app/`.
- Abrir vista con planillas (Bases y Micas o cualquiera con `TabsManager`).
- **Caso 1** (regresión #1): estar en pestaña "nueva", clic en otra pestaña.
  Antes: `ReferenceError`. Después: cambio limpio.
- **Caso 2** (regresión #3): abrir una planilla con `tipo_matriz` SPH_ADD/SPH_CYL/BASE/BASE_ADD.
  Las pestañas internas SPH(-)/SPH(+) deben verse con su pill style, no como texto pelado.
- **Caso 3**: scroll y reorden de tabs siguen funcionando (responsabilidad de `TabsBar`, no debería tocarse).
- **Caso 4**: crear planilla, renombrar, editar compra/proveedor/notas, enviar a papelera — todos los flujos del modal siguen ok.

## Fuera de alcance

- No reescribir los composables ni los hijos: el contrato de props/emits se mantiene.
- No tocar `useSheetApi`, normalización ni el modelo de datos.
- No introducir tests (el repo no tiene suite).

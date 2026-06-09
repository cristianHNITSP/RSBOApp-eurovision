// src/composables/scan/useQrScan.js
// Estado singleton (a nivel módulo) del flujo de escaneo QR: abre el escáner,
// resuelve el código y despacha a "ubicar" (deep-link a la matriz) o "stock" (modal).
import { ref } from "vue";
import router from "@/router";
import { resolveQr } from "@/services/scan.service";
import { saveCell } from "@/services/inventory";
import { saveContactLensCell } from "@/services/contactlenses";
import { labToast } from "@/composables/shared/useLabToast.js";

const scanOpen = ref(false);
const action = ref("locate"); // 'locate' | 'stock'
const resolving = ref(false);
const saving = ref(false);
const resolved = ref(null);
const stockOpen = ref(false);

const FAMILY_PATH = {
  inventory: "/l/inventario/bases-micas",
  contactlenses: "/l/inventario/lentes-contacto",
};

/** Construye la query de deep-link (sheetId + lado + fila/columna) desde lo resuelto. */
function focusQuery({ sheet, coords }) {
  const c = coords || {};
  let row = null, col = null, family = "sph";
  switch (sheet.tipo_matriz) {
    case "BASE": row = c.base; family = "base"; break;
    case "SPH_CYL": row = c.sph; col = c.cyl; break;
    case "SPH_CYL_AXIS": row = c.sph; col = c.cyl; break;
    case "SPH_ADD": row = c.sph; col = c.add; break;
    case "BASE_ADD": row = c.base_izq ?? c.base; col = c.add; family = "base"; break;
  }
  const side = `${family}-${row != null && Number(row) < 0 ? "neg" : "pos"}`;
  const q = { sheetId: String(sheet._id), focusSide: side };
  if (row != null) q.focusRow = String(row);
  if (col != null) q.focusCol = String(col);
  return q;
}

/** Cuerpo del PUT de celda con las coordenadas que requiere cada segmento. */
function cellBody(segment, coords, eye, delta) {
  const c = coords || {};
  const base = { delta };
  switch (segment) {
    case "base": return { ...base, base: c.base };
    case "sph-cyl": return { ...base, sph: c.sph, cyl: c.cyl };
    case "torico": return { ...base, sph: c.sph, cyl: c.cyl, axis: c.axis };
    case "bifocal": return { ...base, sph: c.sph, add: c.add, eye, base_izq: c.base_izq, base_der: c.base_der };
    case "progresivo":
    case "multifocal": return { ...base, base_izq: c.base_izq, base_der: c.base_der, add: c.add, eye };
    default: return base;
  }
}

function reset() {
  scanOpen.value = false;
  stockOpen.value = false;
  resolved.value = null;
  resolving.value = false;
}

/** Abre el escáner para una acción concreta. */
function openScan(nextAction) {
  action.value = nextAction === "stock" ? "stock" : "locate";
  resolved.value = null;
  scanOpen.value = true;
}

/** Recibe el código (cámara o manual), lo resuelve y despacha según la acción. */
async function onScanned(code) {
  if (resolving.value) return;
  resolving.value = true;
  try {
    const data = await resolveQr(code);
    if (!data) {
      labToast.warning("No se encontró ninguna dioptría con ese código.");
      return;
    }
    if (action.value === "locate") {
      scanOpen.value = false;
      const path = FAMILY_PATH[data.family] || FAMILY_PATH.inventory;
      router.push({ path, query: focusQuery(data) });
    } else {
      if (!data.segment) {
        labToast.warning("Esta dioptría no admite ajuste de stock por escaneo.");
        return;
      }
      resolved.value = data;
      scanOpen.value = false;
      stockOpen.value = true;
    }
  } catch {
    labToast.danger("Error al resolver el código. Intenta de nuevo.");
  } finally {
    resolving.value = false;
  }
}

/** Aplica un delta (+/–) de stock a la dioptría resuelta. */
async function adjustStock(delta) {
  const data = resolved.value;
  const n = Number(delta);
  if (!data || !Number.isFinite(n) || n === 0) return;
  if (Number(data.existencias || 0) + n < 0) {
    labToast.warning("El stock resultante no puede ser negativo.");
    return;
  }
  saving.value = true;
  try {
    const save = data.family === "contactlenses" ? saveContactLensCell : saveCell;
    const body = cellBody(data.segment, data.coords, data.eye, n);
    await save(String(data.sheet._id), data.segment, body);
    labToast.success(`Stock actualizado (${n > 0 ? "+" : ""}${n}).`);
    reset();
  } catch {
    labToast.danger("No se pudo actualizar el stock.");
  } finally {
    saving.value = false;
  }
}

export function useQrScan() {
  return { scanOpen, action, resolving, saving, resolved, stockOpen, openScan, onScanned, adjustStock, reset };
}

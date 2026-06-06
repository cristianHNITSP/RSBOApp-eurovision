import { ref } from "vue";

/**
 * useSheetFocus — puente one-shot para enfocar una celda (dioptría) tras un deep-link.
 * La vista deja una "petición" { sheetId, coords }; el AgGridSheet correspondiente la
 * consume (scroll + flash) cuando su matriz está cargada. Singleton a nivel de módulo.
 */
const _req = ref(null); // { sheetId, coords } | null

export function useSheetFocus() {
  return {
    reqRef: _req,
    request: (r) => { _req.value = r ? { ...r } : null; },
    peek: () => _req.value,
    consume: (sheetId) => {
      if (_req.value && (!sheetId || String(_req.value.sheetId) === String(sheetId))) {
        _req.value = null;
      }
    },
  };
}

/** Lado interno (pestaña sph/base ±) a partir de las coordenadas de la dioptría. */
export function sideFromCoords(coords = {}) {
  if (coords.base != null) return coords.base < 0 ? "base-neg" : "base-pos";
  if (coords.base_izq != null) return coords.base_izq < 0 ? "base-neg" : "base-pos";
  if (coords.sph != null) return coords.sph < 0 ? "sph-neg" : "sph-pos";
  return null;
}

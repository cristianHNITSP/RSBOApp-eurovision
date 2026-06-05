import { reactive } from "vue";
import { labToast } from "@/composables/shared/useLabToast.js";

/**
 * useOpticaForm.js
 * Gestiona el estado y la persistencia de los formularios de Óptica.
 */
export function useOpticaForm() {
  const fm = reactive({
    active: false,
    section: "",
    mode: "create",
    saving: false,
    item: {},
    id: null,
  });

  // Defaults SIN sku (se auto-genera en el backend). Los campos de tipo select
  // se rellenan en openCreate desde el diccionario de la categoría (options[0]).
  const DEFAULTS = {
    armazones: {
      marca: "", modelo: "", color: "", material: "", tipo: "", genero: "",
      talla: "", serie: "", precio: 0, stock: 0, estuche: false, notas: "",
    },
    soluciones: {
      nombre: "", tipo: "", marca: "", volumen: 0, stock: 0, precio: 0,
      caducidad: "", notas: "",
    },
    accesorios: {
      nombre: "", categoria: "", marca: "Genérico", compatible: "Universal",
      stock: 0, precio: 0, notas: "",
    },
    estuches: {
      nombre: "", tipo: "", material: "", color: "", compatible: "Universal",
      stock: 0, precio: 0, notas: "",
    },
    equipos: {
      nombre: "", tipo: "", marca: "", modelo: "", serie: "", estado: "",
      ubicacion: "", adquisicion: "", mantenimiento: "", notas: "",
    },
  };

  /**
   * Abre el formulario en modo creación.
   */
  function openCreate(section, dictionaries = {}) {
    const item = { ...DEFAULTS[section] };
    // Semilla de los selects desde el diccionario de la categoría (primera opción).
    for (const [field, d] of Object.entries(dictionaries)) {
      if (d?.kind === "select" && !item[field] && Array.isArray(d.options) && d.options.length) {
        item[field] = d.options[0];
      }
    }
    Object.assign(fm, { section, mode: "create", id: null, saving: false, item, active: true });
  }

  /**
   * Abre el formulario en modo edición.
   */
  function openEdit(section, row) {
    const caducidad = row.caducidad ? new Date(row.caducidad).toISOString().split("T")[0] : "";
    const adquisicion = row.adquisicion ? new Date(row.adquisicion).toISOString().split("T")[0] : "";
    const mantenimiento = row.mantenimiento ? new Date(row.mantenimiento).toISOString().split("T")[0] : "";
    
    Object.assign(fm, {
      section,
      mode: "edit",
      id: row._id,
      saving: false,
      item: { ...DEFAULTS[section], ...row, caducidad, adquisicion, mantenimiento },
      active: true,
    });
  }

  /**
   * Guarda el formulario (Create o Update).
   */
  async function saveForm({ SVC, actor, loadCallback, onAfterSave }) {
    fm.saving = true;
    const isCreate = fm.mode === "create";
    const t = labToast.info(isCreate ? "Creando elemento…" : "Guardando cambios…", 0);
    
    try {
      // sku es inmutable y lo genera el backend → nunca se envía.
      const { sku, ...rest } = fm.item;
      const payload = { ...rest, actor };
      const label = fm.item.nombre || fm.item.modelo || sku || "Elemento";
      if (isCreate) {
        await SVC[fm.section].create(payload);
        t.close();
        labToast.success(`"${label}" creado correctamente`);
      } else {
        await SVC[fm.section].update(fm.id, payload);
        t.close();
        labToast.success(`"${label}" actualizado correctamente`);
      }
      
      fm.active = false;
      if (onAfterSave) onAfterSave(fm.section);
      if (loadCallback) loadCallback(fm.section);
      
    } catch (err) {
      t.close();
      labToast.danger(err?.response?.data?.error || "Error al guardar. Verifica los datos.");
    } finally {
      fm.saving = false;
    }
  }

  return {
    fm,
    openCreate,
    openEdit,
    saveForm,
  };
}

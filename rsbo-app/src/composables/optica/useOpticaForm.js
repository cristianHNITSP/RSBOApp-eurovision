import { reactive } from "vue";
import { labToast } from "@/composables/shared/useLabToast.js";
import {
  ARMAZONES_CONFIG,
  SOLUCIONES_CONFIG,
  ACCESORIOS_CONFIG,
  ESTUCHES_CONFIG,
  EQUIPOS_CONFIG,
} from "@/constants/optica.js";

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

  const DEFAULTS = {
    armazones: {
      sku: "",
      marca: "",
      modelo: "",
      color: "",
      material: ARMAZONES_CONFIG.materiales[0],
      tipo: ARMAZONES_CONFIG.tipos[0],
      genero: ARMAZONES_CONFIG.generos[2],
      talla: "",
      serie: "",
      precio: 0,
      stock: 0,
      estuche: false,
      notas: "",
    },
    soluciones: {
      sku: "",
      nombre: "",
      tipo: SOLUCIONES_CONFIG.tipos[0],
      marca: "",
      volumen: 0,
      stock: 0,
      precio: 0,
      caducidad: "",
      notas: "",
    },
    accesorios: {
      sku: "",
      nombre: "",
      categoria: ACCESORIOS_CONFIG.categorias[7],
      marca: "Genérico",
      compatible: "Universal",
      stock: 0,
      precio: 0,
      notas: "",
    },
    estuches: {
      sku: "",
      nombre: "",
      tipo: ESTUCHES_CONFIG.tipos[0],
      material: "",
      color: "",
      compatible: "Universal",
      stock: 0,
      precio: 0,
      notas: "",
    },
    equipos: {
      sku: "",
      nombre: "",
      tipo: EQUIPOS_CONFIG.areas[0],
      marca: "",
      modelo: "",
      serie: "",
      estado: EQUIPOS_CONFIG.estados[0],
      ubicacion: "",
      adquisicion: "",
      mantenimiento: "",
      notas: "",
    },
  };

  /**
   * Abre el formulario en modo creación.
   */
  function openCreate(section) {
    Object.assign(fm, {
      section,
      mode: "create",
      id: null,
      saving: false,
      item: { ...DEFAULTS[section] },
      active: true,
    });
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
      const payload = { ...fm.item, actor };
      if (isCreate) {
        await SVC[fm.section].create(payload);
        t.close();
        labToast.success(`"${fm.item.sku || fm.item.nombre || "Elemento"}" creado correctamente`);
      } else {
        await SVC[fm.section].update(fm.id, payload);
        t.close();
        labToast.success(`"${fm.item.sku || fm.item.nombre || "Elemento"}" actualizado correctamente`);
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

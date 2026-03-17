<!-- src/views/inventario/Optica.vue -->
<script setup>
import { ref, computed } from "vue";

const activeTab = ref(0);

/* ═══════════════════════════════════════════════════════════════════
   ARMAZONES
   ═══════════════════════════════════════════════════════════════════ */
const armazones = ref([
  { sku: "ARZ-001", marca: "Ray-Ban", modelo: "RB5154", color: "Negro/Oro", material: "Acetato", tipo: "Completo", genero: "Unisex", talla: "51-21-145", serie: "CLUB-2024A", precio: 3200, stock: 14, estuche: true, estado: "Disponible" },
  { sku: "ARZ-002", marca: "Oakley", modelo: "OX8046", color: "Satin Black", material: "TR-90", tipo: "Deportivo", genero: "Hombre", talla: "55-17-143", serie: "AIRD-2024B", precio: 2850, stock: 8, estuche: true, estado: "Disponible" },
  { sku: "ARZ-003", marca: "Gucci", modelo: "GG0025O", color: "Havana", material: "Acetato", tipo: "Completo", genero: "Mujer", talla: "56-14-140", serie: "GCC-2024C", precio: 5800, stock: 3, estuche: true, estado: "Bajo stock" },
  { sku: "ARZ-004", marca: "Silhouette", modelo: "5515", color: "Plata Mate", material: "Titanio", tipo: "Al aire", genero: "Unisex", talla: "54-17-150", serie: "SIL-2024D", precio: 7200, stock: 5, estuche: true, estado: "Disponible" },
  { sku: "ARZ-005", marca: "Tom Ford", modelo: "TF5401", color: "Tortoise", material: "Acetato", tipo: "Completo", genero: "Hombre", talla: "51-20-145", serie: "TFD-2024E", precio: 6400, stock: 2, estuche: true, estado: "Bajo stock" },
  { sku: "ARZ-006", marca: "Mykita", modelo: "Lite Saku", color: "Grafito", material: "Metal", tipo: "Semi-al-aire", genero: "Mujer", talla: "50-18-140", serie: "MYK-2024F", precio: 8900, stock: 1, estuche: false, estado: "Bajo stock" },
  { sku: "ARZ-007", marca: "Lindberg", modelo: "Strip 9800", color: "Oro Rosa", material: "Titanio", tipo: "Al aire", genero: "Mujer", talla: "49-18-135", serie: "LBG-2024G", precio: 12500, stock: 4, estuche: true, estado: "Disponible" },
  { sku: "ARZ-008", marca: "Nike", modelo: "7130", color: "Azul Mate", material: "TR-90", tipo: "Deportivo", genero: "Unisex", talla: "53-16-140", serie: "NKE-2024H", precio: 1900, stock: 22, estuche: false, estado: "Disponible" },
  { sku: "ARZ-009", marca: "Versace", modelo: "VE3186", color: "Negro/Dorado", material: "Combinado", tipo: "Completo", genero: "Mujer", talla: "54-16-140", serie: "VRS-2024I", precio: 4500, stock: 6, estuche: true, estado: "Disponible" },
  { sku: "ARZ-010", marca: "Emporio Armani", modelo: "EA3099", color: "Azul Marino", material: "Metal", tipo: "Completo", genero: "Hombre", talla: "52-19-140", serie: "EAR-2024J", precio: 2400, stock: 0, estuche: true, estado: "Agotado" },
]);

const armazonesStats = computed(() => {
  const total = armazones.value.reduce((s, a) => s + a.stock, 0);
  const bajo = armazones.value.filter(a => a.stock > 0 && a.stock <= 3).length;
  const agotado = armazones.value.filter(a => a.stock === 0).length;
  const valor = armazones.value.reduce((s, a) => s + a.precio * a.stock, 0);
  return { total, bajo, agotado, valor };
});

/* ═══════════════════════════════════════════════════════════════════
   LENTES DE CONTACTO
   ═══════════════════════════════════════════════════════════════════ */
const lentesContacto = ref([
  { sku: "LC-001", marca: "Acuvue", nombre: "Oasys 1-Day", tipo: "Esferico", material: "Silicona-Hidrogel", bc: 8.5, dia: 14.3, graduacion: "-2.00", duracion: "Diario", stock: 48, precio: 680, caducidad: "2027-03-15" },
  { sku: "LC-002", marca: "Acuvue", nombre: "Oasys for Astigmatism", tipo: "Torico", material: "Silicona-Hidrogel", bc: 8.5, dia: 14.5, graduacion: "-1.75/-1.25x180", duracion: "Quincenal", stock: 24, precio: 890, caducidad: "2026-11-20" },
  { sku: "LC-003", marca: "Air Optix", nombre: "Night & Day Aqua", tipo: "Esferico", material: "Silicona-Hidrogel", bc: 8.6, dia: 13.8, graduacion: "-3.50", duracion: "Mensual", stock: 36, precio: 750, caducidad: "2027-01-10" },
  { sku: "LC-004", marca: "Bausch+Lomb", nombre: "SofLens Toric", tipo: "Torico", material: "Hidrogel", bc: 8.5, dia: 14.5, graduacion: "-2.25/-0.75x10", duracion: "Mensual", stock: 12, precio: 620, caducidad: "2026-09-05" },
  { sku: "LC-005", marca: "FreshLook", nombre: "Colorblends", tipo: "Colorido", material: "Hidrogel", bc: 8.6, dia: 14.5, graduacion: "0.00", duracion: "Mensual", stock: 60, precio: 450, caducidad: "2027-06-30" },
  { sku: "LC-006", marca: "Proclear", nombre: "Multifocal", tipo: "Multifocal", material: "Hidrogel", bc: 8.7, dia: 14.4, graduacion: "-1.50 ADD +2.00", duracion: "Mensual", stock: 8, precio: 1100, caducidad: "2026-08-22" },
  { sku: "LC-007", marca: "Dailies", nombre: "Total 1", tipo: "Esferico", material: "Silicona-Hidrogel", bc: 8.5, dia: 14.1, graduacion: "-4.00", duracion: "Diario", stock: 90, precio: 820, caducidad: "2027-09-01" },
  { sku: "LC-008", marca: "Biofinity", nombre: "Toric XR", tipo: "Torico", material: "Silicona-Hidrogel", bc: 8.7, dia: 14.5, graduacion: "-5.00/-2.75x170", duracion: "Mensual", stock: 0, precio: 950, caducidad: "2026-12-18" },
]);

const lcStats = computed(() => {
  const total = lentesContacto.value.reduce((s, l) => s + l.stock, 0);
  const porVencer = lentesContacto.value.filter(l => {
    const d = new Date(l.caducidad);
    const diff = (d - new Date()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 180;
  }).length;
  const agotado = lentesContacto.value.filter(l => l.stock === 0).length;
  const valor = lentesContacto.value.reduce((s, l) => s + l.precio * l.stock, 0);
  return { total, porVencer, agotado, valor };
});

/* ═══════════════════════════════════════════════════════════════════
   SOLUCIONES Y GOTAS
   ═══════════════════════════════════════════════════════════════════ */
const soluciones = ref([
  { sku: "SOL-001", nombre: "ReNu MultiPlus", tipo: "Solucion multiusos", marca: "Bausch+Lomb", volumen: 360, stock: 30, precio: 280, caducidad: "2027-02-10" },
  { sku: "SOL-002", nombre: "OPTI-FREE PureMoist", tipo: "Solucion multiusos", marca: "Alcon", volumen: 300, stock: 25, precio: 350, caducidad: "2027-05-15" },
  { sku: "SOL-003", nombre: "Systane Ultra", tipo: "Gotas lubricantes", marca: "Alcon", volumen: 10, stock: 45, precio: 220, caducidad: "2026-10-28" },
  { sku: "SOL-004", nombre: "Refresh Tears", tipo: "Gotas lubricantes", marca: "Allergan", volumen: 15, stock: 38, precio: 190, caducidad: "2027-01-30" },
  { sku: "SOL-005", nombre: "BioTrue", tipo: "Solucion multiusos", marca: "Bausch+Lomb", volumen: 300, stock: 20, precio: 310, caducidad: "2027-04-22" },
  { sku: "SOL-006", nombre: "Saline Plus", tipo: "Solucion salina", marca: "AMO", volumen: 360, stock: 15, precio: 120, caducidad: "2026-12-05" },
  { sku: "SOL-007", nombre: "Hylo-Comod", tipo: "Gotas lubricantes", marca: "Ursapharm", volumen: 10, stock: 0, precio: 380, caducidad: "2027-08-14" },
  { sku: "SOL-008", nombre: "Clear Care Plus", tipo: "Solucion peroxido", marca: "Alcon", volumen: 360, stock: 12, precio: 420, caducidad: "2027-03-20" },
]);

const solStats = computed(() => {
  const total = soluciones.value.reduce((s, l) => s + l.stock, 0);
  const porVencer = soluciones.value.filter(l => {
    const d = new Date(l.caducidad);
    const diff = (d - new Date()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 180;
  }).length;
  const agotado = soluciones.value.filter(l => l.stock === 0).length;
  const valor = soluciones.value.reduce((s, l) => s + l.precio * l.stock, 0);
  return { total, porVencer, agotado, valor };
});

/* ═══════════════════════════════════════════════════════════════════
   ACCESORIOS
   ═══════════════════════════════════════════════════════════════════ */
const accesorios = ref([
  { sku: "ACC-001", nombre: "Paño Microfibra Premium", categoria: "Paño", marca: "Zeiss", compatible: "Universal", stock: 120, precio: 45 },
  { sku: "ACC-002", nombre: "Cadena Metálica Dorada", categoria: "Cadena", marca: "Silac", compatible: "Armazones adulto", stock: 35, precio: 85 },
  { sku: "ACC-003", nombre: "Plaquetas Silicón (par)", categoria: "Plaquetas", marca: "Genérico", compatible: "Armazones metal", stock: 200, precio: 15 },
  { sku: "ACC-004", nombre: "Kit Tornillos Surtido", categoria: "Tornillos", marca: "Genérico", compatible: "Universal", stock: 50, precio: 60 },
  { sku: "ACC-005", nombre: "Spray Limpiador 60ml", categoria: "Limpiador", marca: "Zeiss", compatible: "Universal", stock: 65, precio: 120 },
  { sku: "ACC-006", nombre: "Cordón Deportivo Ajustable", categoria: "Cadena", marca: "Croakies", compatible: "Armazones deportivos", stock: 28, precio: 95 },
  { sku: "ACC-007", nombre: "Almohadillas Adhesivas (par)", categoria: "Almohadillas", marca: "Genérico", compatible: "Armazones acetato", stock: 0, precio: 25 },
  { sku: "ACC-008", nombre: "Destornillador Óptico 3-en-1", categoria: "Herramienta", marca: "OptiTool", compatible: "Universal", stock: 18, precio: 75 },
]);

const accStats = computed(() => {
  const total = accesorios.value.reduce((s, a) => s + a.stock, 0);
  const agotado = accesorios.value.filter(a => a.stock === 0).length;
  const categorias = new Set(accesorios.value.map(a => a.categoria)).size;
  const valor = accesorios.value.reduce((s, a) => s + a.precio * a.stock, 0);
  return { total, agotado, categorias, valor };
});

/* ═══════════════════════════════════════════════════════════════════
   ESTUCHES
   ═══════════════════════════════════════════════════════════════════ */
const estuches = ref([
  { sku: "EST-001", nombre: "Estuche Rígido Clásico", tipo: "Rigido", material: "Cuero sintético", color: "Negro", compatible: "Armazones completos", stock: 45, precio: 150 },
  { sku: "EST-002", nombre: "Estuche Magnético Premium", tipo: "Rigido", material: "PU Premium", color: "Café", compatible: "Armazones completos", stock: 20, precio: 280 },
  { sku: "EST-003", nombre: "Funda Blanda Microfibra", tipo: "Blando", material: "Microfibra", color: "Gris", compatible: "Universal", stock: 80, precio: 65 },
  { sku: "EST-004", nombre: "Estuche Plegable Viaje", tipo: "Plegable", material: "Nylon", color: "Azul marino", compatible: "Armazones medianos", stock: 15, precio: 120 },
  { sku: "EST-005", nombre: "Estuche Deportivo Flotante", tipo: "Deportivo", material: "EVA", color: "Neon Verde", compatible: "Armazones deportivos", stock: 10, precio: 180 },
  { sku: "EST-006", nombre: "Portalentes Contacto Doble", tipo: "Lentes de contacto", material: "Plástico", color: "Rosa", compatible: "Lentes de contacto", stock: 60, precio: 35 },
  { sku: "EST-007", nombre: "Kit Viaje LC Completo", tipo: "Lentes de contacto", material: "Plástico/Espejo", color: "Blanco", compatible: "Lentes de contacto", stock: 0, precio: 95 },
  { sku: "EST-008", nombre: "Estuche Infantil Animales", tipo: "Rigido", material: "Plástico ABS", color: "Multicolor", compatible: "Armazones infantiles", stock: 25, precio: 90 },
]);

const estStats = computed(() => {
  const total = estuches.value.reduce((s, e) => s + e.stock, 0);
  const agotado = estuches.value.filter(e => e.stock === 0).length;
  const tipos = new Set(estuches.value.map(e => e.tipo)).size;
  const valor = estuches.value.reduce((s, e) => s + e.precio * e.stock, 0);
  return { total, agotado, tipos, valor };
});

/* ═══════════════════════════════════════════════════════════════════
   EQUIPOS Y MAQUINARIA
   ═══════════════════════════════════════════════════════════════════ */
const equipos = ref([
  { sku: "EQP-001", nombre: "Autorefractómetro", tipo: "Diagnóstico", marca: "Topcon", modelo: "KR-800", serie: "TOP-2022-1041", estado: "Operativo", ubicacion: "Consultorio 1", adquisicion: "2022-06-15", mantenimiento: "2026-06-15" },
  { sku: "EQP-002", nombre: "Lámpara de Hendidura", tipo: "Diagnóstico", marca: "Haag-Streit", modelo: "BQ 900", serie: "HS-2021-5523", estado: "Operativo", ubicacion: "Consultorio 1", adquisicion: "2021-03-20", mantenimiento: "2026-03-20" },
  { sku: "EQP-003", nombre: "Lensómetro Digital", tipo: "Medición", marca: "Nidek", modelo: "LM-600PD", serie: "NDK-2023-0892", estado: "Operativo", ubicacion: "Taller", adquisicion: "2023-01-10", mantenimiento: "2026-07-10" },
  { sku: "EQP-004", nombre: "Biseladora Automática", tipo: "Taller", marca: "Essilor", modelo: "Kappa CTD", serie: "ESS-2020-3317", estado: "Mantenimiento", ubicacion: "Taller", adquisicion: "2020-09-01", mantenimiento: "2026-04-01" },
  { sku: "EQP-005", nombre: "Tonómetro de Aire", tipo: "Diagnóstico", marca: "Reichert", modelo: "7CR", serie: "RCH-2022-7841", estado: "Operativo", ubicacion: "Consultorio 2", adquisicion: "2022-11-05", mantenimiento: "2026-11-05" },
  { sku: "EQP-006", nombre: "Pupilómetro Digital", tipo: "Medición", marca: "Essilor", modelo: "Visioffice X", serie: "ESS-2023-4412", estado: "Operativo", ubicacion: "Mostrador", adquisicion: "2023-08-22", mantenimiento: "2026-08-22" },
  { sku: "EQP-007", nombre: "Queratómetro", tipo: "Diagnóstico", marca: "Topcon", modelo: "OM-4", serie: "TOP-2019-2203", estado: "Fuera de servicio", ubicacion: "Almacén", adquisicion: "2019-04-12", mantenimiento: "2025-10-12" },
  { sku: "EQP-008", nombre: "Perímetro Campimétrico", tipo: "Diagnóstico", marca: "Zeiss", modelo: "HFA III 860", serie: "ZSS-2024-0115", estado: "Operativo", ubicacion: "Consultorio 2", adquisicion: "2024-02-28", mantenimiento: "2027-02-28" },
]);

const eqpStats = computed(() => {
  const operativo = equipos.value.filter(e => e.estado === "Operativo").length;
  const mantto = equipos.value.filter(e => e.estado === "Mantenimiento").length;
  const fuera = equipos.value.filter(e => e.estado === "Fuera de servicio").length;
  const proxMantto = equipos.value.filter(e => {
    const d = new Date(e.mantenimiento);
    const diff = (d - new Date()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 90;
  }).length;
  return { operativo, mantto, fuera, proxMantto, totalEquipos: equipos.value.length };
});

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */
const fmt = (n) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 });

const estadoTag = (estado) => {
  const map = {
    "Disponible": "is-success", "Bajo stock": "is-warning", "Agotado": "is-danger",
    "Operativo": "is-success", "Mantenimiento": "is-warning", "Fuera de servicio": "is-danger"
  };
  return map[estado] || "is-info";
};

const tipoLcTag = (tipo) => {
  const map = { "Esferico": "is-info", "Torico": "is-primary", "Multifocal": "is-warning", "Colorido": "is-success" };
  return map[tipo] || "is-light";
};

const duracionTag = (d) => {
  const map = { "Diario": "is-info", "Quincenal": "is-primary", "Mensual": "is-warning", "Anual": "is-danger" };
  return map[d] || "is-light";
};

const tipoSolTag = (t) => {
  const map = { "Solucion multiusos": "is-primary", "Solucion salina": "is-info", "Gotas lubricantes": "is-success", "Solucion peroxido": "is-warning" };
  return map[t] || "is-light";
};

const caducidadClass = (fecha) => {
  const d = new Date(fecha);
  const diff = (d - new Date()) / (1000 * 60 * 60 * 24);
  if (diff <= 0) return "has-text-danger";
  if (diff <= 180) return "has-text-warning";
  return "";
};
</script>

<template>
  <section class="section optica-section" v-motion-fade-visible-once>

    <header class="page-section-header">
      <div>
        <span class="optica-pill">
          <b-icon icon="store" size="is-small" class="mr-1" />
          Inventario
        </span>
        <h2>Óptica — Inventario General</h2>
        <p class="psh-desc">Gestiona armazones, soluciones, accesorios, estuches, equipos y maquinaria.</p>

        <div class="psh-quick mt-3">
          <div class="psh-quick__card">
            <div class="psh-quick__icon"><i class="fas fa-glasses"></i></div>
            <div>
              <p class="psh-quick__title">Armazones</p>
              <p class="psh-quick__text">Stock, marcas y modelos disponibles</p>
            </div>
          </div>
          <div class="psh-quick__card">
            <div class="psh-quick__icon"><i class="fas fa-wrench"></i></div>
            <div>
              <p class="psh-quick__title">Equipos</p>
              <p class="psh-quick__text">Estado y próximos mantenimientos</p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div class="glass-wrapper">
      <b-tabs
        v-model="activeTab"
        type="is-toggle"
        class="optica-tabs"
        expanded
        :animated="false"
      >
        <!-- ═════════════════ TAB 1: ARMAZONES ═════════════════ -->
        <b-tab-item value="armazones" label="Armazones" icon="glasses">

          <div class="stat-row">
            <div class="stat-card glass-card">
              <span class="stat-label">Unidades totales</span>
              <span class="stat-value">{{ armazonesStats.total }}</span>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-label">Bajo stock</span>
              <span class="stat-value text-warning">{{ armazonesStats.bajo }}</span>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-label">Agotados</span>
              <span class="stat-value text-danger">{{ armazonesStats.agotado }}</span>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-label">Valor inventario</span>
              <span class="stat-value text-primary">{{ fmt(armazonesStats.valor) }}</span>
            </div>
          </div>

          <div class="table-glass glass-card">
            <b-table
              :data="armazones"
              :striped="true"
              :hoverable="true"
              :mobile-cards="true"
              default-sort="sku"
              paginated
              :per-page="8"
              pagination-simple
              pagination-size="is-small"
            >
              <b-table-column field="sku" label="SKU" sortable v-slot="{ row }">
                <span class="sku-mono">{{ row.sku }}</span>
              </b-table-column>
              <b-table-column field="marca" label="Marca" sortable v-slot="{ row }">
                <strong>{{ row.marca }}</strong>
              </b-table-column>
              <b-table-column field="modelo" label="Modelo" sortable v-slot="{ row }">
                {{ row.modelo }}
              </b-table-column>
              <b-table-column field="color" label="Color" v-slot="{ row }">
                {{ row.color }}
              </b-table-column>
              <b-table-column field="material" label="Material" sortable v-slot="{ row }">
                <b-tag type="is-light" size="is-small">{{ row.material }}</b-tag>
              </b-table-column>
              <b-table-column field="tipo" label="Tipo" sortable v-slot="{ row }">
                {{ row.tipo }}
              </b-table-column>
              <b-table-column field="genero" label="Genero" sortable v-slot="{ row }">
                {{ row.genero }}
              </b-table-column>
              <b-table-column field="talla" label="Talla" v-slot="{ row }">
                <span class="sku-mono">{{ row.talla }}</span>
              </b-table-column>
              <b-table-column field="serie" label="Serie" v-slot="{ row }">
                <span class="sku-mono">{{ row.serie }}</span>
              </b-table-column>
              <b-table-column field="precio" label="Precio" sortable numeric v-slot="{ row }">
                {{ fmt(row.precio) }}
              </b-table-column>
              <b-table-column field="stock" label="Stock" sortable numeric v-slot="{ row }">
                <strong :class="row.stock === 0 ? 'has-text-danger' : row.stock <= 3 ? 'has-text-warning' : ''">
                  {{ row.stock }}
                </strong>
              </b-table-column>
              <b-table-column field="estuche" label="Estuche" centered v-slot="{ row }">
                <b-icon :icon="row.estuche ? 'check-circle' : 'times-circle'" :type="row.estuche ? 'is-success' : 'is-light'" size="is-small" />
              </b-table-column>
              <b-table-column field="estado" label="Estado" sortable v-slot="{ row }">
                <b-tag :type="estadoTag(row.estado)" size="is-small">{{ row.estado }}</b-tag>
              </b-table-column>
            </b-table>
          </div>
        </b-tab-item>

        <!-- ═════════════════ TAB 2: LENTES DE CONTACTO ═════════════════ -->
        <b-tab-item value="lentes" label="Lentes de Contacto" icon="eye">

          <div class="stat-row">
            <div class="stat-card glass-card">
              <span class="stat-label">Cajas totales</span>
              <span class="stat-value">{{ lcStats.total }}</span>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-label">Proximos a vencer</span>
              <span class="stat-value text-warning">{{ lcStats.porVencer }}</span>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-label">Agotados</span>
              <span class="stat-value text-danger">{{ lcStats.agotado }}</span>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-label">Valor inventario</span>
              <span class="stat-value text-primary">{{ fmt(lcStats.valor) }}</span>
            </div>
          </div>

          <div class="table-glass glass-card">
            <b-table
              :data="lentesContacto"
              :striped="true"
              :hoverable="true"
              :mobile-cards="true"
              default-sort="sku"
              paginated
              :per-page="8"
              pagination-simple
              pagination-size="is-small"
            >
              <b-table-column field="sku" label="SKU" sortable v-slot="{ row }">
                <span class="sku-mono">{{ row.sku }}</span>
              </b-table-column>
              <b-table-column field="marca" label="Marca" sortable v-slot="{ row }">
                <strong>{{ row.marca }}</strong>
              </b-table-column>
              <b-table-column field="nombre" label="Producto" sortable v-slot="{ row }">
                {{ row.nombre }}
              </b-table-column>
              <b-table-column field="tipo" label="Tipo" sortable v-slot="{ row }">
                <b-tag :type="tipoLcTag(row.tipo)" size="is-small">{{ row.tipo }}</b-tag>
              </b-table-column>
              <b-table-column field="material" label="Material" v-slot="{ row }">
                <b-tag type="is-light" size="is-small">{{ row.material }}</b-tag>
              </b-table-column>
              <b-table-column field="bc" label="BC" numeric v-slot="{ row }">
                {{ row.bc }}
              </b-table-column>
              <b-table-column field="dia" label="DIA" numeric v-slot="{ row }">
                {{ row.dia }}
              </b-table-column>
              <b-table-column field="graduacion" label="Graduacion" v-slot="{ row }">
                <span class="sku-mono">{{ row.graduacion }}</span>
              </b-table-column>
              <b-table-column field="duracion" label="Duracion" sortable v-slot="{ row }">
                <b-tag :type="duracionTag(row.duracion)" size="is-small">{{ row.duracion }}</b-tag>
              </b-table-column>
              <b-table-column field="stock" label="Stock" sortable numeric v-slot="{ row }">
                <strong :class="row.stock === 0 ? 'has-text-danger' : row.stock <= 10 ? 'has-text-warning' : ''">
                  {{ row.stock }}
                </strong>
              </b-table-column>
              <b-table-column field="precio" label="Precio" sortable numeric v-slot="{ row }">
                {{ fmt(row.precio) }}
              </b-table-column>
              <b-table-column field="caducidad" label="Caducidad" sortable v-slot="{ row }">
                <span :class="caducidadClass(row.caducidad)">{{ row.caducidad }}</span>
              </b-table-column>
            </b-table>
          </div>
        </b-tab-item>

        <!-- ═════════════════ TAB 3: SOLUCIONES Y GOTAS ═════════════════ -->
        <b-tab-item value="soluciones" label="Soluciones y Gotas" icon="tint">

          <div class="stat-row">
            <div class="stat-card glass-card">
              <span class="stat-label">Unidades totales</span>
              <span class="stat-value">{{ solStats.total }}</span>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-label">Proximos a vencer</span>
              <span class="stat-value text-warning">{{ solStats.porVencer }}</span>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-label">Agotados</span>
              <span class="stat-value text-danger">{{ solStats.agotado }}</span>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-label">Valor inventario</span>
              <span class="stat-value text-primary">{{ fmt(solStats.valor) }}</span>
            </div>
          </div>

          <div class="table-glass glass-card">
            <b-table
              :data="soluciones"
              :striped="true"
              :hoverable="true"
              :mobile-cards="true"
              default-sort="sku"
              paginated
              :per-page="8"
              pagination-simple
              pagination-size="is-small"
            >
              <b-table-column field="sku" label="SKU" sortable v-slot="{ row }">
                <span class="sku-mono">{{ row.sku }}</span>
              </b-table-column>
              <b-table-column field="nombre" label="Producto" sortable v-slot="{ row }">
                <strong>{{ row.nombre }}</strong>
              </b-table-column>
              <b-table-column field="tipo" label="Tipo" sortable v-slot="{ row }">
                <b-tag :type="tipoSolTag(row.tipo)" size="is-small">{{ row.tipo }}</b-tag>
              </b-table-column>
              <b-table-column field="marca" label="Marca" sortable v-slot="{ row }">
                {{ row.marca }}
              </b-table-column>
              <b-table-column field="volumen" label="Volumen" sortable numeric v-slot="{ row }">
                {{ row.volumen }} ml
              </b-table-column>
              <b-table-column field="stock" label="Stock" sortable numeric v-slot="{ row }">
                <strong :class="row.stock === 0 ? 'has-text-danger' : row.stock <= 10 ? 'has-text-warning' : ''">
                  {{ row.stock }}
                </strong>
              </b-table-column>
              <b-table-column field="precio" label="Precio" sortable numeric v-slot="{ row }">
                {{ fmt(row.precio) }}
              </b-table-column>
              <b-table-column field="caducidad" label="Caducidad" sortable v-slot="{ row }">
                <span :class="caducidadClass(row.caducidad)">{{ row.caducidad }}</span>
              </b-table-column>
            </b-table>
          </div>
        </b-tab-item>

        <!-- ═════════════════ TAB 4: ACCESORIOS ═════════════════ -->
        <b-tab-item value="accesorios" label="Accesorios" icon="puzzle-piece">

          <div class="stat-row">
            <div class="stat-card glass-card">
              <span class="stat-label">Piezas totales</span>
              <span class="stat-value">{{ accStats.total }}</span>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-label">Categorias</span>
              <span class="stat-value">{{ accStats.categorias }}</span>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-label">Agotados</span>
              <span class="stat-value text-danger">{{ accStats.agotado }}</span>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-label">Valor inventario</span>
              <span class="stat-value text-primary">{{ fmt(accStats.valor) }}</span>
            </div>
          </div>

          <div class="table-glass glass-card">
            <b-table
              :data="accesorios"
              :striped="true"
              :hoverable="true"
              :mobile-cards="true"
              default-sort="sku"
              paginated
              :per-page="8"
              pagination-simple
              pagination-size="is-small"
            >
              <b-table-column field="sku" label="SKU" sortable v-slot="{ row }">
                <span class="sku-mono">{{ row.sku }}</span>
              </b-table-column>
              <b-table-column field="nombre" label="Producto" sortable v-slot="{ row }">
                <strong>{{ row.nombre }}</strong>
              </b-table-column>
              <b-table-column field="categoria" label="Categoria" sortable v-slot="{ row }">
                <b-tag type="is-info" size="is-small">{{ row.categoria }}</b-tag>
              </b-table-column>
              <b-table-column field="marca" label="Marca" sortable v-slot="{ row }">
                {{ row.marca }}
              </b-table-column>
              <b-table-column field="compatible" label="Compatible con" v-slot="{ row }">
                {{ row.compatible }}
              </b-table-column>
              <b-table-column field="stock" label="Stock" sortable numeric v-slot="{ row }">
                <strong :class="row.stock === 0 ? 'has-text-danger' : row.stock <= 10 ? 'has-text-warning' : ''">
                  {{ row.stock }}
                </strong>
              </b-table-column>
              <b-table-column field="precio" label="Precio" sortable numeric v-slot="{ row }">
                {{ fmt(row.precio) }}
              </b-table-column>
            </b-table>
          </div>
        </b-tab-item>

        <!-- ═════════════════ TAB 5: ESTUCHES ═════════════════ -->
        <b-tab-item value="estuches" label="Estuches" icon="briefcase">

          <div class="stat-row">
            <div class="stat-card glass-card">
              <span class="stat-label">Unidades totales</span>
              <span class="stat-value">{{ estStats.total }}</span>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-label">Tipos</span>
              <span class="stat-value">{{ estStats.tipos }}</span>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-label">Agotados</span>
              <span class="stat-value text-danger">{{ estStats.agotado }}</span>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-label">Valor inventario</span>
              <span class="stat-value text-primary">{{ fmt(estStats.valor) }}</span>
            </div>
          </div>

          <div class="table-glass glass-card">
            <b-table
              :data="estuches"
              :striped="true"
              :hoverable="true"
              :mobile-cards="true"
              default-sort="sku"
              paginated
              :per-page="8"
              pagination-simple
              pagination-size="is-small"
            >
              <b-table-column field="sku" label="SKU" sortable v-slot="{ row }">
                <span class="sku-mono">{{ row.sku }}</span>
              </b-table-column>
              <b-table-column field="nombre" label="Producto" sortable v-slot="{ row }">
                <strong>{{ row.nombre }}</strong>
              </b-table-column>
              <b-table-column field="tipo" label="Tipo" sortable v-slot="{ row }">
                <b-tag type="is-primary" size="is-small">{{ row.tipo }}</b-tag>
              </b-table-column>
              <b-table-column field="material" label="Material" v-slot="{ row }">
                <b-tag type="is-light" size="is-small">{{ row.material }}</b-tag>
              </b-table-column>
              <b-table-column field="color" label="Color" v-slot="{ row }">
                {{ row.color }}
              </b-table-column>
              <b-table-column field="compatible" label="Compatible con" v-slot="{ row }">
                {{ row.compatible }}
              </b-table-column>
              <b-table-column field="stock" label="Stock" sortable numeric v-slot="{ row }">
                <strong :class="row.stock === 0 ? 'has-text-danger' : row.stock <= 5 ? 'has-text-warning' : ''">
                  {{ row.stock }}
                </strong>
              </b-table-column>
              <b-table-column field="precio" label="Precio" sortable numeric v-slot="{ row }">
                {{ fmt(row.precio) }}
              </b-table-column>
            </b-table>
          </div>
        </b-tab-item>

        <!-- ═════════════════ TAB 6: EQUIPOS Y MAQUINARIA ═════════════════ -->
        <b-tab-item value="equipos" label="Equipos" icon="cogs">

          <div class="stat-row">
            <div class="stat-card glass-card">
              <span class="stat-label">Total equipos</span>
              <span class="stat-value">{{ eqpStats.totalEquipos }}</span>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-label">Operativos</span>
              <span class="stat-value text-success">{{ eqpStats.operativo }}</span>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-label">En mantenimiento</span>
              <span class="stat-value text-warning">{{ eqpStats.mantto }}</span>
            </div>
            <div class="stat-card glass-card">
              <span class="stat-label">Mantto. proximo (&lt;90d)</span>
              <span class="stat-value text-danger">{{ eqpStats.proxMantto }}</span>
            </div>
          </div>

          <div class="table-glass glass-card">
            <b-table
              :data="equipos"
              :striped="true"
              :hoverable="true"
              :mobile-cards="true"
              default-sort="nombre"
              paginated
              :per-page="8"
              pagination-simple
              pagination-size="is-small"
            >
              <b-table-column field="sku" label="SKU" sortable v-slot="{ row }">
                <span class="sku-mono">{{ row.sku }}</span>
              </b-table-column>
              <b-table-column field="nombre" label="Equipo" sortable v-slot="{ row }">
                <strong>{{ row.nombre }}</strong>
              </b-table-column>
              <b-table-column field="tipo" label="Area" sortable v-slot="{ row }">
                <b-tag type="is-info" size="is-small">{{ row.tipo }}</b-tag>
              </b-table-column>
              <b-table-column field="marca" label="Marca" sortable v-slot="{ row }">
                {{ row.marca }}
              </b-table-column>
              <b-table-column field="modelo" label="Modelo" v-slot="{ row }">
                {{ row.modelo }}
              </b-table-column>
              <b-table-column field="serie" label="Serie" v-slot="{ row }">
                <span class="sku-mono">{{ row.serie }}</span>
              </b-table-column>
              <b-table-column field="ubicacion" label="Ubicacion" sortable v-slot="{ row }">
                {{ row.ubicacion }}
              </b-table-column>
              <b-table-column field="estado" label="Estado" sortable v-slot="{ row }">
                <b-tag :type="estadoTag(row.estado)" size="is-small">{{ row.estado }}</b-tag>
              </b-table-column>
              <b-table-column field="adquisicion" label="Adquisicion" sortable v-slot="{ row }">
                {{ row.adquisicion }}
              </b-table-column>
              <b-table-column field="mantenimiento" label="Prox. Mantto." sortable v-slot="{ row }">
                <span :class="caducidadClass(row.mantenimiento)">{{ row.mantenimiento }}</span>
              </b-table-column>
            </b-table>
          </div>
        </b-tab-item>

      </b-tabs>
    </div>
  </section>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════
   LAYOUT
   ═══════════════════════════════════════════════════════════════════ */
.optica-section {
  padding: 1.5rem;
}

.optica-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--c-primary);
  background: var(--c-primary-alpha);
  padding: 0.2rem 0.45rem;
  border-radius: var(--radius-pill);
  margin-bottom: 0.35rem;
}

/* ═══════════════════════════════════════════════════════════════════
   GLASSMORPHISM BASE
   ═══════════════════════════════════════════════════════════════════ */
.glass-wrapper {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  -webkit-backdrop-filter: blur(var(--fx-blur));
  backdrop-filter: blur(var(--fx-blur));
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  padding: 0.75rem;
}

.glass-card {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background: var(--surface-raised);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}

/* ═══════════════════════════════════════════════════════════════════
   TABS STYLING
   ═══════════════════════════════════════════════════════════════════ */
.optica-tabs :deep(.tabs) {
  margin-bottom: 1rem;
}

.optica-tabs :deep(.tabs ul) {
  border-bottom: none;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.optica-tabs :deep(.tabs a) {
  border-radius: var(--radius-md) !important;
  font-weight: 700;
  font-size: 0.82rem;
  color: var(--text-secondary);
  border-color: var(--border) !important;
  background: var(--surface-raised);
  transition: all 180ms ease;
}

.optica-tabs :deep(.tabs li.is-active a) {
  background: linear-gradient(135deg, rgba(144, 111, 225, 0.18), rgba(236, 72, 153, 0.10));
  border-color: rgba(144, 111, 225, 0.35) !important;
  color: var(--c-primary);
}

.optica-tabs :deep(.tab-content) {
  padding: 0 !important;
}

/* ═══════════════════════════════════════════════════════════════════
   STAT CARDS ROW
   ═══════════════════════════════════════════════════════════════════ */
.stat-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
  margin-top: 0.5rem;
}

.stat-card {
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  font-weight: 600;
}

.stat-value {
  font-size: 1.55rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.1;
  font-family: "Switzer", sans-serif;
}

.stat-value.text-primary { color: var(--c-primary); }
.stat-value.text-warning { color: var(--c-warning); }
.stat-value.text-danger  { color: var(--c-danger); }
.stat-value.text-success { color: var(--c-success); }

/* ═══════════════════════════════════════════════════════════════════
   TABLE GLASS CONTAINER
   ═══════════════════════════════════════════════════════════════════ */
.table-glass {
  padding: 0.6rem;
  overflow-x: auto;
}

.table-glass :deep(table) {
  background: transparent !important;
  color: var(--text-primary);
}

.table-glass :deep(thead th) {
  background: transparent !important;
  color: var(--text-muted) !important;
  border-bottom: 1px solid var(--border) !important;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
  white-space: nowrap;
}

.table-glass :deep(tbody tr) {
  background: transparent !important;
  transition: background 120ms ease;
}

.table-glass :deep(tbody tr:hover) {
  background: var(--c-primary-alpha) !important;
}

.table-glass :deep(tbody td) {
  border-bottom: 1px solid var(--border-light) !important;
  color: var(--text-primary);
  vertical-align: middle;
  font-size: 0.85rem;
}

.table-glass :deep(.is-striped tbody tr:nth-child(even)) {
  background: rgba(148, 163, 184, 0.04) !important;
}

/* Pagination */
.table-glass :deep(.pagination-link),
.table-glass :deep(.pagination-previous),
.table-glass :deep(.pagination-next) {
  background: var(--surface-raised);
  border-color: var(--border);
  color: var(--text-secondary);
}

.table-glass :deep(.pagination-link.is-current) {
  background: var(--c-primary);
  border-color: var(--c-primary);
  color: var(--text-on-primary);
}

/* ═══════════════════════════════════════════════════════════════════
   MONOSPACE SKUs
   ═══════════════════════════════════════════════════════════════════ */
.sku-mono {
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
  font-size: 0.78rem;
  letter-spacing: -0.02em;
  color: var(--text-secondary);
}

/* ═══════════════════════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════════════════════ */
@media (max-width: 768px) {
  .stat-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .stat-value {
    font-size: 1.2rem;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   REDUCED MOTION
   ═══════════════════════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .optica-tabs :deep(.tabs a),
  .table-glass :deep(tbody tr) {
    transition: none !important;
  }
}
</style>

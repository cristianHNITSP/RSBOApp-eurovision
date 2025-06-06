<template>
    <section class="section-matriz-dioptrias" v-motion-fade-visible-once>
        <div class="columns is-multiline">
            <div class="column is-12">
                <div class="is-flex is-justify-content-space-between is-align-items-center mb-4">
                    <h1 class="title is-4">Inventario</h1>
                </div>

                <!-- Tabs para seleccionar planilla -->
                <b-tabs v-model="activeSheet" type="is-boxed" size="is-small" expanded class="is-small-tabs">
                    <b-tab-item label="Inventario" icon="database" value="inventario" />
                    <b-tab-item label="Ventas" icon="cash-register" value="ventas" />
                    <b-tab-item label="Proveedores" icon="truck" value="proveedores" />
                    <b-tab-item label="Nueva Planilla" icon="plus" value="nueva" />
                    <b-tab-item v-for="planilla in dynamicSheets" :key="planilla.id" :label="planilla.name"
                        :value="planilla.id" />
                </b-tabs>

                <div class="revo-grid-container" style="position: relative; min-height: 450px; margin-top: 1rem;">
                    <!-- Skeleton loader SOLO para inventario -->
                    <table v-if="loading && activeSheet !== 'nueva'" class="table is-fullwidth is-striped is-hoverable"
                        aria-busy="true">
                        <thead>
                            <tr>
                                <th v-for="col in currentColumns" :key="col.prop">
                                    <div class="skeleton" style="width: 80%; height: 1em;"></div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="n in 5" :key="n">
                                <td v-for="col in currentColumns" :key="col.prop + n">
                                    <div class="skeleton" style="width: 100%; height: 1.2em;"></div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- Formulario para nueva planilla -->
                    <form v-if="activeSheet === 'nueva'" @submit.prevent="crearNuevaPlanilla" class="box">
                        <b-field label="Nombre de la nueva planilla" required>
                            <b-input v-model="newSheetName" placeholder="Ej: Productos Nuevos" required />
                        </b-field>

                        <b-field label="Columnas (nombres separados por coma)" required>
                            <b-input v-model="newSheetColumns" placeholder="Ej: ID, Producto, Cantidad, Precio"
                                required />
                        </b-field>

                        <b-button type="is-primary" native-type="submit" :loading="creatingSheet">Crear
                            Planilla</b-button>
                    </form>

                    <!-- RevoGrid para todas las demás planillas -->
                    <revoGrid v-if="!loading && activeSheet !== 'nueva'" :columns="currentColumns" :source="currentData"
                        :readonly="false" @beforeedit="onBeforeEdit" @afteredit="onAfterEdit" theme="compact"
                        columnResize="true" resize="true" filter="true" style="width: 100%; height: 450px;" />
                </div>
            </div>
        </div>
    </section>
</template>

<script>
import { ref, reactive, computed, watch } from "vue";

export default {
    name: "InventarioDemo",
    setup() {
        const activeSheet = ref("inventario");
        const loading = ref(false);

        // Ejemplo con inventarioColumns
        const inventarioColumns = [
            { prop: "id", name: "ID", width: 80, readonly: true, filter: 'number', sortable: true },
            { prop: "producto", name: "Producto", width: 250, editable: true, filter: 'text', sortable: true },
            { prop: "categoria", name: "Categoría", width: 150, editable: true, filter: 'text', sortable: true },
            { prop: "cantidad", name: "Cantidad", width: 120, editable: true, filter: 'number', sortable: true },
            { prop: "precio", name: "Precio", width: 150, editable: true, filter: 'number', sortable: true },
            { prop: "total", name: "Total", width: 150, readonly: true, filter: 'number', sortable: true },
        ];


        const inventarioDataOriginal = [
            { id: 1, producto: "Lente", categoria: "Óptica", cantidad: 50, precio: 20, total: 1000 },
            { id: 2, producto: "Montura", categoria: "Óptica", cantidad: 15, precio: 80, total: 1200 },
        ];
        const inventarioData = ref([]);

        const ventasColumns = [
            { prop: "id", name: "ID", width: 80, readonly: true, filter: 'number', sortable: true },
            { prop: "cliente", name: "Cliente", width: 250, editable: true, filter: 'text', sortable: true },
            { prop: "producto", name: "Producto", width: 200, editable: true, filter: 'text', sortable: true },
            { prop: "cantidad", name: "Cantidad", width: 120, editable: true, filter: 'number', sortable: true },
            { prop: "precio", name: "Precio", width: 150, editable: true, filter: 'number', sortable: true },
            { prop: "total", name: "Total", width: 150, readonly: true, filter: 'number', sortable: true },
        ];

        const ventasDataOriginal = [
            { id: 1, cliente: "Juan Pérez", producto: "Lente", cantidad: 2, precio: 20, total: 40 },
        ];
        const ventasData = ref([]);

        const proveedoresColumns = [
            { prop: "id", name: "ID", width: 80, readonly: true, filter: 'number', sortable: true },
            { prop: "nombre", name: "Proveedor", width: 250, editable: true, filter: 'text', sortable: true },
            { prop: "categoria", name: "Categoría", width: 150, editable: true, filter: 'text', sortable: true },
            { prop: "contacto", name: "Contacto", width: 200, editable: true, filter: 'text', sortable: true },
        ];

        const proveedoresDataOriginal = [
            { id: 1, nombre: "Optica S.A.", categoria: "Óptica", contacto: "optica@example.com" },
        ];
        const proveedoresData = ref([]);

        const dynamicSheets = reactive([]);
        const newSheetName = ref("");
        const newSheetColumns = ref("");
        const creatingSheet = ref(false);

        const cargarPlanilla = async (sheetId) => {
            loading.value = true;
            await new Promise((resolve) => setTimeout(resolve, 800));

            if (sheetId === "inventario") {
                inventarioData.value = JSON.parse(JSON.stringify(inventarioDataOriginal));
            } else if (sheetId === "ventas") {
                ventasData.value = JSON.parse(JSON.stringify(ventasDataOriginal));
            } else if (sheetId === "proveedores") {
                proveedoresData.value = JSON.parse(JSON.stringify(proveedoresDataOriginal));
            }

            loading.value = false;
        };

        watch(
            activeSheet,
            (newVal) => {
                if (newVal !== "nueva") {
                    cargarPlanilla(newVal);
                }
            },
            { immediate: true }
        );

        const currentColumns = computed(() => {
            if (activeSheet.value === "inventario") return inventarioColumns;
            if (activeSheet.value === "ventas") return ventasColumns;
            if (activeSheet.value === "proveedores") return proveedoresColumns;

            const sheet = dynamicSheets.find((s) => s.id === activeSheet.value);
            return sheet ? sheet.columns : [];
        });

        const currentData = computed(() => {
            if (activeSheet.value === "inventario") return inventarioData.value;
            if (activeSheet.value === "ventas") return ventasData.value;
            if (activeSheet.value === "proveedores") return proveedoresData.value;

            const sheet = dynamicSheets.find((s) => s.id === activeSheet.value);
            return sheet ? sheet.data : [];
        });

        const crearNuevaPlanilla = () => {
            if (!newSheetName.value.trim() || !newSheetColumns.value.trim()) return;
            creatingSheet.value = true;

            const cols = newSheetColumns.value
                .split(",")
                .map((c) => c.trim())
                .filter((c) => c.length > 0)
                .map((name, idx) => ({
                    prop: `col_${idx + 1}`,
                    name,
                    width: 150,
                    editable: true,
                }));

            const id = `dyn_${Date.now()}`;
            dynamicSheets.push({
                id,
                name: newSheetName.value.trim(),
                columns: cols,
                data: [],
            });

            newSheetName.value = "";
            newSheetColumns.value = "";
            activeSheet.value = id;
            creatingSheet.value = false;
        };

        const onBeforeEdit = (e) => {
            // Validaciones opcionales
        };

        const onAfterEdit = (e) => {
            const { row, column, newValue } = e;

            if (activeSheet.value === "inventario") {
                inventarioData.value[row][column] = newValue;
                if (column === "cantidad" || column === "precio") {
                    const item = inventarioData.value[row];
                    item.total = item.cantidad * item.precio;
                }
            } else if (activeSheet.value === "ventas") {
                ventasData.value[row][column] = newValue;
                if (column === "cantidad" || column === "precio") {
                    const item = ventasData.value[row];
                    item.total = item.cantidad * item.precio;
                }
            } else if (activeSheet.value === "proveedores") {
                proveedoresData.value[row][column] = newValue;
            } else {
                const sheet = dynamicSheets.find((s) => s.id === activeSheet.value);
                if (sheet) {
                    if (!sheet.data[row]) sheet.data[row] = {};
                    sheet.data[row][column] = newValue;
                }
            }
        };

        return {
            activeSheet,
            loading,
            inventarioColumns,
            inventarioData,
            ventasColumns,
            ventasData,
            proveedoresColumns,
            proveedoresData,
            dynamicSheets,
            newSheetName,
            newSheetColumns,
            crearNuevaPlanilla,
            creatingSheet,
            currentColumns,
            currentData,
            onBeforeEdit,
            onAfterEdit,
        };
    },
};
</script>

<style scoped>
.section-matriz-dioptrias {
    border-bottom: 1px solid #ccc;
    border-radius: 8px;
    padding: 1.5rem;
    background-color: white;
 
}

.revo-grid-container {
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e0e0e0;
}

.skeleton {
    background: #e0e0e0;
    border-radius: 4px;
    animation: pulse 1.5s infinite ease-in-out;
}

@keyframes pulse {
    0% {
        opacity: 1;
    }

    50% {
        opacity: 0.4;
    }

    100% {
        opacity: 1;
    }
}

</style>
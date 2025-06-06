<template>
    <section class="section section-matriz-dioptrias" ref="motionRef2">
        <div class="columns is-multiline">
            <div class="column is-12">

                <!-- Header -->
                <div class="is-flex is-justify-content-space-between is-align-items-center mb-4">
                    <!--      <div class="is-flex is-justify-content-space-between is-align-items-center mb-4">
                        <h1 class="title is-4">Inventario</h1>
                    </div> -->

                </div>

                <!-- Tabs -->
                <b-tabs v-model="activeSheet" type="is-boxed" size="is-small" expanded class="mb-2"
                    @input="onTabChange">
                    <b-tab-item label="Antirreflejo" value="antirreflejo" />
                    <b-tab-item label="Fotocromático" value="fotocromatico" />
                    <b-tab-item label="Tinte Gris" value="tintegris" />
                    <b-tab-item label="+ Agregar" value="nueva" />
                    <b-tab-item v-for="planilla in dynamicSheets" :key="planilla.id" :label="planilla.name"
                        :value="planilla.id" />
                </b-tabs>

                <!-- Contenedor del contenido -->
                <div class="box plantillas-contenedor"
                    style="position: relative; height: 450px; display: flex; flex-direction: column;">

                    <!-- Botones superiores
                    <div
                        class="buttons-responsive-actions is-flex is-align-items-center is-justify-content-flex-start is-flex-wrap-wrap mb-3">
                        <b-tooltip label="Exportar la planilla actual" position="is-top" append-to-body>
                            <b-button icon-left="download" type="is-light" class=" mr-2 mb-2" @click="exportarPlanilla"
                                size="is-small">
                                Exportar
                            </b-button>
                        </b-tooltip>

                        <b-tooltip label="Duplicar planilla actual" position="is-top" append-to-body>
                            <b-button icon-left="copy" type="is-light" class=" mr-2 mb-2" @click="duplicarPlanilla"
                                size="is-small" :disabled="!activeSheet || activeSheet === 'nueva'">
                                Duplicar
                            </b-button>
                        </b-tooltip>

                        <b-tooltip label="Eliminar planilla actual" position="is-top" append-to-body>
                            <b-button icon-left="trash-can" type="is-danger" class=" mb-2" @click="confirmarEliminacion"
                                size="is-small" :disabled="!activeSheet || esPlanillaBase">
                                Eliminar
                            </b-button>
                        </b-tooltip>
                    </div>
                    -->

                    <!-- Skeleton loader -->
                    <table v-if="loading && activeSheet !== 'nueva'" class="table is-fullwidth is-striped is-hoverable"
                        aria-busy="true" style="width: 100%; height: 100%; table-layout: fixed;">
                        <thead>
                            <tr>
                                <th v-for="col in currentColumns" :key="String(col.field)">
                                    <div class="skeleton" style="width: 80%; height: 1.5em;"></div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="n in 5" :key="`row-${n}`">
                                <td v-for="col in currentColumns" :key="`skeleton-${n}-${String(col.field)}`">
                                    <div class="skeleton" style="width: 100%; height: 1.2em;"></div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- Form nueva planilla -->
                    <form v-if="activeSheet === 'nueva'" @submit.prevent="crearNuevaPlanilla">
                        <b-field label="Selecciona uno o más tratamientos" required>
                            <div class="control">
                                <div class="columns is-multiline is-mobile"
                                    style="max-height: 150px; overflow-y: auto;">
                                    <div class="column is-4" v-for="tratamiento in tratamientosDisponibles"
                                        :key="tratamiento">
                                        <b-checkbox v-model="selectedTratamientos" size="is-small"
                                            :native-value="tratamiento" type="is-primary">
                                            {{ tratamiento }}
                                        </b-checkbox>
                                    </div>
                                </div>
                            </div>
                        </b-field>

                        <transition-group name="tag-list" tag="div" class="tags mb-3">
                            <span v-for="(tag, index) in selectedTratamientos" :key="tag"
                                class="tag is-info is-light is-rounded">
                                {{ tag }}
                                <button class="delete is-small" @click.prevent="removeTratamiento(index)"
                                    aria-label="Eliminar tratamiento" />
                            </span>
                        </transition-group>

                        <b-field label="Nombre generado automáticamente">
                            <b-input v-model="newSheetName" disabled expanded />
                        </b-field>

                        <b-button type="is-primary" native-type="submit"
                            :disabled="selectedTratamientos.length === 0 || creatingSheet" :loading="creatingSheet">
                            Crear Planilla
                        </b-button>
                    </form>

                    <!-- AG Grid bloque contenedor -->
                    <div v-if="currentColumns.length && currentData.length" class="buefy-balham-light"
                        style="flex: 1 1 auto; display: flex; flex-direction: column; overflow: auto;">



                        <!-- AG Grid en sí -->
                        <div style="flex: 1 1 auto; overflow: auto;">
                            <AgGridVue :theme="theme" :columnDefs="currentColumns" ref="gridRef" :rowData="currentData"
                                :defaultColDef="defaultColDef" :animateRows="true" :stopEditingWhenCellsLoseFocus="true"
                                :enableCellTextSelection="true" :columnHoverHighlight="true" 

                                 :suppressDragLeaveHidesColumns="true"
 

                                :headerHoverHighlight="true" @cellValueChanged="onAfterEdit"
                                @cellEditingStarted="onCellEditingStarted" :onCellClicked="onCellClicked"
                                @cellMouseDown="onCellMouseDown" @cellMouseOver="onCellMouseOver"
                                @cellMouseUp="onCellMouseUp" @cell-touch-start="onCellTouchStart"
                                @cell-touch-move="onCellTouchMove" @cell-touch-end="onCellTouchEnd"
                                :localeText="localeText" :enableBrowserTooltips="true"
                                style="width: 100%; height: 100%;" />
                        </div>

                    </div>

                </div>



            </div>
        </div>

    </section>

    <transition name="fade">
        <div v-if="menuVisible" ref="tooltipMenu" class="box p-3 is-size-7 has-background-white"
            :class="['has-shadow', { 'is-max-desktop': true }]" :style="{
                position: 'fixed',
                top: `${menuPosition.y}px`,
                left: `${menuPosition.x}px`,
                maxWidth: screenIsMobile ? '300px' : '550px',
                zIndex: 1,
            }">
            <header class="is-flex is-justify-content-space-between mb-2 pb-2 has-border-bottom">
                <span class="has-text-weight-semibold">Resumen de Selección</span>
                <button class="delete is-small" @click="menuVisible = false"></button>
            </header>

            <!-- Nada seleccionado -->
            <div v-if="Object.keys(selectionSummary).length === 0">
                <p class="has-text-grey-light">No hay datos seleccionados.</p>
            </div>

            <!-- Varias celdas -->
            <template v-else-if="Array.isArray(selectionSummary.cilindricas)">
                <div class="mb-1">
                    <span class="has-text-weight-semibold mr-2">🔵 Cilíndrica:</span>
                    <span>
                        <b-tag v-for="cil in selectionSummary.cilindricas" :key="cil" type="is-primary is-light"
                            class="mr-1 mt-1">
                            {{ cil }}
                        </b-tag>
                    </span>
                </div>

                <div class="mb-1">
                    <span class="has-text-weight-semibold mr-2">🔵 Esférica:</span>
                    <span>
                        <b-tag v-for="esf in selectionSummary.esfericas" :key="esf" type="is-info is-light"
                            class="mr-1 mt-1">
                            {{ esf }}
                        </b-tag>
                    </span>
                </div>
            </template>



            <!-- Una sola celda válida -->
            <template v-else>
                <div v-for="(esfericas, cil) in filteredSummary" :key="cil" class="mb-2 pl-2"
                    style="border-left: 3px solid #00d1b2">
                    <template v-for="(existencias, esf) in esfericas" :key="esf">
                        <p class="has-text-weight-semibold mb-0">
                            🔵 Cilíndrica {{ formatCil(cil) }}
                        </p>
                        <p class="mb-0">
                            🔵 Esférica {{ formatNumber(esf) }} — {{ existencias }} existencias
                        </p>
                    </template>
                </div>
            </template>


        </div>
    </transition>

</template>

<script>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick, onUnmounted } from 'vue';
import { useMotionEffects } from '../../composables/useMotionEffects';
import { AgGridVue } from "ag-grid-vue3";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { themeQuartz, iconSetQuartzBold, colorSchemeLight } from 'ag-grid-community';

// to use myTheme in an application, pass it to the theme grid option
const themeCustom = themeQuartz
    .withPart(iconSetQuartzBold, colorSchemeLight)
    .withParams({
        accentColor: "#7957D5",
        backgroundColor: "#FFFFFF",
        borderColor: "#00000026",
        borderRadius: 8,
        browserColorScheme: "light",
        columnBorder: true,
        fontFamily: "Satoshi",
        fontSize: 12,
        foregroundColor: "#000000",
        headerBackgroundColor: "#FFFFFF",
        headerFontSize: 12,
        headerFontWeight: 500,
        headerRowBorder: false,
        headerTextColor: "#7957d5",
        headerVerticalPaddingScale: 1,
        iconSize: 14,
        rowBorder: true,
        spacing: 5,
        wrapperBorder: true,
        wrapperBorderRadius: 4
    });

// Registrar módulos AG Grid
ModuleRegistry.registerModules([AllCommunityModule]);

const localeText = {
    noRowsToShow: 'No hay filas para mostrar',
    loadingOoo: 'Cargando...',

    // Paginación
    page: 'Página',
    more: 'Más',
    to: 'a',
    of: 'de',
    next: 'Siguiente',
    last: 'Último',
    first: 'Primero',
    previous: 'Anterior',

    // Filtros
    filterOoo: 'Filtrar...',
    applyFilter: 'Aplicar filtro...',
    clearFilter: 'Limpiar filtro',
    equals: 'Igual',
    notEqual: 'Distinto',
    lessThan: 'Menor que',
    greaterThan: 'Mayor que',
    lessThanOrEqual: 'Menor o igual',
    greaterThanOrEqual: 'Mayor o igual',
    inRange: 'En rango',
    contains: 'Contiene',
    notContains: 'No contiene',
    startsWith: 'Empieza con',
    endsWith: 'Termina con',

    // Menú de columnas
    columns: 'Columnas',

    // Otros textos importantes
    loading: 'Cargando...',
    cancelFilter: 'Cancelar',
    resetFilter: 'Reiniciar',
    applyFilter: 'Aplicar',
};

export default {
    name: "InventarioOftalmico",
    components: { AgGridVue },
    setup() {
        const gridRef = ref(null);

        const menuVisible = ref(false);
        const menuPosition = reactive({ x: 0, y: 0 });
        const tooltipMenu = ref(null);

        const selectionSummary = reactive({}); // objeto reactive para mantener datos en template

        let isDragging = false;
        let dragStart = null;
        let hasDragged = false;

        const { motionRef2 } = useMotionEffects();
        const activeSheet = ref("antirreflejo");
        const loading = ref(false);
        const selectedCells = ref(new Set());
        const esfericas = [];

        for (let val = 6.0; val >= -6.0; val -= 0.25) {
            esfericas.push(Number(val.toFixed(2)));
        }

        const addCols = [1, 1.2, 1.5, 1.7, 3];

        const tooltipValueGetter = (params) => {
            const esferica = params.data?.esferica;
            const cil = params.colDef?.headerName;
            const value = params.value;

            if (value == null) return '';

            return `SPH: ${esferica} / ADD: ${cil} → ${value}`;
        };

        const buildColumns = () => {
            const baseCol = {
                field: "esferica",
                headerName: "(-)",
                headerTooltip: "Esférica (SPH -)", // ✅ Tooltip en header
                pinned: "left",
                editable: false,
                filter: false,
                width: 90,
                resizable: false,
            };

            const childCols = addCols.map((c) => ({
                field: `cil_${c.toString().replace(".", "_")}`,
                headerName: c.toString(),
                headerTooltip: `ADD: ${c.toString()}`, // ✅ Aquí agregas el tooltip del encabezado

                editable: false,
                filter: "agNumberColumnFilter",
                floatingFilter: true,
                floatingFilterComponentParams: {
                    suppressFilterButton: false,
                },
                filterParams: {
                    buttons: ['apply', 'clear', 'reset', 'cancel'],
                    closeOnApply: true,
                },
                minWidth: 80,
                maxWidth: 140,
                width: 120,
                resizable: true,
                valueParser: (params) => Number(params.newValue) || 0,
            }));

            const fillerCol = {
                headerName: '',
                field: 'filler',
                editable: false,
                filter: false,
                flex: 1,
                resizable: false,
                cellRenderer: () => '',
            };

            return [
                { headerName: "SPH (-)", children: [baseCol] },
                { headerName: "ADD +", children: [...childCols, fillerCol] },
            ];
        };

        const buildData = () =>
            esfericas.map((esf) => {
                const row = {
                    esferica: esf.toFixed(2),
                    groupKey: "SPH Negativo",
                };
                addCols.forEach((c) => {
                    row[`cil_${c.toString().replace(".", "_")}`] = Math.floor(Math.random() * 1000);
                });
                return row;
            });

        const sheetsData = {
            antirreflejo: {
                id: "antirreflejo",
                name: "Antirreflejo",
                columns: buildColumns(),
                data: buildData(),
            },
            fotocromatico: {
                id: "fotocromatico",
                name: "Fotocromático",
                columns: buildColumns(),
                data: buildData(),
            },
            tintegris: {
                id: "tintegris",
                name: "Tinte Gris",
                columns: buildColumns(),
                data: buildData(),
            },
        };

        const dynamicSheets = reactive([]);
        const newSheetName = ref("");
        const creatingSheet = ref(false);

        const inventarioSheets = reactive({ ...sheetsData });

        const currentColumns = computed(() => {
            return inventarioSheets[activeSheet.value]?.columns ??
                dynamicSheets.find((s) => s.id === activeSheet.value)?.columns ?? [];
        });

        const currentData = computed(() => {
            return inventarioSheets[activeSheet.value]?.data ??
                dynamicSheets.find((s) => s.id === activeSheet.value)?.data ?? [];
        });

        const defaultColDef = computed(() => ({
            resizable: true,
            sortable: true,
            filter: true,
            editable: true,
            floatingFilter: true,
            floatingFilterComponentParams: {
                suppressFilterButton: false,
            },
            filterParams: {
                buttons: ['apply', 'clear', 'reset', 'cancel'],
                closeOnApply: true,
            },
            tooltipValueGetter, // ✅ Tooltip activado
            cellClass: (params) => {
                const baseClass = selectedCells.value.has(`${params.rowIndex}-${params.colDef.field}`) ? 'custom-cell-selected' : '';
                const borderClass = getBorderClasses(params);
                return `${baseClass} ${borderClass}`.trim();
            },
        }));

        const onCellEditingStarted = (params) => {
            if (params.colDef.field === "esferica") {
                params.api.stopEditing();
            }
        };

        const onAfterEdit = (params) => {
            const { data, colDef, newValue } = params;
            if (data && colDef.field) {
                data[colDef.field] = Number(newValue) || 0;
            }
        };

        const menuData = reactive({
            value: null,
            colHeader: '',
            rowHeader: ''
        });

        const tratamientosDisponibles = [
            "Antirreflejo",
            "Fotocromático",
            "Tinte Gris",
            "Blue Block",
            "UV Plus",
            "Superhidrofóbico",
        ];
        const selectedTratamientos = ref([]);

        watch(selectedTratamientos, (newVal) => {
            newSheetName.value = newVal.length ? newVal.join(" + ") : "";
        });

        const removeTratamiento = (index) => {
            selectedTratamientos.value.splice(index, 1);
        };

        const cargarPlanilla = async (sheetId) => {
            loading.value = true;
            await new Promise((res) => setTimeout(res, 600));
            loading.value = false;
        };

        watch(
            activeSheet,
            (val) => {
                if (val !== "nueva") cargarPlanilla(val);
            },
            { immediate: true }
        );

        const crearNuevaPlanilla = () => {
            if (!selectedTratamientos.value.length || !newSheetName.value.trim()) return;

            creatingSheet.value = true;

            const id = `dyn_${newSheetName.value.toLowerCase().replace(/\s+/g, "_").replace(/[^\w_-]/g, "")}_${Date.now()}`;

            dynamicSheets.push({
                id,
                name: newSheetName.value.trim(),
                columns: buildColumns(),
                data: buildData(),
            });

            activeSheet.value = id;
            selectedTratamientos.value = [];
            newSheetName.value = "";
            creatingSheet.value = false;
        };

        let autoScrollFrame = null;
        let verticalContainer = null;
        let horizontalContainer = null;
        let autoScrollCoords = { x: 0, y: 0 };
        let scrollSpeed = 0;
        const maxScrollSpeed = 40;
        const acceleration = 2;  // px por frame aumenta scrollSpeed si se sigue en la zona de borde

        function cancelAutoScroll() {
            if (autoScrollFrame !== null) {
                console.log('[AutoScroll] ❌ Cancelado');
                cancelAnimationFrame(autoScrollFrame);
                autoScrollFrame = null;
                verticalContainer = null;
                horizontalContainer = null;
                scrollSpeed = 0; // resetear velocidad
            }
        }

        function checkAutoScroll(gridApi, clientX, clientY) {
            verticalContainer = getVerticalScrollContainer(gridApi);
            horizontalContainer = getHorizontalScrollContainer(gridApi);

            if (!verticalContainer && !horizontalContainer) {
                console.warn('[AutoScroll] ⚠️ No se encontró ningún contenedor de scroll');
                return;
            }

            autoScrollCoords.x = clientX;
            autoScrollCoords.y = clientY;

            if (autoScrollFrame !== null) return;

            const verticalEdgeThreshold = 20;
            const horizontalEdgeThreshold = 95;  // más sensible para left/right

            function scrollStep() {
                let didScroll = false;

                const refElement = verticalContainer || horizontalContainer;
                if (!refElement) return cancelAutoScroll();

                const rect = refElement.getBoundingClientRect();

                // Aceleración distinta para horizontal y vertical
                if (horizontalContainer &&
                    (autoScrollCoords.x < rect.left + horizontalEdgeThreshold || autoScrollCoords.x > rect.right - horizontalEdgeThreshold)) {
                    scrollSpeed = Math.min(Math.max(scrollSpeed, 5) + acceleration * 1.5, maxScrollSpeed);
                } else if (verticalContainer &&
                    (autoScrollCoords.y < rect.top + verticalEdgeThreshold || autoScrollCoords.y > rect.bottom - verticalEdgeThreshold)) {
                    scrollSpeed = Math.min(Math.max(scrollSpeed, 5) + acceleration, maxScrollSpeed);
                } else {
                    scrollSpeed = Math.min(scrollSpeed + acceleration, maxScrollSpeed);
                }

                // --- Scroll horizontal ---
                if (horizontalContainer) {
                    const maxScrollLeft = horizontalContainer.scrollWidth - horizontalContainer.clientWidth;

                    if (autoScrollCoords.x < rect.left + horizontalEdgeThreshold) {
                        if (horizontalContainer.scrollLeft > 0) {
                            horizontalContainer.scrollLeft = Math.max(0, horizontalContainer.scrollLeft - scrollSpeed);
                            didScroll = true;
                            console.log('[AutoScroll] ⬅️ Scrolling left', scrollSpeed);
                        }
                    } else if (autoScrollCoords.x > rect.right - horizontalEdgeThreshold) {
                        if (horizontalContainer.scrollLeft < maxScrollLeft) {
                            horizontalContainer.scrollLeft = Math.min(maxScrollLeft, horizontalContainer.scrollLeft + scrollSpeed);
                            didScroll = true;
                            console.log('[AutoScroll] ➡️ Scrolling right', scrollSpeed);
                        }
                    }
                }

                // --- Scroll vertical ---
                if (verticalContainer) {
                    const maxScrollTop = verticalContainer.scrollHeight - verticalContainer.clientHeight;

                    if (autoScrollCoords.y < rect.top + verticalEdgeThreshold) {
                        if (verticalContainer.scrollTop > 0) {
                            verticalContainer.scrollTop = Math.max(0, verticalContainer.scrollTop - scrollSpeed);
                            didScroll = true;
                            console.log('[AutoScroll] ⬆️ Scrolling up', scrollSpeed);
                        }
                    } else if (autoScrollCoords.y > rect.bottom - verticalEdgeThreshold) {
                        if (verticalContainer.scrollTop < maxScrollTop) {
                            verticalContainer.scrollTop = Math.min(maxScrollTop, verticalContainer.scrollTop + scrollSpeed);
                            didScroll = true;
                            console.log('[AutoScroll] ⬇️ Scrolling down', scrollSpeed);
                        }
                    }
                }

                if (!didScroll) {
                    scrollSpeed = 0;
                }

                autoScrollFrame = requestAnimationFrame(scrollStep);
            }


            console.log('[AutoScroll] 🟢 Iniciado scrollStep');
            autoScrollFrame = requestAnimationFrame(scrollStep);
        }
        // --- Scroll container helpers ---
        function getVerticalScrollContainer(gridApi) {
            return gridApi?.gridBodyCtrl?.eBodyViewport ||
                document.querySelector('.ag-body-viewport') ||
                document.querySelector('.ag-center-viewport') ||
                null;
        }

        function getHorizontalScrollContainer(gridApi) {
            if (gridApi?.gridBodyCtrl?.eCenterViewport) {
                console.log('[AutoScroll] Usando eCenterViewport para scroll horizontal');
                return gridApi.gridBodyCtrl.eCenterViewport;
            }

            const centerViewport = document.querySelector('.ag-center-cols-viewport');
            if (centerViewport) {
                console.log('[AutoScroll] Usando .ag-center-cols-viewport para scroll horizontal');
                return centerViewport;
            }

            const bottomScrollbar = gridApi?.gridBodyCtrl?.eBottomHorizontalScrollbar;
            if (bottomScrollbar) {
                console.log('[AutoScroll] Usando eBottomHorizontalScrollbar para scroll horizontal');
                return bottomScrollbar;
            }

            const bodyHorizontalScroll = document.querySelector('.ag-body-horizontal-scroll');
            if (bodyHorizontalScroll) {
                console.log('[AutoScroll] Usando .ag-body-horizontal-scroll para scroll horizontal');
                return bodyHorizontalScroll;
            }

            const centerContainer = document.querySelector('.ag-center-container');
            if (centerContainer) {
                console.log('[AutoScroll] Usando .ag-center-container para scroll horizontal');
                return centerContainer;
            }

            console.warn('[AutoScroll] No se encontró contenedor válido para scroll horizontal');
            return null;
        }

        const onCellClicked = (params) => {
        };


        const onCellMouseDown = (params) => {
            if (params.event.button !== 0) return; // solo clic izquierdo
            if (params.column.getId() === 'esferica') return;

            isDragging = true;
            dragStart = { rowIndex: params.rowIndex, colId: params.column.getId() };
            hasDragged = false;

            const cellId = `${params.rowIndex}-${params.column.getId()}`;
            selectedCells.value = new Set([cellId]);

            // Forzar cursor grabbing solo en la celda actual
            params.event.target.style.cursor = 'grabbing';

            if (gridRef.value && gridRef.value.api) {
                gridRef.value.api.refreshCells({ force: true });
            }

            params.event.preventDefault();
        };

        // Listener global para mouseup, para resetear el cursor incluso si sueltas fuera del grid
        window.addEventListener('mouseup', (event) => {
            if (isDragging) {
                onCellMouseUp(event);
            }
        });

        const onCellMouseOver = (params) => {
            if (!isDragging || !dragStart) return;
            hasDragged = true;

            const currentColId = params.column.getId();
            const currentRow = params.rowIndex;

            const startRow = Math.min(dragStart.rowIndex, currentRow);
            const endRow = Math.max(dragStart.rowIndex, currentRow);

            const columnIds = currentColumns.value.flatMap(col =>
                col.children ? col.children.map(c => c.field) : [col.field]
            );

            const startColIndex = columnIds.indexOf(dragStart.colId);
            const endColIndex = columnIds.indexOf(currentColId);

            const leftCol = Math.min(startColIndex, endColIndex);
            const rightCol = Math.max(startColIndex, endColIndex);

            const newSelection = new Set();
            for (let row = startRow; row <= endRow; row++) {
                for (let colIndex = leftCol; colIndex <= rightCol; colIndex++) {
                    const field = columnIds[colIndex];
                    if (field === 'esferica') continue;
                    newSelection.add(`${row}-${field}`);
                }
            }

            selectedCells.value = newSelection;

            const api = gridRef.value?.api;
            if (api) {
                api.refreshCells({ force: true });

                if (params.event?.clientX != null && params.event?.clientY != null) {
                    checkAutoScroll(api, params.event.clientX, params.event.clientY);
                }
            }
        };


        const onCellMouseUp = (event) => {
            if (!isDragging) return;

            isDragging = false;
            dragStart = null;
            hasDragged = false;

            const offset = 10;
            const padding = 12;

            // Posición inicial cerca del mouse
            menuPosition.x = event.clientX + offset;
            menuPosition.y = event.clientY + offset;

            if (selectedCells.value.size > 0) {
                processSelectionSummary();
                menuVisible.value = true;

                // Esperar que el tooltip se monte
                nextTick(() => {
                    const el = tooltipMenu.value;
                    if (!el) return;

                    const rect = el.getBoundingClientRect();
                    const viewportWidth = window.innerWidth;
                    const viewportHeight = window.innerHeight;

                    let x = menuPosition.x;
                    let y = menuPosition.y;

                    // Recalcular si se sale del viewport
                    if (x + rect.width + padding > viewportWidth) {
                        x = event.clientX - rect.width - offset;
                        if (x < padding) x = padding;
                    }

                    if (y + rect.height + padding > viewportHeight) {
                        y = event.clientY - rect.height - offset;
                        if (y < padding) y = padding;
                    }

                    // ✅ ACTUALIZAR valores usados en el template
                    menuPosition.x = x;
                    menuPosition.y = y;
                });
            } else {
                menuVisible.value = false;
            }

            // Resetear cursor
            const cells = document.querySelectorAll('.buefy-balham-light .ag-cell');
            cells.forEach((cell) => (cell.style.cursor = ''));

            if (gridRef.value && gridRef.value.api) {
                gridRef.value.api.refreshCells({ force: true });
            }

            isDragging = false;
            cancelAutoScroll();
        };

        const preventSelect = (e) => {
            e.preventDefault();
        };

        const onCellTouchStart = (params) => {
            if (params.column.getId() === 'esferica') return;

            isDragging = true;
            dragStart = { rowIndex: params.rowIndex, colId: params.column.getId() };
            hasDragged = false;

            const cellId = `${params.rowIndex}-${params.column.getId()}`;
            selectedCells.value = new Set([cellId]);

            if (gridRef.value && gridRef.value.api) {
                gridRef.value.api.refreshCells({ force: true });
            }

            params.event.preventDefault();
        };

        const onCellTouchMove = (params) => {
            if (!isDragging || !dragStart) return;
            hasDragged = true;

            const startRow = dragStart.rowIndex;
            const startCol = dragStart.colId;
            const currentRow = params.rowIndex;
            const currentCol = params.column.getId();

            const columnIds = currentColumns.value.flatMap(c =>
                c.children ? c.children.map(ch => ch.field) : [c.field]
            );

            const startColIndex = columnIds.indexOf(startCol);
            const currentColIndex = columnIds.indexOf(currentCol);

            const minRow = Math.min(startRow, currentRow);
            const maxRow = Math.max(startRow, currentRow);
            const minColIndex = Math.min(startColIndex, currentColIndex);
            const maxColIndex = Math.max(startColIndex, currentColIndex);

            const newSelected = new Set();

            for (let r = minRow; r <= maxRow; r++) {
                for (let c = minColIndex; c <= maxColIndex; c++) {
                    const field = columnIds[c];
                    if (field === 'esferica') continue;
                    newSelected.add(`${r}-${field}`);
                }
            }

            selectedCells.value = newSelected;

            const api = gridRef.value?.api;
            if (api) {
                api.refreshCells({ force: true });

                const touch = params.event?.touches?.[0];
                if (touch) {
                    checkAutoScroll(api, touch.clientX, touch.clientY);
                }
            }

            params.event.preventDefault();
        };

        const onCellTouchEnd = (params) => {
            params.event.preventDefault();

            if (!isDragging) return;

            isDragging = false;
            dragStart = null;
            hasDragged = false;

            const event = params.event;
            const touch = event.changedTouches?.[0] || event;

            const offset = 10;
            const padding = 12;

            menuPosition.x = touch.clientX + offset;
            menuPosition.y = touch.clientY + offset;

            if (selectedCells.value.size > 0) {
                processSelectionSummary();
                menuVisible.value = true;

                nextTick(() => {
                    const el = tooltipMenu.value;
                    if (!el) return;

                    const rect = el.getBoundingClientRect();
                    const viewportWidth = window.innerWidth;
                    const viewportHeight = window.innerHeight;

                    let x = menuPosition.x;
                    let y = menuPosition.y;

                    if (x + rect.width + padding > viewportWidth) {
                        x = touch.clientX - rect.width - offset;
                        if (x < padding) x = padding;
                    }
                    if (y + rect.height + padding > viewportHeight) {
                        y = touch.clientY - rect.height - offset;
                        if (y < padding) y = padding;
                    }

                    menuPosition.x = x;
                    menuPosition.y = y;
                });
            } else {
                menuVisible.value = false;
            }

            if (gridRef.value && gridRef.value.api) {
                gridRef.value.api.refreshCells({ force: true });
            }

            console.log('TouchEnd:', {
                selectedCells: Array.from(selectedCells.value),
                menuPosition: { ...menuPosition },
                menuVisible: menuVisible.value,
            });

            isDragging = false;
            cancelAutoScroll();
        };

        onMounted(() => {
            const gridContainer = document.querySelector('.buefy-balham-light');
            console.log('Grid container encontrado:', gridContainer);

            const delegateTouchEvent = (type, handler) => {
                gridContainer.addEventListener(type, (event) => {
                    let touch = event.changedTouches?.[0] || event.touches?.[0];
                    if (!touch) return;

                    // Asegurarse de que detectamos el elemento bajo el dedo
                    const element = document.elementFromPoint(touch.clientX, touch.clientY);
                    if (!element) {
                        console.warn(`[Touch Event]: ${type} sin elemento bajo el dedo`);
                        return;
                    }

                    const cell = element.closest('.ag-cell');
                    if (!cell) {
                        console.warn(`[Touch Event]: ${type} sin celda`, element);
                        return;
                    }

                    const colId = cell.getAttribute('col-id');
                    const rowContainer = cell.closest('.ag-row');
                    const rowIndex = rowContainer ? parseInt(rowContainer.getAttribute('row-index')) : NaN;

                    if (!colId || isNaN(rowIndex)) {
                        console.warn(`[Touch Event]: Faltan atributos válidos`, { colId, rowIndex });
                        return;
                    }

                    // Buscar el objeto columna correctamente
                    const column = currentColumns.value.flatMap(c =>
                        c.children || [c]
                    ).find(c => c.field === colId);

                    if (!column) {
                        console.warn(`[Touch Event]: Columna no encontrada para colId: ${colId}`);
                        return;
                    }

                    const params = {
                        event,
                        rowIndex,
                        column: { getId: () => colId },
                    };

                    console.log(`[Touch Event]: ${type}`, { colId, rowIndex });
                    handler(params);
                }, { passive: false });
            };



            if (gridContainer) {
                delegateTouchEvent('touchstart', onCellTouchStart);
                delegateTouchEvent('touchmove', onCellTouchMove);
                delegateTouchEvent('touchend', onCellTouchEnd);
                gridContainer.addEventListener('selectstart', preventSelect);
            } else {
                console.warn("⚠️ Grid container no encontrado");
            }
        });

        onMounted(() => {
            const gridContainer = document.querySelector('.buefy-balham-light');
            if (gridContainer) {
                gridContainer.addEventListener('selectstart', preventSelect);
            }
        });

        onBeforeUnmount(() => {
            const gridContainer = document.querySelector('.buefy-balham-light');
            if (gridContainer) {
                gridContainer.removeEventListener('selectstart', preventSelect);
            }
        });

        function getBorderClasses(params) {
            const cellId = `${params.rowIndex}-${params.colDef.field}`;
            if (!selectedCells.value.has(cellId)) return '';

            const columnIds = currentColumns.value.flatMap(col =>
                col.children ? col.children.map(c => c.field) : [col.field]
            );

            // Obtener índices mínimos y máximos de filas y columnas seleccionadas
            const selectedArray = Array.from(selectedCells.value).map(id => {
                const [rowStr, colId] = id.split('-');
                return {
                    row: parseInt(rowStr),
                    colIndex: columnIds.indexOf(colId),
                };
            });

            const rows = selectedArray.map(c => c.row);
            const cols = selectedArray.map(c => c.colIndex);

            const minRow = Math.min(...rows);
            const maxRow = Math.max(...rows);
            const minCol = Math.min(...cols);
            const maxCol = Math.max(...cols);

            const row = params.rowIndex;
            const colIndex = columnIds.indexOf(params.colDef.field);

            const classes = [];

            if (row === minRow) classes.push('border-top');
            if (row === maxRow) classes.push('border-bottom');
            if (colIndex === minCol) classes.push('border-left');
            if (colIndex === maxCol) classes.push('border-right');

            return classes.join(' ');
        }

        // selectionSummary = {
        //   "esferica1": { "cil_0_75": sum, "cil_1_00": sum, ... },
        //   "esferica2": { "cil_0_75": sum, ... },
        //   ...
        // }
        const isSingleCell = computed(() => Array.from(selectedCells.value).length === 1);

        function processSelectionSummary() {
            const isSingle = isSingleCell.value;
            const summary = {};
            const fullSummary = {}; // Siempre recolectamos existencias

            console.log('📌 processSelectionSummary');
            console.log('🔹 selectedCells:', Array.from(selectedCells.value));
            console.log('🔹 isSingleCell:', isSingle);

            if (isSingle) {
                Array.from(selectedCells.value).forEach(cellId => {
                    const [rowStr, colId] = cellId.split('-');
                    const rowIndex = Number(rowStr);
                    const row = currentData.value[rowIndex];

                    if (!row) {
                        console.warn('❌ Fila no encontrada:', rowIndex);
                        return;
                    }

                    if (!colId.startsWith('cil_')) {
                        console.warn('❌ Columna no es cilíndrica:', colId);
                        return;
                    }

                    const value = Number(row[colId]) || 0;
                    const esf = row.esferica;

                    console.log('✔️ Celda válida:', { colId, esf, value });

                    if (!summary[colId]) summary[colId] = {};
                    if (!summary[colId][esf]) summary[colId][esf] = 0;
                    summary[colId][esf] += value;

                    // También llenamos fullSummary para consistencia
                    if (!fullSummary[colId]) fullSummary[colId] = {};
                    if (!fullSummary[colId][esf]) fullSummary[colId][esf] = 0;
                    fullSummary[colId][esf] += value;
                });

                console.log('📦 Summary (una celda):', summary);

                Object.keys(selectionSummary).forEach(k => delete selectionSummary[k]);

                if (Object.keys(summary).length > 0) {
                    Object.assign(selectionSummary, summary, { __fullMap: fullSummary });
                } else {
                    console.warn('⚠️ No se encontró información válida para una sola celda.');
                }

            } else {
                const cilindricasSet = new Set();
                const esfericasSet = new Set();

                Array.from(selectedCells.value).forEach(cellId => {
                    const [rowStr, colId] = cellId.split('-');
                    const rowIndex = Number(rowStr);
                    const row = currentData.value[rowIndex];

                    if (!row || !colId.startsWith('cil_')) return;

                    const value = Number(row[colId]) || 0;
                    const esf = row.esferica;

                    // Llenamos para vista
                    cilindricasSet.add(formatCil(colId));
                    esfericasSet.add(formatNumber(esf));

                    // Llenamos fullSummary aunque no se muestre
                    if (!fullSummary[colId]) fullSummary[colId] = {};
                    if (!fullSummary[colId][esf]) fullSummary[colId][esf] = 0;
                    fullSummary[colId][esf] += value;
                });

                const resumenMultiple = {
                    cilindricas: Array.from(cilindricasSet).sort((a, b) => a - b),
                    esfericas: Array.from(esfericasSet).sort((a, b) => a - b),
                    __fullMap: fullSummary
                };

                console.log('📦 Summary (múltiples):', resumenMultiple);

                Object.keys(selectionSummary).forEach(k => delete selectionSummary[k]);

                if (cilindricasSet.size || esfericasSet.size) {
                    Object.assign(selectionSummary, resumenMultiple);
                }
            }
        }



        const formatNumber = (value) => {
            return String(value).replace(/_/g, '.').replace(',', '.');
        };

        const formatCil = (cil) => {
            const raw = cil.replace('cil_', '');
            return formatNumber(raw);
        };

        const isObject = (val) => {
            return val !== null && typeof val === 'object' && !Array.isArray(val);
        };

        const filteredSummary = computed(() => {
            const result = {};
            for (const key in selectionSummary) {
                if (key !== '__fullMap') {
                    result[key] = selectionSummary[key];
                }
            }
            return result;
        });



        function getHeaderName(field) {
            for (const colGroup of currentColumns.value) {
                const children = colGroup.children || [colGroup];
                for (const col of children) {
                    if (col.field === field) return col.headerName || field;
                }
            }
            return field;
        }


        const screenIsMobile = ref(window.innerWidth <= 480);

        const handleResize = () => {
            screenIsMobile.value = window.innerWidth <= 480;
        };

        onMounted(() => {
            window.addEventListener('resize', handleResize);
        });

        onUnmounted(() => {
            window.removeEventListener('resize', handleResize);
        });



        return {
            motionRef2,
            activeSheet,
            loading,
            dynamicSheets,
            newSheetName,
            creatingSheet,
            currentColumns,
            currentData,
            defaultColDef,

            onCellEditingStarted,
            crearNuevaPlanilla,
            tratamientosDisponibles,
            selectedTratamientos,
            removeTratamiento,

            onAfterEdit,
            onCellMouseDown,
            onCellMouseOver,
            onCellMouseUp,
            localeText,        // asegúrate de que esté definido/importado


            // Nuevos eventos touch
            onCellTouchStart,
            onCellTouchMove,
            onCellTouchEnd,

            cancelAutoScroll,
            checkAutoScroll,
            getVerticalScrollContainer,
            getHorizontalScrollContainer,

            menuVisible,
            menuPosition,
            tooltipMenu,


            menuData,

            onCellClicked,
            theme: themeCustom, // asegúrate de que también esté definido/importado
            gridRef,
            getHeaderName,
            selectionSummary,
            filteredSummary,
            formatCil,
            formatNumber,
            isObject,
            isSingleCell,


            screenIsMobile,

        };
    }

    ,
    computed: {
        esPlanillaBase() {
            return ["antirreflejo", "fotocromatico", "tintegris"].includes(
                this.activeSheet
            );
        },
    },
    methods: {
        onTabChange(sheetId) {
            this.$buefy.toast.open({
                message: `Cambiaste a: ${sheetId}`,
                type: "is-info",
                duration: 1500,
            });
        },
        exportarPlanilla() {
            // tu lógica para exportar
        },
        duplicarPlanilla() {
            if (!this.activeSheet || this.activeSheet === "nueva") return;
            // lógica para duplicar planilla
            this.$buefy.toast.open("Planilla duplicada correctamente");
        },
        confirmarEliminacion() {
            if (!this.activeSheet || this.esPlanillaBase) return;
            this.$buefy.dialog.confirm({
                message: "¿Estás seguro de eliminar esta planilla?",
                confirmText: "Eliminar",
                type: "is-danger",
                onConfirm: () => this.eliminarPlanilla(),
            });
        },
        eliminarPlanilla() {
            // lógica para eliminar planilla
            this.$buefy.toast.open("Planilla eliminada");
        },
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

/*
--revo-grid-focused-bg: hsl(348, 86%, 61%);
*/
</style>


<style scoped>
.custom-scroll-bar {
    position: fixed;
    background-color: rgba(0, 0, 0, 0.2);
    z-index: 999;
    border-radius: 4px;
    touch-action: none;
}

.custom-scroll-bar.y {
    width: 20px;
    height: 60%;
    right: 4px;
    top: 20%;
}

.custom-scroll-bar.x {
    height: 20px;
    width: 60%;
    bottom: 4px;
    left: 20%;
}
</style>
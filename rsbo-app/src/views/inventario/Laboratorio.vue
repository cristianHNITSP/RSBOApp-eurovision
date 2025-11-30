<!-- src/views/Laboratorio.vue -->
<template>
  <section class="lab-view laboratorio-section" v-motion-fade-visible-once>
    <!-- Top header -->
    <header class="lab-hero">
      <div class="lab-hero__left">
        <h1 class="lab-title">
          <span class="lab-title__dot" aria-hidden="true"></span>
          Laboratorio
        </h1>

        <p class="lab-subtitle">
          Mock en memoria: crear pedido desde inventario → surtir por escaneo (salida) → catálogo de códigos.
        </p>

        <div class="lab-chips">
          <span class="chip">
            <i class="fas fa-layer-group mr-2"></i>
            {{ filteredSheets.length }} planillas
          </span>
          <span class="chip">
            <i class="fas fa-barcode mr-2"></i>
            {{ totalCodes }} códigos
          </span>
          <span class="chip">
            <i class="fas fa-clipboard-list mr-2"></i>
            {{ ordersDB.length }} pedidos
          </span>
          <span class="chip chip--soft">
            <i class="fas fa-clock mr-2"></i>
            Act. hace {{ lastUpdatedHuman }}
          </span>
        </div>
      </div>

      <div class="lab-hero__right">
        <b-field class="mb-0" label="Buscar planilla">
          <b-input v-model="sheetQuery" placeholder="Nombre, material, tratamientos…" icon="search" />
        </b-field>

        <div class="lab-hero__actions">
          <b-button type="is-primary" icon-left="sync" @click="resetMock">
            Recargar (mock)
          </b-button>

          <b-button :type="includeDeleted ? 'is-danger' : 'is-light'" icon-left="trash"
            @click="includeDeleted = !includeDeleted">
            {{ includeDeleted ? "Mostrando papelera" : "Ocultar papelera" }}
          </b-button>
        </div>
      </div>
    </header>

    <!-- Main tabs -->
    <div class="glass">
      <b-tabs v-model="activeMainTab" type="is-toggle" class="main-tabs" expanded :animated="false">
        <!-- ===== TAB: PEDIDOS ===== -->
        <b-tab-item value="pedidos" label="Pedidos" icon="clipboard-list">
          <div class="columns is-multiline is-variable is-4">
            <!-- Left: inventory panel (como lo tenías) -->
            <div class="column is-8">
              <div class="panel">
                <div class="panel__head">
                  <div>
                    <h2 class="panel__title">
                      Inventario (mock)
                      <span class="panel__badge">{{ selectedSheetLabel }}</span>
                    </h2>
                    <p class="panel__hint">
                      Aquí armas el pedido en base al inventario (mock). El barcode se usa después para surtir.
                    </p>
                  </div>

                  <div class="panel__headActions">
                    <b-field class="mb-0" label="Planilla">
                      <b-select v-model="selectedSheetId" expanded>
                        <option v-for="s in filteredSheets" :key="s.id" :value="s.id">
                          {{ sheetTitle(s) }}
                        </option>
                      </b-select>
                    </b-field>

                    <b-button type="is-light" icon-left="download" :disabled="!selectedSheetId" @click="noop">
                      CSV
                    </b-button>
                  </div>
                </div>

                <div class="panel__body">
                  <div class="columns is-multiline is-variable is-3 mb-2">
                    <div class="column is-6">
                      <b-field label="Buscar dentro de la planilla" class="mb-0">
                        <b-input v-model="itemQuery" icon="search"
                          placeholder="Parámetros (SPH, CYL, ADD, BASE) o código de barra…" />
                      </b-field>
                    </div>

                    <div class="column is-3">
                      <b-field label="Mostrar" class="mb-0">
                        <b-select v-model="stockFilter" expanded>
                          <option value="withStock">Con stock</option>
                          <option value="all">Todo</option>
                          <option value="zero">Cero</option>
                        </b-select>
                      </b-field>
                    </div>

                    <div class="column is-3">
                      <b-field label="Límite" class="mb-0">
                        <b-select v-model="itemsLimit" expanded>
                          <option :value="1500">1,500</option>
                          <option :value="5000">5,000</option>
                          <option :value="20000">20,000</option>
                        </b-select>
                      </b-field>
                    </div>
                  </div>

                  <b-table :data="filteredItems" :paginated="true" :per-page="10" hoverable mobile-cards
                    class="nice-table">
                    <b-table-column field="existencias" label="PZAS." width="110" v-slot="props">
                      <span class="qty-pill"
                        :class="props.row.existencias > 0 ? 'qty-pill--ok' : 'qty-pill--zero'">
                        {{ props.row.existencias }}
                      </span>
                    </b-table-column>

                    <b-table-column field="product" label="PRODUCTO" v-slot="props">
                      <div class="prod">
                        <div class="prod__name">
                          {{ buildRowTitle(props.row, selectedSheet) }}
                        </div>
                        <div class="prod__meta">
                          <span class="meta-k">
                            <i class="fas fa-barcode mr-1"></i>
                            <span class="mono big-code">{{ props.row.codebar || "sin código" }}</span>
                          </span>
                        </div>
                      </div>
                    </b-table-column>

                    <b-table-column field="actions" label="" width="235" v-slot="props">
                      <div class="is-flex is-justify-content-flex-end is-align-items-center" style="gap:.4rem;">
                        <b-button size="is-small" type="is-light" icon-left="eye"
                          :disabled="!props.row.codebar || !isEan13(props.row.codebar)"
                          @click="openBarcode(props.row.codebar)">
                          Ver
                        </b-button>

                        <b-button size="is-small" type="is-light" icon-left="copy"
                          :disabled="!props.row.codebar"
                          @click="copyCodebar(props.row.codebar)">
                          Copiar
                        </b-button>

                        <b-button size="is-small" type="is-primary" icon-left="plus"
                          :disabled="props.row.existencias <= 0"
                          @click="addToDraft(props.row)">
                          Agregar
                        </b-button>
                      </div>
                    </b-table-column>
                  </b-table>

                  <div v-if="!filteredItems.length" class="empty">
                    <i class="fas fa-inbox empty__icon"></i>
                    <p class="empty__title">No hay resultados</p>
                    <p class="empty__text">Prueba cambiar el filtro o la búsqueda.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: pedido (como lo tenías) + surtir -->
            <div class="column is-4">
              <!-- Modo -->
              <div class="panel panel--sticky">
                <div class="panel__head panel__head--compact">
                  <div>
                    <h3 class="panel__title mb-0">
                      <i class="fas fa-sliders-h mr-2"></i>
                      Modo
                    </h3>
                    <p class="panel__hint mt-1">
                      Crear pedido (desde inventario) o surtir (escaneo → salida).
                    </p>
                  </div>

                  <div class="panel__headActions">
                    <b-button size="is-small" :type="mode === 'crear' ? 'is-primary' : 'is-light'"
                      icon-left="cart-plus" @click="mode = 'crear'">
                      Crear
                    </b-button>
                    <b-button size="is-small" :type="mode === 'surtir' ? 'is-primary' : 'is-light'"
                      icon-left="barcode" @click="mode = 'surtir'">
                      Surtir
                    </b-button>
                  </div>
                </div>
              </div>

              <!-- CREAR PEDIDO -->
              <div v-if="mode === 'crear'" class="panel mt-4">
                <div class="panel__head panel__head--compact">
                  <div>
                    <h3 class="panel__title mb-0">
                      <i class="fas fa-shopping-cart mr-2"></i>
                      Pedido en curso
                    </h3>
                    <p class="panel__hint mt-1">
                      Mock local. Se crea un pedido “entrante” en la lista.
                    </p>
                  </div>

                  <b-button size="is-small" type="is-light" icon-left="trash"
                    :disabled="!draftLines.length" @click="clearDraft">
                    Limpiar
                  </b-button>
                </div>

                <div class="panel__body">
                  <b-field label="Cliente (mock)" class="mb-2">
                    <b-input v-model="draftCliente" placeholder="Ej: Óptica Rivera" icon="building" />
                  </b-field>

                  <b-field label="Referencia/nota (mock)" class="mb-2">
                    <b-input v-model="draftNote" placeholder="Opcional" icon="sticky-note" />
                  </b-field>

                  <div v-if="!draftLines.length" class="empty empty--mini">
                    <i class="fas fa-receipt empty__icon"></i>
                    <p class="empty__title">Sin líneas</p>
                    <p class="empty__text">Agrega desde la tabla de inventario.</p>
                  </div>

                  <div v-else class="order-lines">
                    <article v-for="l in draftLines" :key="l.key" class="order-line">
                      <div class="order-line__top">
                        <div class="order-line__title">
                          {{ l.title }}
                          <span class="order-line__sub">
                            <i class="fas fa-layer-group mr-1"></i>
                            {{ selectedSheet?.nombre || "—" }}
                          </span>
                        </div>

                        <b-button size="is-small" type="is-text" icon-left="times"
                          @click="removeDraftLine(l.key)" />
                      </div>

                      <div class="order-line__bottom">
                        <div class="qty-control">
                          <b-button size="is-small" @click="decDraftQty(l.key)" icon-left="minus" />
                          <b-input type="number" min="1" v-model.number="l.qty" class="qty-input" />
                          <b-button size="is-small" @click="incDraftQty(l.key)" icon-left="plus" />
                        </div>

                        <span class="stock-hint">
                          stock: <b>{{ l.stock }}</b>
                        </span>
                      </div>
                    </article>
                  </div>

                  <div class="mt-3">
                    <b-button type="is-primary" expanded icon-left="clipboard-check"
                      :disabled="!draftLines.length || !selectedSheetId"
                      @click="createOrderFromDraft">
                      Crear pedido (mock)
                    </b-button>

                    <b-button class="mt-2" type="is-light" expanded outlined icon-left="exchange-alt"
                      :disabled="!ordersDB.length"
                      @click="mode = 'surtir'">
                      Ir a surtir
                    </b-button>
                  </div>
                </div>
              </div>

              <!-- SURTIR PEDIDO -->
              <div v-else class="panel mt-4">
                <div class="panel__head panel__head--compact">
                  <div>
                    <h3 class="panel__title mb-0">
                      <i class="fas fa-qrcode mr-2"></i>
                      Surtir por escaneo
                    </h3>
                    <p class="panel__hint mt-1">
                      Escanea el código de barras → marca salida → avanza líneas del pedido.
                    </p>
                  </div>
                </div>

                <div class="panel__body">
                  <b-field label="Selecciona pedido" class="mb-2">
                    <b-select v-model="selectedOrderId" expanded>
                      <option v-for="o in ordersDB" :key="o.id" :value="o.id">
                        {{ o.folio }} · {{ o.cliente }} · {{ statusHuman(o.status) }}
                      </option>
                    </b-select>
                  </b-field>

                  <div v-if="selectedOrder" class="mini-order-head mb-2">
                    <div class="mini-order-title">
                      <b>{{ selectedOrder.folio }}</b>
                      <span class="tag is-light ml-2" :class="statusTagClass(selectedOrder.status)">
                        {{ statusHuman(selectedOrder.status) }}
                      </span>
                    </div>
                    <div class="mini-order-sub">
                      {{ sheetNameById(selectedOrder.sheetId) }}
                      · {{ selectedOrder.createdAtShort }}
                    </div>

                    <div class="progress-bar mt-2" aria-label="Progreso del pedido">
                      <div class="progress-bar__fill" :style="{ width: orderProgressPct(selectedOrder) + '%' }" />
                    </div>
                    <div class="mini-order-sub mt-1">
                      Progreso: <b>{{ orderPickedCount(selectedOrder) }}</b>/<b>{{ orderTotalCount(selectedOrder) }}</b>
                    </div>
                  </div>

                  <b-field label="Código (EAN-13)" class="mb-2">
                    <b-input v-model="scanCode" placeholder="Ej: 2790000000011" icon="barcode"
                      @keyup.enter="scanAndDispatch" />
                  </b-field>

                  <div class="columns is-mobile is-variable is-2">
                    <div class="column">
                      <b-button type="is-primary" expanded icon-left="check" @click="scanAndDispatch">
                        Marcar salida
                      </b-button>
                    </div>
                    <div class="column is-narrow">
                      <b-button type="is-light" icon-left="times" @click="scanCode = ''" />
                    </div>
                  </div>

                  <div v-if="selectedOrder" class="mt-3">
                    <div class="order-lines">
                      <article v-for="l in selectedOrder.lines" :key="l.id" class="order-line"
                        :class="{ 'order-line--done': l.picked >= l.qty }">
                        <div class="order-line__top">
                          <div class="order-line__title">
                            {{ lineHuman(l, sheetById(selectedOrder.sheetId)) }}
                            <span class="order-line__sub">
                              {{ l.picked }}/{{ l.qty }} surtidas
                            </span>
                          </div>

                          <span class="tag is-light qty-tag" :class="l.picked >= l.qty ? 'is-success' : ''">
                            {{ l.picked >= l.qty ? "OK" : "Pendiente" }}
                          </span>
                        </div>
                      </article>
                    </div>

                    <div class="mt-3">
                      <b-button type="is-light" expanded icon-left="redo" @click="resetPickedForSelectedOrder"
                        :disabled="!selectedOrder">
                        Reiniciar surtido (mock)
                      </b-button>

                      <b-button class="mt-2" type="is-primary" expanded icon-left="lock"
                        :disabled="!selectedOrder || !isOrderComplete(selectedOrder)"
                        @click="closeOrderMock">
                        Cerrar pedido (mock)
                      </b-button>

                      <b-button class="mt-2" type="is-danger" expanded outlined icon-left="exclamation-triangle"
                        :disabled="!selectedOrder" @click="correctionOpen = true">
                        Solicitar corrección
                      </b-button>
                    </div>
                  </div>

                  <div v-else class="empty empty--mini">
                    <i class="fas fa-hand-pointer empty__icon"></i>
                    <p class="empty__title">Sin pedido seleccionado</p>
                    <p class="empty__text">Selecciona uno para surtir.</p>
                  </div>
                </div>
              </div>

              <!-- últimos registros -->
              <div class="panel mt-4">
                <div class="panel__head panel__head--compact">
                  <h3 class="panel__title mb-0">
                    <i class="fas fa-history mr-2"></i>
                    Últimos registros
                  </h3>
                </div>

                <div class="panel__body">
                  <div class="recent">
                    <a v-for="s in recentSheets" :key="s.id" class="recent__item" href="#"
                      @click.prevent="selectedSheetId = s.id">
                      <div class="recent__id">
                        {{ (s.nombre || "SHEET").slice(0, 10) }}
                      </div>
                      <div class="recent__meta">
                        <div class="recent__line">
                          {{ s.updatedAtShort }} · Por: {{ s.updatedBy || "—" }}
                        </div>
                        <div class="recent__line recent__line--muted">
                          {{ s.material }} · {{ prettyTrat(s.tratamientos) }}
                        </div>
                      </div>
                      <i class="fas fa-chevron-right recent__chev"></i>
                    </a>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </b-tab-item>

        <!-- ===== TAB: CATÁLOGO ===== -->
        <b-tab-item value="catalogo" label="Catálogo" icon="qrcode">
          <div class="columns is-multiline is-variable is-4">
            <div class="column is-4">
              <div class="panel panel--sticky">
                <div class="panel__head">
                  <div>
                    <h2 class="panel__title">Catálogo de códigos</h2>
                    <p class="panel__hint">
                      Vista previa (mock): tarjetas con barcode real (EAN-13) en SVG.
                    </p>
                  </div>
                </div>

                <div class="panel__body">
                  <b-field label="Planilla" class="mb-2">
                    <b-select v-model="selectedSheetId" expanded>
                      <option v-for="s in filteredSheets" :key="s.id" :value="s.id">
                        {{ sheetTitle(s) }}
                      </option>
                    </b-select>
                  </b-field>

                  <div v-if="selectedSheet" class="sheet-card">
                    <div class="sheet-card__top">
                      <div class="sheet-card__title">
                        {{ selectedSheet.nombre }}
                      </div>
                      <span class="tag is-primary is-light">
                        {{ selectedSheet.tipo_matriz }}
                      </span>
                    </div>

                    <div class="sheet-card__meta">
                      <div><b>Material:</b> {{ selectedSheet.material }}</div>
                      <div>
                        <b>Tratamientos:</b>
                        {{ prettyTrat(selectedSheet.tratamientos) }}
                      </div>
                    </div>

                    <div class="sheet-card__actions">
                      <b-button type="is-primary" icon-left="sync" expanded @click="noop">
                        Cargar/Actualizar (mock)
                      </b-button>

                      <div class="columns is-mobile is-variable is-2 mt-2">
                        <div class="column">
                          <b-button type="is-light" expanded icon-left="print"
                            :disabled="!filteredCatalogRows.length" @click="noop">
                            Imprimir
                          </b-button>
                        </div>
                        <div class="column">
                          <b-button type="is-light" expanded icon-left="download"
                            :disabled="!filteredCatalogRows.length" @click="noop">
                            CSV
                          </b-button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr class="soft-hr" />

                  <b-field label="Filtrar códigos" class="mb-2">
                    <b-input v-model="catalogQuery" icon="search"
                      placeholder="Código, parámetros (SPH/CYL/ADD/BASE)…" />
                  </b-field>

                  <b-field label="Mostrar" class="mb-0">
                    <b-select v-model="catalogFilter" expanded>
                      <option value="withStock">Solo con stock</option>
                      <option value="allCodes">Todo con código</option>
                      <option value="allRows">Todo (incluye sin código)</option>
                    </b-select>
                  </b-field>
                </div>
              </div>
            </div>

            <div class="column is-8">
              <div class="panel">
                <div class="panel__head">
                  <div>
                    <h2 class="panel__title">
                      Códigos disponibles
                      <span class="panel__badge">
                        {{ filteredCatalogRows.length }}
                      </span>
                    </h2>
                    <p class="panel__hint">
                      Click para copiar el codebar. (El barcode es visual y escaneable si tu pistola lee pantalla).
                    </p>
                  </div>

                  <div class="panel__headActions">
                    <b-button type="is-light" icon-left="bolt" :disabled="!selectedSheetId" @click="noop">
                      Preparar
                    </b-button>
                  </div>
                </div>

                <div class="panel__body">
                  <div v-if="!filteredCatalogRows.length" class="empty">
                    <i class="fas fa-qrcode empty__icon"></i>
                    <p class="empty__title">Sin códigos para mostrar</p>
                    <p class="empty__text">Cambia filtros o planilla (mock).</p>
                  </div>

                  <div v-else class="qr-grid">
                    <button v-for="row in paginatedCatalog" :key="row._k" class="qr-card" type="button"
                      @click="copyCodebar(row.codebar)" :title="'Copiar: ' + (row.codebar || '')">
                      <div class="qr-card__head">
                        <div class="qr-card__title">
                          {{ buildRowTitle(row, selectedSheet) }}
                        </div>
                        <span class="tag is-light qty-tag" :class="row.existencias > 0 ? 'is-success' : ''">
                          {{ row.existencias }} pzas
                        </span>
                      </div>

                      <div class="qr-card__meta">
                        <div class="meta-line">
                          <i class="fas fa-barcode mr-1"></i>
                          <span class="mono big-code">{{ row.codebar || "sin código" }}</span>
                        </div>
                        <div class="meta-line meta-line--muted">
                          {{ buildRowParams(row, selectedSheet) }}
                        </div>
                      </div>

                      <div class="qr-card__qr">
                        <!-- ✅ BARCODE REAL (EAN-13 SVG) -->
                        <div v-if="row.codebar && isEan13(row.codebar)" class="barcode-wrap">
                          <BarcodeEAN13 :value="row.codebar" :scale="2" :height="82" />
                        </div>
                        <div v-else class="barcode-fallback">
                          <i class="fas fa-exclamation-circle mr-1"></i>
                          Sin barcode válido
                        </div>
                      </div>

                      <div class="qr-card__foot">
                        <span class="foot-hint">Click para copiar</span>
                        <i class="fas fa-copy"></i>
                      </div>
                    </button>
                  </div>

                  <nav v-if="filteredCatalogRows.length > catalogPageSize" class="pager">
                    <b-button size="is-small" type="is-light" icon-left="chevron-left" :disabled="catalogPage === 1"
                      @click="catalogPage--">
                      Prev
                    </b-button>

                    <span class="pager__text">
                      Página {{ catalogPage }} / {{ catalogPages }}
                    </span>

                    <b-button size="is-small" type="is-light" icon-left="chevron-right"
                      :disabled="catalogPage === catalogPages" @click="catalogPage++">
                      Next
                    </b-button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </b-tab-item>
      </b-tabs>
    </div>

    <!-- Barcode modal -->
    <b-modal v-model="barcodeOpen" has-modal-card trap-focus :destroy-on-hide="true">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">
            <i class="fas fa-barcode mr-2"></i>
            Código de barras
          </p>
          <button class="delete" aria-label="close" @click="barcodeOpen = false"></button>
        </header>

        <section class="modal-card-body">
          <div class="barcode-modal">
            <div class="barcode-modal__code mono">
              {{ barcodeValue || "—" }}
            </div>

            <div class="barcode-modal__img">
              <BarcodeEAN13 v-if="barcodeValue && isEan13(barcodeValue)" :value="barcodeValue" :scale="3"
                :height="120" />
              <div v-else class="barcode-fallback">
                <i class="fas fa-exclamation-circle mr-1"></i>
                Código inválido para EAN-13
              </div>
            </div>

            <div class="columns is-mobile is-variable is-2 mt-3">
              <div class="column">
                <b-button type="is-primary" expanded icon-left="copy"
                  :disabled="!barcodeValue" @click="copyCodebar(barcodeValue)">
                  Copiar
                </b-button>
              </div>
              <div class="column">
                <b-button type="is-light" expanded icon-left="print" @click="noop">
                  Imprimir (mock)
                </b-button>
              </div>
            </div>

            <p class="help mt-2">
              Esto es mock. El barcode es SVG EAN-13 (para probar escaneo en pantalla).
            </p>
          </div>
        </section>

        <footer class="modal-card-foot">
          <b-button @click="barcodeOpen = false">Cerrar</b-button>
        </footer>
      </div>
    </b-modal>

    <!-- correction modal (mock) -->
    <b-modal v-model="correctionOpen" has-modal-card trap-focus :destroy-on-hide="true">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            Solicitar corrección
          </p>
          <button class="delete" aria-label="close" @click="correctionOpen = false"></button>
        </header>

        <section class="modal-card-body">
          <b-field label="Pedido">
            <b-select v-model="correction.orderId" expanded>
              <option v-for="o in ordersDB" :key="o.id" :value="o.id">
                {{ o.folio }} · {{ o.cliente }}
              </option>
            </b-select>
          </b-field>

          <b-field label="Código (opcional)">
            <b-input v-model="correction.codebar" placeholder="279…" icon="barcode" />
          </b-field>

          <b-field label="Mensaje">
            <b-input v-model="correction.message" type="textarea"
              placeholder="Describe el problema: stock desactualizado, código incorrecto, etc."
              maxlength="600" rows="5" />
          </b-field>

          <p class="help">
            Esto es mock. Solo cierra el modal y muestra un toast.
          </p>
        </section>

        <footer class="modal-card-foot">
          <b-button @click="correctionOpen = false">Cancelar</b-button>
          <b-button type="is-danger" icon-left="paper-plane" @click="submitCorrectionMock">
            Enviar (mock)
          </b-button>
        </footer>
      </div>
    </b-modal>
  </section>
</template>

<script setup>
import { computed, defineComponent, h, reactive, ref, watch } from "vue";

/* ===========================
   BARCODE EAN-13 (SVG)
   - Genera barras reales (bits EAN-13)
=========================== */
const BarcodeEAN13 = defineComponent({
  name: "BarcodeEAN13",
  props: {
    value: { type: String, required: true },
    scale: { type: Number, default: 2 },   // px por módulo
    height: { type: Number, default: 90 }, // alto de barras
  },
  setup(props) {
    const quiet = 10; // zona silenciosa (en módulos)

    const L = [
      "0001101","0011001","0010011","0111101","0100011",
      "0110001","0101111","0111011","0110111","0001011"
    ];
    const G = [
      "0100111","0110011","0011011","0100001","0011101",
      "0111001","0000101","0010001","0001001","0010111"
    ];
    const R = [
      "1110010","1100110","1101100","1000010","1011100",
      "1001110","1010000","1000100","1001000","1110100"
    ];
    const PARITY = [
      "LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG",
      "LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"
    ];

    const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

    function checksumEan13(d12) {
      const digits = d12.split("").map((x) => Number(x));
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const pos = i + 1; // 1..12
        const w = (pos % 2 === 0) ? 3 : 1;
        sum += digits[i] * w;
      }
      const mod = sum % 10;
      return (10 - mod) % 10;
    }

    function normalizeEan13(raw) {
      const d = onlyDigits(raw);
      if (d.length === 12) return d + String(checksumEan13(d));
      if (d.length === 13) return d;
      return "";
    }

    function buildBits(ean13) {
      const first = Number(ean13[0]);
      const left = ean13.slice(1, 7).split("").map(Number);
      const right = ean13.slice(7, 13).split("").map(Number);

      const parity = PARITY[first];
      let bits = "101"; // start guard

      for (let i = 0; i < 6; i++) {
        const d = left[i];
        bits += parity[i] === "L" ? L[d] : G[d];
      }

      bits += "01010"; // center guard

      for (let i = 0; i < 6; i++) {
        bits += R[right[i]];
      }

      bits += "101"; // end guard
      return bits; // 95 bits
    }

    // Guard bars en EAN-13: start(0..2), middle(45..49), end(92..94)
    function isGuardBit(i) {
      return (i >= 0 && i <= 2) || (i >= 45 && i <= 49) || (i >= 92 && i <= 94);
    }

    const ean = computed(() => normalizeEan13(props.value));
    const bits = computed(() => (ean.value ? buildBits(ean.value) : ""));
    const totalModules = computed(() => (bits.value ? bits.value.length + quiet * 2 : 0));

    const svgModel = computed(() => {
      if (!bits.value) return null;

      const scale = Math.max(1, Number(props.scale || 2));
      const normalH = Math.max(40, Number(props.height || 90));
      const guardH = normalH + 10;
      const textH = 18;

      const w = totalModules.value * scale;
      const hSvg = guardH + textH + 6;

      // Runs de "1" para dibujar rects eficientes
      const rects = [];
      let runStart = -1;
      let runGuard = false;

      for (let i = 0; i < bits.value.length; i++) {
        const bit = bits.value[i];
        const guard = isGuardBit(i);

        if (bit === "1" && runStart === -1) {
          runStart = i;
          runGuard = guard;
        } else if (bit === "1" && runStart !== -1) {
          if (runGuard !== guard) {
            rects.push({ start: runStart, end: i - 1, guard: runGuard });
            runStart = i;
            runGuard = guard;
          }
        } else if (bit === "0" && runStart !== -1) {
          rects.push({ start: runStart, end: i - 1, guard: runGuard });
          runStart = -1;
        }
      }
      if (runStart !== -1) rects.push({ start: runStart, end: bits.value.length - 1, guard: runGuard });

      return { w, hSvg, scale, normalH, guardH, textH, rects, quiet, code: ean.value };
    });

    return () => {
      const m = svgModel.value;
      if (!m) return null;

      return h(
        "svg",
        {
          width: m.w,
          height: m.hSvg,
          viewBox: `0 0 ${m.w} ${m.hSvg}`,
          role: "img",
          "aria-label": "Barcode EAN-13",
          style: { display: "block" },
        },
        [
          // fondo blanco
          h("rect", { x: 0, y: 0, width: m.w, height: m.hSvg, fill: "#fff" }),

          // barras
          ...m.rects.map((r, idx) =>
            h("rect", {
              key: idx,
              x: (m.quiet + r.start) * m.scale,
              y: 6,
              width: (r.end - r.start + 1) * m.scale,
              height: r.guard ? m.guardH : m.normalH,
              fill: "#000",
            })
          ),

          // dígitos
          h(
            "text",
            {
              x: m.w / 2,
              y: m.guardH + m.textH,
              "text-anchor": "middle",
              "font-size": 14,
              fill: "#111",
              "font-family":
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            },
            m.code
          ),
        ]
      );
    };
  },
});


/* ===========================
   MOCK DATA EN MEMORIA
=========================== */
const mockSheetsBase = [
  {
    id: "sh_001",
    nombre: "Monofocal CR-39",
    sku: "MF-CR39-001",
    tipo_matriz: "SPH_CYL",
    material: "CR-39",
    tratamientos: ["AR", "UV"],
    deleted: false,
    updatedAtShort: "2025-11-29",
    updatedBy: "Benja",
  },
  {
    id: "sh_002",
    nombre: "Progresivo Digital",
    sku: "PG-DIG-214",
    tipo_matriz: "BASE_ADD",
    material: "Policarbonato",
    tratamientos: ["AR", "BlueCut"],
    deleted: false,
    updatedAtShort: "2025-11-28",
    updatedBy: "Majo",
  },
  {
    id: "sh_003",
    nombre: "Bifocal FT-28",
    sku: "BF-FT28-077",
    tipo_matriz: "SPH_ADD",
    material: "CR-39",
    tratamientos: ["UV"],
    deleted: true,
    updatedAtShort: "2025-10-02",
    updatedBy: "Admin",
  },
];

function makeRow({ sheetId, sku, existencias, codebar, base, sph, cyl, add, eye, base_izq, base_der }) {
  return { sheetId, sku, existencias, codebar, base, sph, cyl, add, eye, base_izq, base_der };
}

const mockItemsBase = [
  makeRow({ sheetId: "sh_001", sku: "MF-CR39-001-A", existencias: 12, codebar: "2790000000011", sph: -1.25, cyl: -0.5 }),
  makeRow({ sheetId: "sh_001", sku: "MF-CR39-001-B", existencias: 0,  codebar: "2790000000028", sph: -2.0,  cyl: -0.25 }),
  makeRow({ sheetId: "sh_001", sku: "MF-CR39-001-C", existencias: 7,  codebar: "2790000000035", sph: 0.0,   cyl: -1.0 }),
  makeRow({ sheetId: "sh_001", sku: "MF-CR39-001-D", existencias: 3,  codebar: "2790000000042", sph: 1.5,   cyl: -0.75 }),
  makeRow({ sheetId: "sh_001", sku: "MF-CR39-001-E", existencias: 1,  codebar: "2790000000059", sph: 2.25,  cyl: -0.25 }),

  makeRow({ sheetId: "sh_002", sku: "PG-DIG-214-A", existencias: 5, codebar: "2790000000103", add: 2.0, eye: "OD", base_izq: 1.0, base_der: 1.5 }),
  makeRow({ sheetId: "sh_002", sku: "PG-DIG-214-B", existencias: 2, codebar: "2790000000110", add: 2.5, eye: "OI", base_izq: 0.5, base_der: 1.0 }),
  makeRow({ sheetId: "sh_002", sku: "PG-DIG-214-C", existencias: 0, codebar: "2790000000127", add: 3.0, eye: "OD", base_izq: 1.5, base_der: 2.0 }),

  makeRow({ sheetId: "sh_003", sku: "BF-FT28-077-A", existencias: 9, codebar: "2790000000202", sph: -1.0, add: 2.0, eye: "OD" }),
  makeRow({ sheetId: "sh_003", sku: "BF-FT28-077-B", existencias: 0, codebar: "2790000000219", sph: 0.5,  add: 1.5, eye: "OI" }),
];

function mkLine(id, spec, qty) {
  return { id, spec, qty, picked: 0 };
}

const mockOrdersBase = [
  {
    id: "ord_1001",
    folio: "PED-1001",
    cliente: "Óptica Luz",
    nota: "Urgente",
    createdAtShort: "2025-11-29 10:12",
    sheetId: "sh_001",
    status: "pendiente",
    lines: [
      mkLine("l1", { sph: -1.25, cyl: -0.5 }, 2),
      mkLine("l2", { sph: 0.0,   cyl: -1.0 }, 1),
    ],
  },
];

/* ===========================
   STATE (MOCK)
=========================== */
const activeMainTab = ref("pedidos");
const mode = ref("crear"); // crear | surtir
const includeDeleted = ref(false);

const sheetQuery = ref("");
const itemQuery = ref("");
const stockFilter = ref("withStock");
const itemsLimit = ref(5000);

const scanCode = ref("");
const correctionOpen = ref(false);

const correction = reactive({
  orderId: "ord_1001",
  codebar: "",
  message: "",
});

// barcode modal
const barcodeOpen = ref(false);
const barcodeValue = ref("");

const lastUpdatedHuman = computed(() => "5m");

// “DB” en memoria
const sheetsDB = ref(structuredClone(mockSheetsBase));
const itemsDB = ref(structuredClone(mockItemsBase));
const ordersDB = ref(structuredClone(mockOrdersBase));

const selectedSheetId = ref(sheetsDB.value.find((s) => !s.deleted)?.id || sheetsDB.value[0]?.id || "");
const selectedOrderId = ref(ordersDB.value[0]?.id || "");

/* ===========================
   SHEETS
=========================== */
const selectedSheet = computed(() => sheetsDB.value.find((s) => s.id === selectedSheetId.value) || null);

const filteredSheets = computed(() => {
  let s = sheetsDB.value.slice();
  if (!includeDeleted.value) s = s.filter((x) => !x.deleted);

  const q = sheetQuery.value.trim().toLowerCase();
  if (q) {
    s = s.filter((x) => {
      const hay = [x.nombre, x.material, (x.tratamientos || []).join(" "), x.tipo_matriz, x.sku].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }
  return s;
});

watch(filteredSheets, () => {
  const exists = filteredSheets.value.some((s) => s.id === selectedSheetId.value);
  if (!exists) selectedSheetId.value = filteredSheets.value[0]?.id || "";
});

const recentSheets = computed(() => filteredSheets.value.slice(0, 5));

const selectedSheetLabel = computed(() => {
  const s = selectedSheet.value;
  return s ? `${s.tipo_matriz} · ${s.material}` : "—";
});

function sheetById(id) {
  return sheetsDB.value.find((s) => s.id === id) || null;
}
function sheetNameById(id) {
  return sheetById(id)?.nombre || "—";
}
function prettyTrat(trats) {
  if (!trats) return "—";
  if (Array.isArray(trats)) return trats.length ? trats.join(", ") : "—";
  return String(trats || "—");
}
function sheetTitle(s) {
  const t = prettyTrat(s?.tratamientos);
  const sku = s?.sku ? ` · ${s.sku}` : "";
  return `${s?.nombre || "Sin nombre"} · ${s?.material || "—"} · ${t}${sku}`;
}

/* ===========================
   ITEMS
=========================== */
const itemsForSelected = computed(() => {
  const sid = selectedSheetId.value;
  if (!sid) return [];
  let arr = itemsDB.value.filter((r) => r.sheetId === sid);
  arr = arr.slice(0, Number(itemsLimit.value || 5000));
  return arr;
});

function fmt(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  const fixed = num.toFixed(2);
  return fixed.endsWith(".00") ? fixed.slice(0, -3) : fixed.replace(/0$/, "");
}

function buildRowTitle(row, sheet) {
  const tipo = sheet?.tipo_matriz;
  if (!tipo) return "Producto";

  if (tipo === "BASE") return `Base ${fmt(row.base)} D`;
  if (tipo === "SPH_CYL") return `Monofocal · Esfera ${fmt(row.sph)} · Cilindro ${fmt(row.cyl)}`;
  if (tipo === "SPH_ADD") return `Bifocal · Esfera ${fmt(row.sph)} · Adición ${fmt(row.add)} · ${row.eye || "OD"}`;
  if (tipo === "BASE_ADD") return `Progresivo · ADD ${fmt(row.add)} · ${row.eye || "OD"} · BI ${fmt(row.base_izq)} / BD ${fmt(row.base_der)}`;

  return `${tipo}`;
}

function buildRowParams(row, sheet) {
  const tipo = sheet?.tipo_matriz;
  if (tipo === "SPH_CYL") return `SPH ${fmt(row.sph)} · CYL ${fmt(row.cyl)}`;
  if (tipo === "SPH_ADD") return `SPH ${fmt(row.sph)} · ADD ${fmt(row.add)} · ${row.eye || "OD"}`;
  if (tipo === "BASE_ADD") return `ADD ${fmt(row.add)} · ${row.eye || "OD"} · BI ${fmt(row.base_izq)} · BD ${fmt(row.base_der)}`;
  if (tipo === "BASE") return `BASE ${fmt(row.base)}`;
  return "";
}

const filteredItems = computed(() => {
  let data = itemsForSelected.value.slice();

  if (stockFilter.value === "withStock") data = data.filter((r) => Number(r.existencias || 0) > 0);
  if (stockFilter.value === "zero") data = data.filter((r) => Number(r.existencias || 0) <= 0);

  const q = itemQuery.value.trim().toLowerCase();
  if (q) {
    data = data.filter((r) => {
      const hay = [
        r.codebar,
        r.existencias,
        r.base,
        r.sph,
        r.cyl,
        r.add,
        r.eye,
        r.base_izq,
        r.base_der,
        buildRowTitle(r, selectedSheet.value),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }
  return data;
});

/* ===========================
   CREAR PEDIDO DESDE INVENTARIO (DRAFT)
=========================== */
const draftCliente = ref("Óptica Demo");
const draftNote = ref("");
const draftLines = ref([]);

// specKey agrupa por propiedades, NO por codebar
function specKeyFromRow(row, sheet) {
  const tipo = sheet?.tipo_matriz;
  if (tipo === "SPH_CYL") return `SPH:${Number(row.sph)}|CYL:${Number(row.cyl)}`;
  if (tipo === "SPH_ADD") return `SPH:${Number(row.sph)}|ADD:${Number(row.add)}|EYE:${String(row.eye || "OD")}`;
  if (tipo === "BASE_ADD") return `ADD:${Number(row.add)}|EYE:${String(row.eye || "OD")}|BI:${Number(row.base_izq)}|BD:${Number(row.base_der)}`;
  if (tipo === "BASE") return `BASE:${Number(row.base)}`;
  return row.sku || row.codebar || "X";
}

function specFromRow(row, sheet) {
  const tipo = sheet?.tipo_matriz;
  if (tipo === "SPH_CYL") return { sph: Number(row.sph), cyl: Number(row.cyl) };
  if (tipo === "SPH_ADD") return { sph: Number(row.sph), add: Number(row.add), eye: String(row.eye || "OD") };
  if (tipo === "BASE_ADD") return { add: Number(row.add), eye: String(row.eye || "OD"), base_izq: Number(row.base_izq), base_der: Number(row.base_der) };
  if (tipo === "BASE") return { base: Number(row.base) };
  return { sku: row.sku || null };
}

function addToDraft(row) {
  const sheet = selectedSheet.value;
  if (!sheet) return;

  const key = specKeyFromRow(row, sheet);
  const found = draftLines.value.find((l) => l.key === key);
  const title = buildRowTitle(row, sheet);

  if (found) found.qty = Math.max(1, Number(found.qty || 1) + 1);
  else {
    draftLines.value.push({
      key,
      title,
      qty: 1,
      stock: Number(row.existencias || 0),
      spec: specFromRow(row, sheet),
    });
  }
  toast("Agregado al pedido (mock)", "is-success");
}

function removeDraftLine(key) {
  draftLines.value = draftLines.value.filter((l) => l.key !== key);
}
function incDraftQty(key) {
  const l = draftLines.value.find((x) => x.key === key);
  if (!l) return;
  l.qty = Number(l.qty || 1) + 1;
}
function decDraftQty(key) {
  const l = draftLines.value.find((x) => x.key === key);
  if (!l) return;
  l.qty = Math.max(1, Number(l.qty || 1) - 1);
}
function clearDraft() {
  draftLines.value = [];
  toast("Pedido limpiado (mock)", "is-light");
}

function nextFolio() {
  // PED-1001, PED-1002...
  const nums = ordersDB.value
    .map((o) => Number(String(o.folio || "").replace(/[^\d]/g, "")))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 1000;
  return `PED-${max + 1}`;
}

function createOrderFromDraft() {
  const sheet = selectedSheet.value;
  if (!sheet) return;

  if (!draftLines.value.length) {
    toast("Agrega líneas primero.", "is-warning");
    return;
  }

  const created = {
    id: `ord_${crypto?.randomUUID ? crypto.randomUUID() : String(Date.now())}`,
    folio: nextFolio(),
    cliente: String(draftCliente.value || "Óptica").trim() || "Óptica",
    nota: String(draftNote.value || "").trim(),
    createdAtShort: new Date().toISOString().slice(0, 16).replace("T", " "),
    sheetId: sheet.id,
    status: "pendiente",
    lines: draftLines.value.map((l, idx) => mkLine(`l${idx + 1}`, structuredClone(l.spec), Number(l.qty || 1))),
  };

  ordersDB.value.unshift(created);
  selectedOrderId.value = created.id;

  // reset draft
  draftLines.value = [];
  draftNote.value = "";
  toast(`Pedido creado: ${created.folio} (mock)`, "is-success");
}

/* ===========================
   SURTIR PEDIDO POR ESCANEO (SALIDA)
=========================== */
const selectedOrder = computed(() => ordersDB.value.find((o) => o.id === selectedOrderId.value) || null);

function itemMatchesLine(item, lineSpec, sheetTipo) {
  if (!lineSpec) return false;
  if (sheetTipo === "SPH_CYL") {
    return Number(item.sph) === Number(lineSpec.sph) && Number(item.cyl) === Number(lineSpec.cyl);
  }
  if (sheetTipo === "SPH_ADD") {
    return (
      Number(item.sph) === Number(lineSpec.sph) &&
      Number(item.add) === Number(lineSpec.add) &&
      String(item.eye || "OD") === String(lineSpec.eye || "OD")
    );
  }
  if (sheetTipo === "BASE_ADD") {
    return (
      Number(item.add) === Number(lineSpec.add) &&
      String(item.eye || "OD") === String(lineSpec.eye || "OD") &&
      Number(item.base_izq) === Number(lineSpec.base_izq) &&
      Number(item.base_der) === Number(lineSpec.base_der)
    );
  }
  if (sheetTipo === "BASE") return Number(item.base) === Number(lineSpec.base);
  return false;
}

function lineHuman(line, sheet) {
  const tipo = sheet?.tipo_matriz;
  const s = line?.spec || {};
  if (tipo === "SPH_CYL") return `Monofocal · SPH ${fmt(s.sph)} · CYL ${fmt(s.cyl)}`;
  if (tipo === "SPH_ADD") return `Bifocal · SPH ${fmt(s.sph)} · ADD ${fmt(s.add)} · ${s.eye || "OD"}`;
  if (tipo === "BASE_ADD") return `Progresivo · ADD ${fmt(s.add)} · ${s.eye || "OD"} · BI ${fmt(s.base_izq)} / BD ${fmt(s.base_der)}`;
  if (tipo === "BASE") return `Base ${fmt(s.base)} D`;
  return "Línea";
}

function orderTotalCount(order) {
  return order.lines.reduce((acc, l) => acc + Number(l.qty || 0), 0);
}
function orderPickedCount(order) {
  return order.lines.reduce((acc, l) => acc + Math.min(Number(l.picked || 0), Number(l.qty || 0)), 0);
}
function orderProgressPct(order) {
  const total = orderTotalCount(order);
  if (!total) return 0;
  return Math.round((orderPickedCount(order) / total) * 100);
}
function isOrderComplete(order) {
  return order.lines.every((l) => Number(l.picked || 0) >= Number(l.qty || 0));
}

function scanAndDispatch() {
  const code = String(scanCode.value || "").trim();
  if (!code) return;

  const order = selectedOrder.value;
  if (!order) {
    toast("Selecciona un pedido.", "is-warning");
    return;
  }

  // buscar item por codebar GLOBAL (inventario real/virtual)
  const item = itemsDB.value.find((r) => String(r.codebar || "").trim() === code);
  if (!item) {
    toast("Código no encontrado en inventario (mock).", "is-danger");
    return;
  }

  // validar que sea de la misma planilla del pedido
  if (item.sheetId !== order.sheetId) {
    toast("Ese código pertenece a otra planilla (mock).", "is-warning");
    return;
  }

  if (Number(item.existencias || 0) <= 0) {
    toast("Encontrado, pero stock = 0 (mock).", "is-warning");
    return;
  }

  const sheet = sheetById(order.sheetId);
  const tipo = sheet?.tipo_matriz;

  // buscar línea pendiente que matchee por SPEC
  const line = order.lines.find((l) => {
    const pending = Number(l.picked || 0) < Number(l.qty || 0);
    return pending && itemMatchesLine(item, l.spec, tipo);
  });

  if (!line) {
    toast("El código no corresponde a ninguna línea pendiente (mock).", "is-danger");
    return;
  }

  // ✅ marcar salida
  line.picked = Number(line.picked || 0) + 1;

  // ✅ decrementar stock (mock)
  item.existencias = Math.max(0, Number(item.existencias || 0) - 1);

  // estado
  if (isOrderComplete(order)) order.status = "cerrado";
  else if (orderPickedCount(order) > 0) order.status = "parcial";

  toast("Salida registrada (mock).", "is-success");
  scanCode.value = "";
}

function resetPickedForSelectedOrder() {
  const order = selectedOrder.value;
  if (!order) return;
  order.lines.forEach((l) => (l.picked = 0));
  order.status = "pendiente";
  toast("Surtido reiniciado (mock).", "is-light");
}

function closeOrderMock() {
  const order = selectedOrder.value;
  if (!order) return;
  if (!isOrderComplete(order)) {
    toast("Aún faltan líneas por surtir (mock).", "is-warning");
    return;
  }
  order.status = "cerrado";
  toast("Pedido cerrado (mock).", "is-success");
}

/* ===========================
   CATÁLOGO
=========================== */
const catalogQuery = ref("");
const catalogFilter = ref("withStock");
const catalogPage = ref(1);
const catalogPageSize = ref(18);

const catalogRows = computed(() =>
  itemsForSelected.value.map((r, idx) => ({ ...r, _k: `${r.codebar || r.sku || idx}-${idx}` }))
);

const filteredCatalogRows = computed(() => {
  let data = catalogRows.value.slice();

  if (catalogFilter.value === "withStock") data = data.filter((r) => Number(r.existencias || 0) > 0 && r.codebar);
  if (catalogFilter.value === "allCodes") data = data.filter((r) => !!r.codebar);

  const q = catalogQuery.value.trim().toLowerCase();
  if (q) {
    data = data.filter((r) => {
      const hay = [
        r.codebar,
        r.sku,
        r.existencias,
        r.sph,
        r.cyl,
        r.add,
        r.base_izq,
        r.base_der,
        buildRowTitle(r, selectedSheet.value),
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }
  return data;
});

const catalogPages = computed(() => Math.max(1, Math.ceil(filteredCatalogRows.value.length / catalogPageSize.value)));

const paginatedCatalog = computed(() => {
  const page = Math.min(Math.max(1, catalogPage.value), catalogPages.value);
  const start = (page - 1) * catalogPageSize.value;
  return filteredCatalogRows.value.slice(start, start + catalogPageSize.value);
});

watch([filteredCatalogRows, selectedSheetId], () => {
  catalogPage.value = 1;
});

/* ===========================
   STATUS
=========================== */
function statusHuman(st) {
  if (st === "cerrado") return "Cerrado";
  if (st === "parcial") return "Parcial";
  return "Pendiente";
}
function statusTagClass(st) {
  if (st === "cerrado") return "is-success";
  if (st === "parcial") return "is-warning";
  return "";
}

/* ===========================
   BARCODE helpers
=========================== */
function isEan13(code) {
  const d = String(code || "").replace(/\D/g, "");
  return d.length === 13;
}
function openBarcode(code) {
  barcodeValue.value = String(code || "");
  barcodeOpen.value = true;
}

/* ===========================
   Buttons / toast / clipboard
=========================== */
function noop() {
  toast("Acción mock (sin backend)", "is-light");
}

function resetMock() {
  sheetsDB.value = structuredClone(mockSheetsBase);
  itemsDB.value = structuredClone(mockItemsBase);
  ordersDB.value = structuredClone(mockOrdersBase);

  selectedSheetId.value = sheetsDB.value.find((s) => !s.deleted)?.id || sheetsDB.value[0]?.id || "";
  selectedOrderId.value = ordersDB.value[0]?.id || "";
  mode.value = "crear";

  draftCliente.value = "Óptica Demo";
  draftNote.value = "";
  draftLines.value = [];

  scanCode.value = "";
  sheetQuery.value = "";
  itemQuery.value = "";
  catalogQuery.value = "";

  barcodeOpen.value = false;
  barcodeValue.value = "";

  toast("Mock recargado", "is-success");
}

function submitCorrectionMock() {
  correctionOpen.value = false;
  toast("Solicitud enviada (mock)", "is-warning");
  correction.orderId = selectedOrderId.value || correction.orderId;
  correction.codebar = "";
  correction.message = "";
}

async function copyCodebar(codebar) {
  const code = String(codebar || "").trim();
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    toast("Código copiado", "is-success");
  } catch {
    toast("No se pudo copiar", "is-danger");
  }
}

function toast(message, type = "is-primary") {
  const b = window?.$buefy;
  if (b?.toast?.open) b.toast.open({ message, type, duration: 2000 });
  else console.log(`[toast:${type}]`, message);
}

const totalCodes = computed(() => itemsDB.value.reduce((acc, r) => acc + (r.codebar ? 1 : 0), 0));
</script>

<style scoped>
/* Evita “saltos” por scrollbar entre tabs/layout */
.laboratorio-section {
  border-radius: 14px;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  scrollbar-gutter: stable both-edges;
}

/* ============ Theme (RSBO-ish) ============ */
.lab-view {
  --p: #906fe1;
  --p2: #7957d5;
  --card: rgba(255, 255, 255, 0.86);
  --card2: rgba(255, 255, 255, 0.72);
  --border: rgba(148, 163, 184, 0.22);
  --shadow: 0 14px 40px rgba(15, 23, 42, 0.10);
  --shadow2: 0 18px 55px rgba(15, 23, 42, 0.14);
}

.lab-hero {
  display: flex;
  gap: 1.2rem;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.lab-title {
  font-size: 1.6rem;
  font-weight: 900;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.lab-title__dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--p), #ec4899);
  box-shadow: 0 0 0 4px rgba(144, 111, 225, 0.12);
}

.lab-subtitle {
  margin: 0.35rem 0 0;
  color: rgba(107, 114, 128, 0.95);
  font-weight: 700;
  font-size: 0.95rem;
}

.lab-chips {
  margin-top: 0.75rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.chip {
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.68);
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  font-weight: 800;
  color: rgba(17, 24, 39, 0.9);
}

.chip--soft {
  background: rgba(144, 111, 225, 0.10);
  border-color: rgba(144, 111, 225, 0.22);
}

.lab-hero__right {
  min-width: min(520px, 100%);
}

.lab-hero__actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.6rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.glass {
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--card2);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow);
  overflow: hidden;
  padding: 0.75rem;
}

/* Mantén altura estable entre tabs */
.main-tabs :deep(.tab-content) {
  min-height: 860px;
}

.main-tabs :deep(.tabs) {
  margin-bottom: 0.75rem;
}

.main-tabs :deep(.tabs a) {
  border-radius: 14px !important;
  font-weight: 900;
}

.main-tabs :deep(.tabs li.is-active a) {
  background: linear-gradient(135deg, rgba(144, 111, 225, 0.18), rgba(236, 72, 153, 0.10));
  border-color: rgba(144, 111, 225, 0.35);
}

.panel {
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--card);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.panel--sticky {
  position: sticky;
  top: 0.85rem;
}

.panel__head {
  padding: 1rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.85rem;
  flex-wrap: wrap;
}

.panel__head--compact {
  padding: 0.85rem 1rem;
}

.panel__title {
  margin: 0;
  font-weight: 1000;
  font-size: 1.05rem;
  color: rgba(17, 24, 39, 0.95);
}

.panel__hint {
  margin: 0.25rem 0 0;
  color: rgba(107, 114, 128, 0.95);
  font-weight: 700;
  font-size: 0.85rem;
}

.panel__badge {
  margin-left: 0.5rem;
  font-size: 0.78rem;
  font-weight: 950;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(144, 111, 225, 0.25);
  background: rgba(144, 111, 225, 0.10);
}

.panel__headActions {
  display: flex;
  gap: 0.6rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.panel__body {
  padding: 1rem;
}

.nice-table :deep(.table) {
  border-radius: 14px;
  overflow: hidden;
}

.nice-table :deep(.table thead th) {
  background: rgba(144, 111, 225, 0.10);
  color: rgba(17, 24, 39, 0.85);
  font-weight: 1000;
  border: none;
}

.nice-table :deep(.table td) {
  vertical-align: middle;
}

.qty-pill {
  display: inline-flex;
  min-width: 48px;
  justify-content: center;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  font-weight: 1000;
  border: 1px solid rgba(148, 163, 184, 0.22);
}

.qty-pill--ok {
  background: rgba(35, 209, 96, 0.12);
  border-color: rgba(35, 209, 96, 0.28);
  color: rgba(17, 24, 39, 0.9);
}

.qty-pill--zero {
  background: rgba(255, 56, 96, 0.08);
  border-color: rgba(255, 56, 96, 0.22);
  color: rgba(17, 24, 39, 0.86);
}

.prod__name {
  font-weight: 950;
  color: rgba(17, 24, 39, 0.92);
}

.prod__meta {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
  margin-top: 0.15rem;
}

.meta-k {
  font-size: 0.82rem;
  color: rgba(107, 114, 128, 0.95);
  font-weight: 700;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.big-code {
  font-weight: 1000;
}

.order-lines {
  display: grid;
  gap: 0.6rem;
}

.order-line {
  border: 1px solid rgba(148, 163, 184, 0.20);
  background: rgba(255, 255, 255, 0.72);
  border-radius: 16px;
  padding: 0.75rem;
}

.order-line--done {
  border-color: rgba(35, 209, 96, 0.28);
  background: rgba(35, 209, 96, 0.08);
}

.order-line__top {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.order-line__title {
  font-weight: 950;
  color: rgba(17, 24, 39, 0.9);
}

.order-line__sub {
  display: block;
  margin-top: 0.15rem;
  font-weight: 800;
  color: rgba(107, 114, 128, 0.95);
  font-size: 0.82rem;
}

.order-line__bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.6rem;
}

.qty-control {
  display: flex;
  gap: 0.35rem;
  align-items: center;
}

.qty-input :deep(.input) {
  width: 78px;
  text-align: center;
  border-radius: 14px;
}

.stock-hint {
  font-weight: 900;
  color: rgba(107, 114, 128, 0.95);
}

.recent {
  display: grid;
  gap: 0.4rem;
}

.recent__item {
  position: relative;
  display: grid;
  grid-template-columns: 92px 1fr 18px;
  gap: 0.75rem;
  align-items: center;
  padding: 0.65rem 0.75rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.75);
  text-decoration: none;
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.recent__item:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow2);
}

.recent__id {
  font-weight: 1000;
  color: rgba(17, 24, 39, 0.88);
}

.recent__line {
  font-weight: 800;
  color: rgba(17, 24, 39, 0.84);
  font-size: 0.86rem;
}

.recent__line--muted {
  color: rgba(107, 114, 128, 0.95);
  font-size: 0.8rem;
}

.recent__chev {
  color: rgba(107, 114, 128, 0.85);
}

.sheet-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.72);
  border-radius: 18px;
  padding: 0.9rem;
}

.sheet-card__top {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
}

.sheet-card__title {
  font-weight: 1000;
  color: rgba(17, 24, 39, 0.92);
}

.sheet-card__meta {
  margin-top: 0.6rem;
  display: grid;
  gap: 0.25rem;
  font-weight: 800;
  color: rgba(107, 114, 128, 0.95);
}

.sheet-card__actions {
  margin-top: 0.85rem;
}

.soft-hr {
  border: none;
  border-top: 1px dashed rgba(148, 163, 184, 0.35);
  margin: 1rem 0;
}

.qr-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 1024px) {
  .qr-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 650px) {
  .qr-grid {
    grid-template-columns: 1fr;
  }
}

.qr-card {
  text-align: left;
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.20);
  background: rgba(255, 255, 255, 0.76);
  border-radius: 18px;
  padding: 0.85rem;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.08);
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.qr-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow2);
}

.qr-card__head {
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
  align-items: flex-start;
}

.qr-card__title {
  font-weight: 1000;
  color: rgba(17, 24, 39, 0.92);
}

.qr-card__meta {
  margin-top: 0.45rem;
  display: grid;
  gap: 0.2rem;
}

.meta-line {
  font-weight: 800;
  color: rgba(107, 114, 128, 0.95);
  font-size: 0.83rem;
}

.meta-line--muted {
  color: rgba(107, 114, 128, 0.88);
}

.qty-tag {
  font-weight: 1000;
  border-radius: 999px;
}

.qr-card__qr {
  margin-top: 0.65rem;
  border-radius: 14px;
  border: 1px dashed rgba(17, 24, 39, 0.18);
  background: rgba(255, 255, 255, 0.88);
  min-height: 160px;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 0.6rem;
}

.barcode-wrap {
  width: 100%;
  display: flex;
  justify-content: center;
}

.barcode-fallback {
  font-weight: 900;
  color: rgba(107, 114, 128, 0.95);
}

.qr-card__foot {
  margin-top: 0.55rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 900;
  color: rgba(107, 114, 128, 0.95);
  font-size: 0.82rem;
}

.foot-hint {
  background: rgba(144, 111, 225, 0.10);
  border: 1px solid rgba(144, 111, 225, 0.22);
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
}

.empty {
  padding: 2.2rem 1rem;
  text-align: center;
  color: rgba(107, 114, 128, 0.95);
}

.empty--mini {
  padding: 1.2rem 0.75rem;
}

.empty__icon {
  font-size: 1.6rem;
  color: rgba(144, 111, 225, 0.9);
}

.empty__title {
  margin: 0.5rem 0 0;
  font-weight: 1000;
  color: rgba(17, 24, 39, 0.9);
}

.empty__text {
  margin: 0.25rem 0 0;
  font-weight: 800;
}

.pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
}

.pager__text {
  font-weight: 950;
  color: rgba(17, 24, 39, 0.85);
}

.progress-bar {
  height: 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.20);
  background: rgba(255, 255, 255, 0.65);
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: linear-gradient(135deg, rgba(144, 111, 225, 0.95), rgba(236, 72, 153, 0.75));
  border-radius: 999px;
}

.mini-order-head {
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.72);
  border-radius: 16px;
  padding: 0.75rem;
}

.mini-order-title {
  font-weight: 1000;
  color: rgba(17, 24, 39, 0.9);
}

.mini-order-sub {
  margin-top: 0.15rem;
  font-weight: 800;
  color: rgba(107, 114, 128, 0.95);
  font-size: 0.82rem;
}

.barcode-modal__code {
  font-weight: 1000;
  font-size: 1rem;
  margin-bottom: .75rem;
  text-align: center;
}
.barcode-modal__img {
  display: flex;
  justify-content: center;
  padding: .5rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255,255,255,.85);
  border-radius: 16px;
}

.barcode-wrap svg {
  max-width: 100%;
  height: auto;
}

</style>

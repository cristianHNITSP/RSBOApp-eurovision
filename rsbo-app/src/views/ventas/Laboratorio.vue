<template>
  <section class="lab-view laboratorio-section" v-motion-fade-visible-once>
    <LabHero />

    <div class="glass">
      <b-tabs v-model="lab.activeMainTab.value" type="is-toggle" class="main-tabs" expanded :animated="false">
        <b-tab-item value="pedidos" label="Pedidos" icon="clipboard-list">
          <PedidosTab />
        </b-tab-item>

        <b-tab-item value="bandeja" label="Bandeja" icon="inbox">
          <BandejaTab />
        </b-tab-item>

        <b-tab-item value="catalogo" label="Catálogo" icon="qrcode">
          <CatalogoTab />
        </b-tab-item>

        <b-tab-item value="correcciones" label="Correcciones" icon="tools">
          <CorreccionesTab />
        </b-tab-item>
      </b-tabs>
    </div>

    <BarcodeModal />
    <CorrectionModal />

  </section>
</template>

<script setup>
import { provide } from "vue";
import { useLaboratorioApi } from "@/composables/useLaboratorioApi";

import LabHero from "@/components/laboratorio/LabHero.vue";
import PedidosTab from "@/components/laboratorio/PedidosTab.vue";
import BandejaTab from "@/components/laboratorio/BandejaTab.vue";
import CatalogoTab from "@/components/laboratorio/CatalogoTab.vue";
import CorreccionesTab from "@/components/laboratorio/Correccionestab.vue";
import BarcodeModal from "@/components/laboratorio/modals/BarcodeModal.vue";
import CorrectionModal from "@/components/laboratorio/modals/CorrectionModal.vue";

const lab = useLaboratorioApi();
provide("lab", lab);
</script>

<style>
/* Mantén altura estable entre tabs */
.main-tabs :deep(.tab-content) {
  min-height: 860px;
}

@media (max-width: 520px) {
  .main-tabs :deep(.tabs ul) {
    flex-wrap: wrap;
    gap: 0.4rem;
  }
}
</style>

<style>
.laboratorio-section {
  border-radius: 14px;
  padding: 1.5rem;
  border: 1px solid var(--border-solid);
  box-shadow: var(--shadow-soft);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  scrollbar-gutter: stable both-edges;
}

.lab-hero {
  display: flex;
  gap: 1.2rem;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  padding: 1rem 1.25rem;
  border-radius: 14px;
  background:
    radial-gradient(circle at 0 0,   rgba(79, 70, 229, 0.12),  transparent 55%),
    radial-gradient(circle at 100% 0, rgba(236, 72, 153, 0.10), transparent 55%),
    radial-gradient(circle at 60% 100%, rgba(249, 115, 22, 0.10), transparent 55%),
    var(--surface-solid);
  border: 1px solid var(--border);
}

.lab-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--c-primary);
  background: var(--c-primary-alpha);
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  margin-bottom: 0.35rem;
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


.lab-chips {
  margin-top: 0.75rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.chip {
  border: 1px solid var(--border);
  background: var(--surface-overlay);
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  font-weight: 800;
  color: var(--text-primary);
  font-size: 0.82rem;
  display: inline-flex;
  align-items: center;
}

.chip--soft {
  background: var(--c-primary-alpha);
  border-color: var(--c-primary-alpha);
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
  -webkit-backdrop-filter: blur(var(--fx-blur));
  backdrop-filter: blur(var(--fx-blur));
  box-shadow: var(--shadow);
  overflow: hidden;
  padding: 0.75rem;
}

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
  border-bottom: 1px solid var(--border);
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
  color: var(--text-primary);
}

.panel__hint {
  margin: 0.25rem 0 0;
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.85rem;
}

.panel__badge {
  margin-left: 0.5rem;
  font-size: 0.78rem;
  font-weight: 950;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  border: 1px solid var(--c-primary-alpha);
  background: var(--c-primary-alpha);
}

.panel__headActions {
  display: flex;
  gap: 0.6rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.panel__body {
  padding: 1rem;
  position: relative;
}

/* Tables */
.nice-table :deep(.table) {
  border-radius: 14px;
  overflow: hidden;
}

.nice-table :deep(.table thead th) {
  background: var(--c-primary-alpha);
  color: var(--text-primary);
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
  border: 1px solid var(--border);
}

.qty-pill--ok {
  background: var(--c-success-alpha);
  border-color: var(--c-success-alpha);
}

.qty-pill--zero {
  background: var(--c-danger-alpha);
  border-color: var(--c-danger-alpha);
}

.prod__name {
  font-weight: 950;
  color: var(--text-primary);
}

.prod__meta {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
  margin-top: 0.15rem;
}

.meta-k {
  font-size: 0.82rem;
  color: var(--text-muted);
  font-weight: 700;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.big-code {
  font-weight: 1000;
}

/* Order lines */
.order-lines {
  display: grid;
  gap: 0.6rem;
}

.order-line {
  border: 1px solid var(--border);
  background: var(--surface-overlay);
  border-radius: 16px;
  padding: 0.75rem;
}

.order-line--done {
  border-color: var(--c-success-alpha);
  background: var(--c-success-alpha);
}

.order-line__top {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.order-line__title {
  font-weight: 950;
  color: var(--text-primary);
}

.order-line__sub {
  display: block;
  margin-top: 0.15rem;
  font-weight: 800;
  color: var(--text-muted);
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
  color: var(--text-muted);
}

/* Sheet card */
.sheet-card {
  border: 1px solid var(--border);
  background: var(--surface-overlay);
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
  color: var(--text-primary);
}

.sheet-card__meta {
  margin-top: 0.6rem;
  display: grid;
  gap: 0.25rem;
  font-weight: 800;
  color: var(--text-muted);
}

.sheet-card__actions {
  margin-top: 0.85rem;
}

.soft-hr {
  border: none;
  border-top: 1px dashed var(--border);
  margin: 1rem 0;
}

/* QR Catalog grid */
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
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 18px;
  padding: 0.85rem;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.qr-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}

.qr-card__head {
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
  align-items: flex-start;
}

.qr-card__title {
  font-weight: 1000;
  color: var(--text-primary);
}

.qr-card__meta {
  margin-top: 0.45rem;
  display: grid;
  gap: 0.2rem;
}

.meta-line {
  font-weight: 800;
  color: var(--text-muted);
  font-size: 0.83rem;
}

.meta-line--muted {
  color: var(--text-muted);
}

.qty-tag {
  font-weight: 1000;
  border-radius: 999px;
}

.qr-card__qr {
  margin-top: 0.65rem;
  border-radius: 14px;
  border: 1px dashed var(--border);
  background: var(--surface-solid);
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
  color: var(--text-muted);
}

.qr-card__foot {
  margin-top: 0.55rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 900;
  color: var(--text-muted);
  font-size: 0.82rem;
}

.foot-hint {
  background: var(--c-primary-alpha);
  border: 1px solid var(--c-primary-alpha);
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
}

/* Empty states */
.empty {
  padding: 2.2rem 1rem;
  text-align: center;
  color: var(--text-muted);
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
  color: var(--text-primary);
}

.empty__text {
  margin: 0.25rem 0 0;
  font-weight: 800;
}

/* Pager */
.pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
}

.pager__text {
  font-weight: 950;
  color: var(--text-primary);
}

/* Progress bar (surtir) */
.progress-bar {
  height: 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-overlay);
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: linear-gradient(135deg, rgba(144, 111, 225, 0.95), rgba(236, 72, 153, 0.75));
  border-radius: 999px;
  transition: width 300ms ease;
}

/* Mini order head */
.mini-order-head {
  border: 1px solid var(--border);
  background: var(--surface-overlay);
  border-radius: 16px;
  padding: 0.75rem;
}

.mini-order-title {
  font-weight: 1000;
  color: var(--text-primary);
}

.mini-order-sub {
  margin-top: 0.15rem;
  font-weight: 800;
  color: var(--text-muted);
  font-size: 0.82rem;
}

/* Barcode modal */
.barcode-modal__code {
  font-weight: 1000;
  font-size: 1.1rem;
  margin-bottom: .35rem;
  text-align: center;
  color: var(--text-primary);
}

.barcode-modal__img {
  display: flex;
  justify-content: center;
  padding: .75rem;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 16px;
}

.barcode-wrap svg {
  max-width: 100%;
  height: auto;
}

/* Muted utility */
.muted {
  color: var(--text-muted);
  font-weight: 700;
}
</style>

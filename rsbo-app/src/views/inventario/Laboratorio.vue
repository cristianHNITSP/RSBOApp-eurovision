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
      </b-tabs>
    </div>

    <BarcodeModal />
    <CorrectionModal />
  </section>
</template>

<script setup>
import { provide } from "vue";
import { useLaboratorioApi } from "../../composables/useLaboratorioApi";

import LabHero from "../../components/laboratorio/LabHero.vue";
import PedidosTab from "../../components/laboratorio/PedidosTab.vue";
import BandejaTab from "../../components/laboratorio/BandejaTab.vue";
import CatalogoTab from "../../components/laboratorio/CatalogoTab.vue";

import BarcodeModal from "../../components/laboratorio/modals/BarcodeModal.vue";
import CorrectionModal from "../../components/laboratorio/modals/CorrectionModal.vue";

const lab = useLaboratorioApi();
provide("lab", lab);
</script>

<style>
/* ...tu CSS ORIGINAL (sin cambios obligatorios) ... */

/* Mantén altura estable entre tabs */
.main-tabs :deep(.tab-content) {
  min-height: 860px;
}

/* (Opcional) si 3 tabs te quedan muy apretados en móvil, esto ayuda */
@media (max-width: 520px) {
  .main-tabs :deep(.tabs ul) {
    flex-wrap: wrap;
    gap: 0.4rem;
  }
}
</style>

<style>
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
  background: rgba(255, 255, 255, .85);
  border-radius: 16px;
}

.barcode-wrap svg {
  max-width: 100%;
  height: auto;
}
</style>

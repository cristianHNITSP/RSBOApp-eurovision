<script setup>
// Buscador global — Buefy/Bulma + Teleport nativo de Vue.
//  · Desktop (≥1024, hay espacio): INPUT real que despliega su menú ANCLADO debajo
//    (Teleport to body, posicionado bajo el input). Ancho del menú = ancho del input.
//  · Touch (≤1023, no cabe el input): botón ICONO alineado al end → abre un <b-modal>.
// El breakpoint decide el MODO (comportamiento), no solo la visibilidad.
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useBreakpoint } from "@/composables/ui/useBreakpoint.js";
import { useGlobalSearch } from "@/composables/search/useGlobalSearch.js";
import SearchDropdown from "./SearchDropdown.vue";
import "./search.css";

const { isTouch } = useBreakpoint();
const isDesktop = computed(() => !isTouch.value);

const open = ref(false);
const anchor = ref(null);     // wrapper del input (para medir y anclar el menú)
const panel = ref(null);      // panel anclado (teleport)
const deskInput = ref(null);
const modalInput = ref(null);
const pos = ref({ top: 0, left: 0, width: 0 });

const ctrl = useGlobalSearch({ onClose: () => close() });

function updatePos() {
  const el = anchor.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  pos.value = { top: Math.round(r.bottom + 6), left: Math.round(r.left), width: Math.round(r.width) };
}
const anchoredStyle = computed(() => ({
  top: pos.value.top + "px",
  left: pos.value.left + "px",
  width: pos.value.width + "px",
}));

function domInput() {
  const r = isDesktop.value ? deskInput.value : modalInput.value;
  return r?.$el?.querySelector("input") || null;
}
function openPanel() {
  open.value = true;
  ctrl.open();
  nextTick(() => { updatePos(); domInput()?.focus(); });
}
function openModal() {
  open.value = true;
  nextTick(() => domInput()?.focus());
}
function close() { open.value = false; }

// Cierre al click fuera (solo menú anclado de desktop; el modal lo gestiona Buefy).
function onDocMouseDown(e) {
  if (!open.value || !isDesktop.value) return;
  if (anchor.value?.contains(e.target) || panel.value?.contains(e.target)) return;
  close();
}
function onReflow() { if (open.value && isDesktop.value) updatePos(); }

// Ctrl/⌘ + K
function onKey(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    isDesktop.value ? openPanel() : openModal();
  }
}

onMounted(() => {
  document.addEventListener("keydown", onKey);
  document.addEventListener("mousedown", onDocMouseDown, true);
  window.addEventListener("resize", onReflow, { passive: true });
  window.addEventListener("scroll", onReflow, { passive: true, capture: true });
});
onUnmounted(() => {
  document.removeEventListener("keydown", onKey);
  document.removeEventListener("mousedown", onDocMouseDown, true);
  window.removeEventListener("resize", onReflow);
  window.removeEventListener("scroll", onReflow, true);
});

// Cambio de breakpoint con el panel abierto → cerrar para evitar estados híbridos.
watch(isDesktop, () => close());
</script>

<template>
  <div class="gs-root" :class="isDesktop ? 'gs-root--input' : 'gs-root--icon'">
    <!-- ── DESKTOP: input con menú anclado (Teleport) ───────────────────────── -->
    <template v-if="isDesktop">
      <div ref="anchor" class="gs-anchor">
        <b-input
          ref="deskInput"
          v-model="ctrl.query.value"
          rounded expanded icon-pack="fas" icon="search"
          placeholder="Buscar planillas, dioptrías, óptica…"
          :icon-right="ctrl.query.value ? 'times-circle' : ''" icon-right-clickable
          autocomplete="off"
          @focus="openPanel"
          @input="ctrl.onInput(); open = true; updatePos()"
          @keydown.down.prevent="ctrl.moveCursor(1)"
          @keydown.up.prevent="ctrl.moveCursor(-1)"
          @keydown.enter.prevent="ctrl.selectCurrent()"
          @keydown.esc="close()"
          @icon-right-click="ctrl.clear()"
        />
      </div>


        <div v-if="open" ref="panel" class="gs-anchored" :style="anchoredStyle" role="listbox">
          <div class="gs-anchored__panel">
            <div class="gs-modal-results">
              <SearchDropdown :ctrl="ctrl" />
            </div>
          </div>
        </div>
     
    </template>

    <!-- ── TOUCH: icono al end + modal ──────────────────────────────────────── -->
    <template v-else>
      <b-button
        class="gs-iconbtn"
        type="is-light" icon-pack="fas" icon-right="search" aria-label="Buscar"
        @click="openModal"
      />      
      <Teleport to="body">
      <b-modal
        v-model="open"
        :width="560" scroll="keep"
        :can-cancel="['escape', 'outside']"
        aria-role="dialog" aria-modal
      >
        <article class="panel is-primary gs-modal">
          <div class="panel-block">
            <b-input
              ref="modalInput"
              v-model="ctrl.query.value"
              expanded rounded icon-pack="fas" icon="search"
              placeholder="Buscar planillas, dioptrías, óptica…"
              :icon-right="ctrl.query.value ? 'times-circle' : ''" icon-right-clickable
              autocomplete="off"
              @input="ctrl.onInput()"
              @keydown.down.prevent="ctrl.moveCursor(1)"
              @keydown.up.prevent="ctrl.moveCursor(-1)"
              @keydown.enter.prevent="ctrl.selectCurrent()"
              @icon-right-click="ctrl.clear()"
            />
          </div>
          <div class="gs-modal-results">
            <SearchDropdown :ctrl="ctrl" />
          </div>
        </article>
      </b-modal>

      </Teleport>

    </template>
  </div>
</template>

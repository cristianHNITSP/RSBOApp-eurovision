<template>
  <section class="prefs-wrap">
    <header class="page-section-header mb-4">
      <div>
        <span class="config-pill">
          <b-icon icon="sliders-h" size="is-small" class="mr-1" />
          Preferencias
        </span>
        <h2>Preferencias de apariencia</h2>
        <p class="psh-desc">Personaliza el tema, tipografía, contraste y efectos visuales de la interfaz.</p>
      </div>
    </header>

    <div class="prefs-grid">
      <PrefsCard icon="palette" title="Apariencia" tag="UI">
        <PrefsRow
          label="Modo oscuro"
          help="Ajuste el tema para tu preferencia visual."
        >
          <template #control>
            <b-switch v-model="isDark" type="is-primary" passive-type="is-light" />
          </template>
        </PrefsRow>
      </PrefsCard>

      <PrefsCard icon="text-height" title="Tipografía" tag="Texto">
        <PrefsRow
          label="Tamaño de fuente"
          help="Ajusta el tamaño de la fuente para una mejor comodidad."
        >
          <template #control>
            <b-field class="m-0">
              <b-select v-model="fontSize" expanded>
                <option value="xs">Extra pequeña</option>
                <option value="sm">Pequeña</option>
                <option value="md">Mediana</option>
                <option value="lg">Grande</option>
              </b-select>
            </b-field>
          </template>
        </PrefsRow>
      </PrefsCard>

      <PrefsCard icon="tachometer-alt" title="Rendimiento visual" tag="FX" :wide="true">
        <PrefsRow
          label="Efectos reducidos"
          help="Ajusta el menú para reducir blur y gradientes (util para equipos viejos)."
        >
          <template #control>
            <b-button
              :type="reducedEffects ? 'is-primary' : 'is-light'"
              icon-pack="fas"
              :icon-left="reducedEffects ? 'eye-slash' : 'eye'"
              @click="toggleReduced"
            >
              {{ reducedEffects ? 'ON' : 'OFF' }}
            </b-button>
          </template>
        </PrefsRow>
      </PrefsCard>

      <PrefsCard icon="running" title="Movimiento" tag="A11Y" :wide="true">
        <PrefsRow
          label="Reducir movimiento"
          help="Elimina animaciones de transición para reducir mareos (independiente de efectos)."
        >
          <template #control>
            <b-button
              :type="reducedMotion ? 'is-primary' : 'is-light'"
              icon-pack="fas"
              :icon-left="reducedMotion ? 'ban' : 'arrows-alt'"
              @click="toggleMotion"
            >
              {{ reducedMotion ? 'ON' : 'OFF' }}
            </b-button>
          </template>
        </PrefsRow>
      </PrefsCard>

      <PrefsCard icon="adjust" title="Contraste" tag="Visual">
        <PrefsRow
          label="Alto contraste"
          help="Aumenta el contraste de texto y bordes."
        >
          <template #control>
            <b-button
              :type="highContrast ? 'is-primary' : 'is-light'"
              icon-pack="fas"
              icon-left="circle"
              @click="toggleHighContrast"
            >
              {{ highContrast ? 'ON' : 'OFF' }}
            </b-button>
          </template>
        </PrefsRow>
      </PrefsCard>

      <PrefsCard icon="font" title="Legibilidad" tag="Texto">
        <PrefsRow
          label="Fuente legible"
          help="Usa una fuente diseñada para dislexia y baja visión."
        >
          <template #control>
            <b-button
              :type="readableFont ? 'is-primary' : 'is-light'"
              icon-pack="fas"
              :icon-left="readableFont ? 'check' : 'times'"
              @click="toggleFont"
            >
              {{ readableFont ? 'ON' : 'OFF' }}
            </b-button>
          </template>
        </PrefsRow>
      </PrefsCard>

      <PrefsCard icon="mouse-pointer" title="Navegación por teclado" tag="A11Y" :wide="true">
        <PrefsRow
          label="Indicador de enfoque"
          help="Muestra un borde visible alrededor del elemento activo al navegar con teclado."
        >
          <template #control>
            <b-button
              :type="focusOutline ? 'is-primary' : 'is-light'"
              icon-pack="fas"
              :icon-left="focusOutline ? 'eye' : 'eye-slash'"
              @click="toggleFocus"
            >
              {{ focusOutline ? 'ON' : 'OFF' }}
            </b-button>
          </template>
        </PrefsRow>
      </PrefsCard>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import './Preferencias.css';

import PrefsCard from '@/components/config/PrefsCard.vue';
import PrefsRow  from '@/components/config/PrefsRow.vue';
import { useAccessibility } from '@/composables/ui/useAccessibility';

const {
  state: a11y,
  setTheme,
  setFontSize,
  toggleReducedEffects,
  toggleContrast,
  toggleReadableFont,
  toggleFocusOutline,
  toggleReducedMotion,
} = useAccessibility();

const isDark         = ref(a11y.resolvedTheme === 'dark');
const reducedEffects = ref(a11y.reducedEffects);
const fontSize       = ref(a11y.fontSize);

watch(() => a11y.resolvedTheme,   (val) => { isDark.value         = val === 'dark'; });
watch(() => a11y.reducedEffects,  (val) => { reducedEffects.value = val; });
watch(() => a11y.fontSize,        (val) => { fontSize.value       = val; });

watch(fontSize, (val) => { setFontSize(val); });
watch(isDark,   (val) => {
  const target = val ? 'dark' : 'light';
  if (a11y.theme !== target) setTheme(target);
});

const highContrast  = computed(() => a11y.contrast === 'high');
const readableFont  = computed(() => a11y.readableFont);
const focusOutline  = computed(() => a11y.focusOutline);
const reducedMotion = computed(() => a11y.resolvedReducedMotion);

function toggleReduced()      { toggleReducedEffects(); }
function toggleHighContrast() { toggleContrast(); }
function toggleFont()         { toggleReadableFont(); }
function toggleFocus()        { toggleFocusOutline(); }
function toggleMotion()       { toggleReducedMotion(); }
</script>

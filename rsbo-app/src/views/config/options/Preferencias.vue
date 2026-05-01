<!-- rsbo-app/src/views/config/options/Preferencias.vue -->
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
            <!-- Apariencia -->
            <div class="prefs-card">
                <div class="prefs-card__head">
                    <div class="prefs-title">
                        <b-icon icon="palette" size="is-small" class="mr-2" />
                        Apariencia
                    </div>
                    <b-tag type="is-light" rounded size="is-small">UI</b-tag>
                </div>

                <div class="prefs-row">
                    <div class="prefs-row__left">
                        <p class="prefs-label">Modo oscuro</p>
                        <p class="prefs-help">Ajuste el tema para tu preferencia visual.</p>

                    </div>

                    <div class="prefs-row__right">
                        <b-button :type="isDark ? 'is-dark' : 'is-light'" icon-pack="fas" icon-left="adjust"
                            @click="toggleDark">
                            {{ isDark ? "Activado" : "Desactivado" }}
                        </b-button>
                    </div>
                </div>
            </div>

            <!-- Tipografía -->
            <div class="prefs-card">
                <div class="prefs-card__head">
                    <div class="prefs-title">
                        <b-icon icon="text-height" size="is-small" class="mr-2" />
                        Tipografía
                    </div>
                    <b-tag type="is-light" rounded size="is-small">Texto</b-tag>
                </div>

                <div class="prefs-row">
                    <div class="prefs-row__left">
                        <p class="prefs-label">Tamaño de fuente</p>
                        <p class="prefs-help">Ajusta el tamaño de la fuente para una mejor comodidad.</p>

                    </div>

                    <div class="prefs-row__right">
                        <b-field class="m-0">
                            <!-- ✅ SIN @change: usamos watch(fontSize) para enviar string real -->
                            <b-select v-model="fontSize" expanded>
                                <option value="xs">Extra pequeña</option>
                                <option value="sm">Pequeña</option>
                                <option value="md">Mediana</option>
                                <option value="lg">Grande</option>
                            </b-select>
                        </b-field>
                    </div>
                </div>
            </div>

            <!-- Rendimiento visual -->
            <div class="prefs-card prefs-card--wide">
                <div class="prefs-card__head">
                    <div class="prefs-title">
                        <b-icon icon="tachometer-alt" size="is-small" class="mr-2" />
                        Rendimiento visual
                    </div>
                    <b-tag type="is-light" rounded size="is-small">FX</b-tag>
                </div>

                <div class="prefs-row">
                    <div class="prefs-row__left">
                        <p class="prefs-label">Efectos reducidos</p>
                        <p class="prefs-help">Ajusta el menú para reducir blur y gradientes (util para equipos viejos).</p>
                    </div>

                    <div class="prefs-row__right">
                        <b-button :type="reducedEffects ? 'is-primary' : 'is-light'" icon-pack="fas"
                            :icon-left="reducedEffects ? 'eye-slash' : 'eye'" @click="toggleReduced">
                            {{ reducedEffects ? "ON" : "OFF" }}
                        </b-button>
                    </div>
                </div>


            </div>

            <!-- Accesibilidad: Movimiento -->
            <div class="prefs-card prefs-card--wide">
                <div class="prefs-card__head">
                    <div class="prefs-title">
                        <b-icon icon="running" size="is-small" class="mr-2" />
                        Movimiento
                    </div>
                    <b-tag type="is-light" rounded size="is-small">A11Y</b-tag>
                </div>
                <div class="prefs-row">
                    <div class="prefs-row__left">
                        <p class="prefs-label">Reducir movimiento</p>
                        <p class="prefs-help">Elimina animaciones de transición para reducir mareos (independiente de efectos).</p>
                    </div>
                    <div class="prefs-row__right">
                        <b-button :type="reducedMotion ? 'is-primary' : 'is-light'" icon-pack="fas"
                            :icon-left="reducedMotion ? 'ban' : 'arrows-alt'" @click="toggleMotion">
                            {{ reducedMotion ? "ON" : "OFF" }}
                        </b-button>
                    </div>
                </div>
            </div>

            <!-- Accesibilidad: Contraste y fuente -->
            <div class="prefs-card">
                <div class="prefs-card__head">
                    <div class="prefs-title">
                        <b-icon icon="adjust" size="is-small" class="mr-2" />
                        Contraste
                    </div>
                    <b-tag type="is-light" rounded size="is-small">Visual</b-tag>
                </div>
                <div class="prefs-row">
                    <div class="prefs-row__left">
                        <p class="prefs-label">Alto contraste</p>
                        <p class="prefs-help">Aumenta el contraste de texto y bordes.</p>
                    </div>
                    <div class="prefs-row__right">
                        <b-button :type="highContrast ? 'is-primary' : 'is-light'" icon-pack="fas"
                            :icon-left="highContrast ? 'circle' : 'circle'" @click="toggleHighContrast">
                            {{ highContrast ? "ON" : "OFF" }}
                        </b-button>
                    </div>
                </div>
            </div>

            <!-- Accesibilidad: Tipografía legible -->
            <div class="prefs-card">
                <div class="prefs-card__head">
                    <div class="prefs-title">
                        <b-icon icon="font" size="is-small" class="mr-2" />
                        Legibilidad
                    </div>
                    <b-tag type="is-light" rounded size="is-small">Texto</b-tag>
                </div>
                <div class="prefs-row">
                    <div class="prefs-row__left">
                        <p class="prefs-label">Fuente legible</p>
                        <p class="prefs-help">Usa una fuente diseñada para dislexia y baja visión.</p>
                    </div>
                    <div class="prefs-row__right">
                        <b-button :type="readableFont ? 'is-primary' : 'is-light'" icon-pack="fas"
                            :icon-left="readableFont ? 'check' : 'times'" @click="toggleFont">
                            {{ readableFont ? "ON" : "OFF" }}
                        </b-button>
                    </div>
                </div>
            </div>

            <!-- Accesibilidad: Focus outline -->
            <div class="prefs-card prefs-card--wide">
                <div class="prefs-card__head">
                    <div class="prefs-title">
                        <b-icon icon="mouse-pointer" size="is-small" class="mr-2" />
                        Navegación por teclado
                    </div>
                    <b-tag type="is-light" rounded size="is-small">A11Y</b-tag>
                </div>
                <div class="prefs-row">
                    <div class="prefs-row__left">
                        <p class="prefs-label">Indicador de enfoque</p>
                        <p class="prefs-help">Muestra un borde visible alrededor del elemento activo al navegar con teclado.</p>
                    </div>
                    <div class="prefs-row__right">
                        <b-button :type="focusOutline ? 'is-primary' : 'is-light'" icon-pack="fas"
                            :icon-left="focusOutline ? 'eye' : 'eye-slash'" @click="toggleFocus">
                            {{ focusOutline ? "ON" : "OFF" }}
                        </b-button>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useAccessibility } from "@/composables/ui/useAccessibility";

const {
    state: a11y,
    toggleTheme,
    setFontSize,
    toggleReducedEffects,
    toggleContrast,
    toggleReadableFont,
    toggleFocusOutline,
    toggleReducedMotion,
} = useAccessibility();

const isDark = ref(a11y.resolvedTheme === "dark");
const reducedEffects = ref(a11y.reducedEffects);
const fontSize = ref(a11y.fontSize);

/* Sincronizar isDark cuando el estado externo cambie */
watch(() => a11y.resolvedTheme, (val) => { isDark.value = val === "dark"; });

/* Sincronizar reducedEffects cuando el estado externo cambie */
watch(() => a11y.reducedEffects, (val) => { reducedEffects.value = val; });

/* Sincronizar el select cuando el estado externo cambie */
watch(() => a11y.fontSize, (val) => { fontSize.value = val; });

/* Propagar cambios del select al composable */
watch(fontSize, (val) => { setFontSize(val); });

const highContrast = computed(() => a11y.contrast === "high");
const readableFont = computed(() => a11y.readableFont);
const focusOutline = computed(() => a11y.focusOutline);
const reducedMotion = computed(() => a11y.resolvedReducedMotion);

function toggleDark() { toggleTheme(); }
function toggleReduced() { toggleReducedEffects(); }
function toggleHighContrast() { toggleContrast(); }
function toggleFont() { toggleReadableFont(); }
function toggleFocus() { toggleFocusOutline(); }
function toggleMotion() { toggleReducedMotion(); }
</script>

<style scoped>
.prefs-wrap {
    border-radius: 12px;
    padding: 1.25rem;
    background: linear-gradient(135deg, var(--bg-subtle) 0%, var(--bg-muted) 100%);
    box-shadow: var(--shadow-sm);
    border-bottom: 1px solid var(--border-solid);
}

.config-pill {
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
    margin-bottom: 1rem;
}

.prefs-grid {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 0.9rem;
}

.prefs-card {
    grid-column: span 6;
    background: var(--surface-solid);
    border: 1px solid var(--border-solid);
    border-radius: 12px;
    padding: 0.95rem;
    box-shadow: var(--shadow-md);
}

.prefs-card--wide {
    grid-column: span 12;
}

.prefs-card__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.7rem;
}

.prefs-title {
    font-weight: 900;
    color: var(--text-primary);
    display: inline-flex;
    align-items: center;
}

.prefs-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.prefs-row__left {
    min-width: 220px;
    flex: 1;
}

.prefs-row__right {
    display: flex;
    justify-content: flex-end;
    min-width: 220px;
}

.prefs-label {
    margin: 0;
    font-weight: 800;
    color: var(--text-primary);
}

.prefs-help {
    margin: 0.25rem 0 0;
    font-size: 0.85rem;
    color: var(--text-muted);
}

.prefs-note {
    margin-top: 0.75rem;
    font-size: 0.82rem;
    color: var(--text-muted);
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
}

@media screen and (max-width: 768px) {
    .prefs-card {
        grid-column: span 12;
    }
}
</style>

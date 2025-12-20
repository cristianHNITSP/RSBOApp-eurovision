<!-- rsbo-app/src/views/config/options/Preferencias.vue -->
<template>
    <section class="prefs-wrap">
        <span class="config-pill">
            <b-icon icon="sliders-h" size="is-small" class="mr-1" />
            Preferencias
        </span>

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
        </div>
    </section>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";

const UI_EVENT = "rsbo:ui";
const FONT_SIZE_KEY = "user-font-size";
const REDUCED_EFFECTS_KEY = "ui-reduced-effects";
const DARK_KEY = "dark-mode";

const isDark = ref(false);
const fontSize = ref("md");
const reducedEffects = ref(false);

function send(type, value) {
    window.dispatchEvent(new CustomEvent(UI_EVENT, { detail: { type, value } }));
}

function syncFromStorage() {
    try {
        isDark.value = localStorage.getItem(DARK_KEY) === "true";
        fontSize.value = localStorage.getItem(FONT_SIZE_KEY) || "md";
        reducedEffects.value = localStorage.getItem(REDUCED_EFFECTS_KEY) === "true";
    } catch { }
}

/* Botones (misma lógica que tú querías) */
function toggleDark() {
    send("toggle-dark");
    syncFromStorage();
}

function toggleReduced() {
    send("toggle-reduced-effects");
    syncFromStorage();
}

/* ✅ CLAVE: mandar SIEMPRE el string real (xs|sm|md|lg) */
watch(fontSize, (val) => {
    send("set-font", val);
    syncFromStorage();
});

onMounted(syncFromStorage);
</script>

<style scoped>
.prefs-wrap {
    border-radius: 12px;
    padding: 1.25rem;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    border-bottom: 1px solid #ccc;
}

.config-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #4f46e5;
    background: #eef2ff;
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
    background: rgba(255, 255, 255, 0.86);
    border: 1px solid rgba(17, 24, 39, 0.08);
    border-radius: 12px;
    padding: 0.95rem;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
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
    color: #111827;
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
    color: #0f172a;
}

.prefs-help {
    margin: 0.25rem 0 0;
    font-size: 0.85rem;
    color: rgba(15, 23, 42, 0.62);
}

.prefs-note {
    margin-top: 0.75rem;
    font-size: 0.82rem;
    color: rgba(15, 23, 42, 0.62);
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

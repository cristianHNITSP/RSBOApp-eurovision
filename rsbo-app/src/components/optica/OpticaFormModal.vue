<script setup>
import { computed, watch } from "vue";
import { labelFor } from "@/composables/optica/useOpticaHelpers";
import { useOpticaSection } from "@/composables/optica/useOpticaSection.js";
import { useOpticaAutocomplete } from "@/composables/optica/useOpticaAutocomplete.js";
import "./OpticaFormModal.css";

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  fm: { type: Object, required: true },
});

const emit = defineEmits(["update:modelValue", "save", "close"]);

const formTitle = computed(() =>
  props.fm.mode === "create"
    ? `Agregar en ${labelFor(props.fm.section)}`
    : `Editar — ${props.fm.item?.sku || ""}`
);

// Diccionarios (select/autocomplete) y sugerencias dinámicas desde el modelo.
const { dictFor } = useOpticaSection();
const dict = computed(() => dictFor(props.fm.section));
// Los selects muestran loading mientras el diccionario de la categoría no esté listo.
const dictReady = computed(() => Object.keys(dict.value || {}).length > 0);
const acx = useOpticaAutocomplete();

// Opciones de un select del diccionario.
const selOpts = (field) => dict.value?.[field]?.options || [];
// Datos filtrados para un autocomplete (semilla + distinct de BD).
const acData = (field) => acx.filtered(props.fm.section, field, props.fm.item?.[field]);

// Al abrir el formulario, precarga los autocompletes de la categoría.
watch(
  () => [props.modelValue, props.fm.section],
  ([open]) => { if (open && props.fm.section) acx.prime(props.fm.section, dict.value); },
  { immediate: true }
);
</script>

<template>
  <Teleport to="body">
    <b-modal
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      has-modal-card
      trap-focus
      :destroy-on-hide="false"
      :can-cancel="['escape', 'outside']"
      scroll="keep"
    >
      <div class="modal-card glass-modal-card glass-modal-card--wide">
        <header class="modal-card-head glass-modal-head">
          <b-icon
            :icon="fm.mode === 'create' ? 'plus-circle' : 'pen'"
            type="is-primary"
            size="is-small"
            class="mr-2"
          />
          <p class="modal-card-title">{{ formTitle }}</p>
          <button
            class="delete is-small ml-auto"
            @click="$emit('close')"
            aria-label="cerrar"
          ></button>
        </header>

        <section class="modal-card-body glass-modal-body">
          <!-- SKU: auto-generado e inmutable. En CREAR no se muestra (no aporta);
               en EDITAR se muestra de solo lectura como referencia. -->
          <b-field v-if="fm.mode === 'edit'" label="SKU">
            <b-input :model-value="fm.item.sku" disabled icon="barcode" />
          </b-field>

          <!-- ── ARMAZONES ── -->
          <template v-if="fm.section === 'armazones'">
            <div class="form-section-title">
              <i class="fas fa-glasses mr-2"></i>Datos del armazón
            </div>
            <div class="form-grid">
              <b-field label="Marca *">
                <b-autocomplete v-model="fm.item.marca" :data="acData('marca')" open-on-focus :clear-on-select="false" placeholder="Ray-Ban" />
              </b-field>
              <b-field label="Modelo *">
                <b-autocomplete v-model="fm.item.modelo" :data="acData('modelo')" open-on-focus :clear-on-select="false" placeholder="RB5154" />
              </b-field>
              <b-field label="Color">
                <b-autocomplete v-model="fm.item.color" :data="acData('color')" open-on-focus :clear-on-select="false" placeholder="Negro/Oro" />
              </b-field>
              <b-field label="Material">
                <b-select v-model="fm.item.material" expanded :loading="!dictReady">
                  <option v-for="m in selOpts('material')" :key="m">{{ m }}</option>
                </b-select>
              </b-field>
              <b-field label="Tipo">
                <b-select v-model="fm.item.tipo" expanded :loading="!dictReady">
                  <option v-for="t in selOpts('tipo')" :key="t">{{ t }}</option>
                </b-select>
              </b-field>
              <b-field label="Género">
                <b-select v-model="fm.item.genero" expanded :loading="!dictReady">
                  <option v-for="g in selOpts('genero')" :key="g">{{ g }}</option>
                </b-select>
              </b-field>
              <b-field label="Talla">
                <b-autocomplete v-model="fm.item.talla" :data="acData('talla')" open-on-focus :clear-on-select="false" placeholder="51-21-145" />
              </b-field>
              <b-field label="Serie">
                <b-autocomplete v-model="fm.item.serie" :data="acData('serie')" open-on-focus :clear-on-select="false" placeholder="CLUB-2024A" />
              </b-field>
              <b-field label="Precio *">
                <b-input v-model.number="fm.item.precio" type="number" min="0" icon="dollar-sign" />
              </b-field>
              <b-field label="Stock *">
                <b-input v-model.number="fm.item.stock" type="number" min="0" icon="layer-group" />
              </b-field>
            </div>
            <b-field label="Incluye estuche" class="mt-3">
              <b-switch v-model="fm.item.estuche">{{
                fm.item.estuche ? "Sí incluye estuche" : "No incluye estuche"
              }}</b-switch>
            </b-field>
            <b-field label="Notas" class="mt-2">
              <b-input v-model="fm.item.notas" type="textarea" rows="2" placeholder="Observaciones adicionales…" />
            </b-field>
          </template>

          <!-- ── SOLUCIONES ── -->
          <template v-else-if="fm.section === 'soluciones'">
            <div class="form-section-title">
              <i class="fas fa-tint mr-2"></i>Datos del producto
            </div>
            <div class="form-grid">
              <b-field label="Nombre *">
                <b-autocomplete v-model="fm.item.nombre" :data="acData('nombre')" open-on-focus :clear-on-select="false" placeholder="ReNu MultiPlus" />
              </b-field>
              <b-field label="Tipo">
                <b-select v-model="fm.item.tipo" expanded :loading="!dictReady">
                  <option v-for="t in selOpts('tipo')" :key="t">{{ t }}</option>
                </b-select>
              </b-field>
              <b-field label="Marca *">
                <b-autocomplete v-model="fm.item.marca" :data="acData('marca')" open-on-focus :clear-on-select="false" placeholder="Alcon" />
              </b-field>
              <b-field label="Volumen (ml) *">
                <b-input v-model.number="fm.item.volumen" type="number" min="0" />
              </b-field>
              <b-field label="Stock *">
                <b-input v-model.number="fm.item.stock" type="number" min="0" />
              </b-field>
              <b-field label="Precio *">
                <b-input v-model.number="fm.item.precio" type="number" min="0" />
              </b-field>
              <b-field label="Fecha caducidad">
                <b-input v-model="fm.item.caducidad" type="date" />
              </b-field>
            </div>
            <b-field label="Notas" class="mt-2">
              <b-input v-model="fm.item.notas" type="textarea" rows="2" />
            </b-field>
          </template>

          <!-- ── ACCESORIOS ── -->
          <template v-else-if="fm.section === 'accesorios'">
            <div class="form-section-title">
              <i class="fas fa-puzzle-piece mr-2"></i>Datos del accesorio
            </div>
            <div class="form-grid">
              <b-field label="Nombre *">
                <b-autocomplete v-model="fm.item.nombre" :data="acData('nombre')" open-on-focus :clear-on-select="false" placeholder="Microfibra premium" />
              </b-field>
              <b-field label="Categoría">
                <b-select v-model="fm.item.categoria" expanded :loading="!dictReady">
                  <option v-for="c in selOpts('categoria')" :key="c">{{ c }}</option>
                </b-select>
              </b-field>
              <b-field label="Marca *">
                <b-autocomplete v-model="fm.item.marca" :data="acData('marca')" open-on-focus :clear-on-select="false" placeholder="Genérico" />
              </b-field>
              <b-field label="Compatible con">
                <b-autocomplete v-model="fm.item.compatible" :data="acData('compatible')" open-on-focus :clear-on-select="false" placeholder="Universal" />
              </b-field>
              <b-field label="Stock *">
                <b-input v-model.number="fm.item.stock" type="number" min="0" />
              </b-field>
              <b-field label="Precio *">
                <b-input v-model.number="fm.item.precio" type="number" min="0" />
              </b-field>
            </div>
            <b-field label="Notas" class="mt-2">
              <b-input v-model="fm.item.notas" type="textarea" rows="2" />
            </b-field>
          </template>

          <!-- ── ESTUCHES ── -->
          <template v-else-if="fm.section === 'estuches'">
            <div class="form-section-title">
              <i class="fas fa-box-open mr-2"></i>Datos del estuche
            </div>
            <div class="form-grid">
              <b-field label="Nombre *">
                <b-autocomplete v-model="fm.item.nombre" :data="acData('nombre')" open-on-focus :clear-on-select="false" placeholder="Estuche rígido" />
              </b-field>
              <b-field label="Tipo">
                <b-select v-model="fm.item.tipo" expanded :loading="!dictReady">
                  <option v-for="t in selOpts('tipo')" :key="t">{{ t }}</option>
                </b-select>
              </b-field>
              <b-field label="Material">
                <b-autocomplete v-model="fm.item.material" :data="acData('material')" open-on-focus :clear-on-select="false" placeholder="Piel sintética" />
              </b-field>
              <b-field label="Color">
                <b-autocomplete v-model="fm.item.color" :data="acData('color')" open-on-focus :clear-on-select="false" placeholder="Café" />
              </b-field>
              <b-field label="Compatible con">
                <b-autocomplete v-model="fm.item.compatible" :data="acData('compatible')" open-on-focus :clear-on-select="false" placeholder="Universal" />
              </b-field>
              <b-field label="Stock *">
                <b-input v-model.number="fm.item.stock" type="number" min="0" />
              </b-field>
              <b-field label="Precio *">
                <b-input v-model.number="fm.item.precio" type="number" min="0" />
              </b-field>
            </div>
            <b-field label="Notas" class="mt-2">
              <b-input v-model="fm.item.notas" type="textarea" rows="2" />
            </b-field>
          </template>

          <!-- ── EQUIPOS ── -->
          <template v-else-if="fm.section === 'equipos'">
            <div class="form-section-title">
              <i class="fas fa-tools mr-2"></i>Datos del equipo
            </div>
            <div class="form-grid">
              <b-field label="Nombre *">
                <b-autocomplete v-model="fm.item.nombre" :data="acData('nombre')" open-on-focus :clear-on-select="false" placeholder="Autorefractómetro" />
              </b-field>
              <b-field label="Tipo">
                <b-select v-model="fm.item.tipo" expanded :loading="!dictReady">
                  <option v-for="a in selOpts('tipo')" :key="a">{{ a }}</option>
                </b-select>
              </b-field>
              <b-field label="Marca *">
                <b-autocomplete v-model="fm.item.marca" :data="acData('marca')" open-on-focus :clear-on-select="false" placeholder="Topcon" />
              </b-field>
              <b-field label="Modelo">
                <b-autocomplete v-model="fm.item.modelo" :data="acData('modelo')" open-on-focus :clear-on-select="false" placeholder="KR-800" />
              </b-field>
              <b-field label="Número de serie">
                <b-autocomplete v-model="fm.item.serie" :data="acData('serie')" open-on-focus :clear-on-select="false" placeholder="TOP-2022-1041" />
              </b-field>
              <b-field label="Estado">
                <b-select v-model="fm.item.estado" expanded :loading="!dictReady">
                  <option v-for="e in selOpts('estado')" :key="e">{{ e }}</option>
                </b-select>
              </b-field>
              <b-field label="Ubicación">
                <b-autocomplete v-model="fm.item.ubicacion" :data="acData('ubicacion')" open-on-focus :clear-on-select="false" placeholder="Consultorio 1" />
              </b-field>
              <b-field label="Fecha adquisición">
                <b-input v-model="fm.item.adquisicion" type="date" />
              </b-field>
              <b-field label="Próx. mantenimiento">
                <b-input v-model="fm.item.mantenimiento" type="date" />
              </b-field>
            </div>
            <b-field label="Notas" class="mt-2">
              <b-input v-model="fm.item.notas" type="textarea" rows="2" />
            </b-field>
          </template>
        </section>

        <footer
          class="modal-card-foot glass-modal-foot"
          style="justify-content: flex-end; gap: 0.5rem"
        >
          <b-button @click="$emit('close')" icon-left="times">Cancelar</b-button>
          <b-button
            type="is-primary"
            :loading="fm.saving"
            icon-left="check"
            @click="$emit('save')"
          >
            {{ fm.mode === "create" ? "Crear elemento" : "Guardar cambios" }}
          </b-button>
        </footer>
      </div>
    </b-modal>
  </Teleport>
</template>

<script setup>
import { computed } from "vue";
import { labelFor } from "@/composables/optica/useOpticaHelpers";
import {
  ARMAZONES_CONFIG,
  SOLUCIONES_CONFIG,
  ACCESORIOS_CONFIG,
  ESTUCHES_CONFIG,
  EQUIPOS_CONFIG,
} from "@/constants/optica.js";
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
          <!-- ... (rest of the sections remain the same) ... -->
        <!-- ── ARMAZONES ── -->
        <template v-if="fm.section === 'armazones'">
          <div class="form-section-title">
            <i class="fas fa-glasses mr-2"></i>Datos del armazón
          </div>
          <div class="form-grid">
            <b-field label="SKU *">
              <b-input v-model="fm.item.sku" placeholder="ARZ-001" />
            </b-field>
            <b-field label="Marca *">
              <b-input v-model="fm.item.marca" placeholder="Ray-Ban" />
            </b-field>
            <b-field label="Modelo *">
              <b-input v-model="fm.item.modelo" placeholder="RB5154" />
            </b-field>
            <b-field label="Color">
              <b-input v-model="fm.item.color" placeholder="Negro/Oro" />
            </b-field>
            <b-field label="Material">
              <b-select v-model="fm.item.material" expanded>
                <option v-for="m in ARMAZONES_CONFIG.materiales" :key="m">
                  {{ m }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Tipo">
              <b-select v-model="fm.item.tipo" expanded>
                <option v-for="t in ARMAZONES_CONFIG.tipos" :key="t">
                  {{ t }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Género">
              <b-select v-model="fm.item.genero" expanded>
                <option v-for="g in ARMAZONES_CONFIG.generos" :key="g">
                  {{ g }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Talla">
              <b-input v-model="fm.item.talla" placeholder="51-21-145" />
            </b-field>
            <b-field label="Serie">
              <b-input v-model="fm.item.serie" placeholder="CLUB-2024A" />
            </b-field>
            <b-field label="Precio *">
              <b-input
                v-model.number="fm.item.precio"
                type="number"
                min="0"
                icon="dollar-sign"
              />
            </b-field>
            <b-field label="Stock *">
              <b-input
                v-model.number="fm.item.stock"
                type="number"
                min="0"
                icon="layer-group"
              />
            </b-field>
          </div>
          <b-field label="Incluye estuche" class="mt-3">
            <b-switch v-model="fm.item.estuche">{{
              fm.item.estuche ? "Sí incluye estuche" : "No incluye estuche"
            }}</b-switch>
          </b-field>
          <b-field label="Notas" class="mt-2">
            <b-input
              v-model="fm.item.notas"
              type="textarea"
              rows="2"
              placeholder="Observaciones adicionales…"
            />
          </b-field>
        </template>

        <!-- ── SOLUCIONES ── -->
        <template v-else-if="fm.section === 'soluciones'">
          <div class="form-section-title">
            <i class="fas fa-tint mr-2"></i>Datos del producto
          </div>
          <div class="form-grid">
            <b-field label="SKU *">
              <b-input v-model="fm.item.sku" placeholder="SOL-001" />
            </b-field>
            <b-field label="Nombre *">
              <b-input v-model="fm.item.nombre" placeholder="ReNu MultiPlus" />
            </b-field>
            <b-field label="Tipo">
              <b-select v-model="fm.item.tipo" expanded>
                <option v-for="t in SOLUCIONES_CONFIG.tipos" :key="t">
                  {{ t }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Marca *">
              <b-input v-model="fm.item.marca" placeholder="Alcon" />
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
            <b-field label="SKU *">
              <b-input v-model="fm.item.sku" placeholder="ACC-001" />
            </b-field>
            <b-field label="Nombre *">
              <b-input
                v-model="fm.item.nombre"
                placeholder="Microfibra premium"
              />
            </b-field>
            <b-field label="Categoría">
              <b-select v-model="fm.item.categoria" expanded>
                <option v-for="c in ACCESORIOS_CONFIG.categorias" :key="c">
                  {{ c }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Marca *">
              <b-input v-model="fm.item.marca" placeholder="Genérico" />
            </b-field>
            <b-field label="Compatible con">
              <b-input v-model="fm.item.compatible" placeholder="Universal" />
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
            <b-field label="SKU *">
              <b-input v-model="fm.item.sku" placeholder="EST-001" />
            </b-field>
            <b-field label="Nombre *">
              <b-input v-model="fm.item.nombre" placeholder="Estuche rígido" />
            </b-field>
            <b-field label="Tipo">
              <b-select v-model="fm.item.tipo" expanded>
                <option v-for="t in ESTUCHES_CONFIG.tipos" :key="t">
                  {{ t }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Material">
              <b-input v-model="fm.item.material" placeholder="Piel sintética" />
            </b-field>
            <b-field label="Color">
              <b-input v-model="fm.item.color" placeholder="Café" />
            </b-field>
            <b-field label="Compatible con">
              <b-input v-model="fm.item.compatible" placeholder="Universal" />
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
            <b-field label="SKU *">
              <b-input v-model="fm.item.sku" placeholder="EQP-001" />
            </b-field>
            <b-field label="Nombre *">
              <b-input
                v-model="fm.item.nombre"
                placeholder="Autorefractómetro"
              />
            </b-field>
            <b-field label="Tipo">
              <b-select v-model="fm.item.tipo" expanded>
                <option v-for="a in EQUIPOS_CONFIG.areas" :key="a">
                  {{ a }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Marca *">
              <b-input v-model="fm.item.marca" placeholder="Topcon" />
            </b-field>
            <b-field label="Modelo">
              <b-input v-model="fm.item.modelo" placeholder="KR-800" />
            </b-field>
            <b-field label="Número de serie">
              <b-input v-model="fm.item.serie" placeholder="TOP-2022-1041" />
            </b-field>
            <b-field label="Estado">
              <b-select v-model="fm.item.estado" expanded>
                <option v-for="e in EQUIPOS_CONFIG.estados" :key="e">
                  {{ e }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Ubicación">
              <b-input v-model="fm.item.ubicacion" placeholder="Consultorio 1" />
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

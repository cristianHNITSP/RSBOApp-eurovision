<!-- rsbo-app/src/components/tabsmanager/actions/ActionDelete.vue -->
<template>
  <div class="action-box danger p-5 mb-4">
    <article class="media is-responsive-action is-align-items-center">
      <!-- Icono -->
      <div class="media-left">
        <div class="action-icon-circle icon-bg-danger">
          <b-icon icon="trash-can" type="is-danger" size="is-medium"></b-icon>
        </div>
      </div>

      <!-- Contenido -->
      <div class="media-content">
        <div class="content mb-0">
          <h4 class="action-title is-size-5 mb-1">Eliminar planilla</h4>
          <p v-if="!isPinned" class="action-desc is-size-7">
            Esta acción es irreversible. Se eliminarán todos los inventarios asociados.
          </p>
          <p v-else class="has-text-warning-dark has-text-weight-bold is-size-7 mt-2">
            <i class="fas fa-info-circle"></i> No se puede eliminar una planilla fijada. Desfíjala primero desde la barra de pestañas.
          </p>
        </div>

        <!-- Acciones -->
        <div class="mt-3" style="min-height: 40px;">
          <transition name="action-fade" mode="out-in">
            <!-- Estado: Botón inicial -->
            <div v-if="!showConfirm" key="initial">
              <b-button 
                type="is-danger" 
                outlined 
                size="is-small" 
                :disabled="disabled" 
                icon-left="trash-can"
                @click="showConfirm = true"
              >
                Eliminar planilla
              </b-button>
            </div>

            <!-- Estado: Confirmación -->
            <div v-else key="confirm" class="is-flex is-align-items-center is-flex-wrap-wrap" style="gap: 0.75rem;">
              <span class="has-text-weight-bold has-text-danger is-size-7">¿Confirmas la eliminación?</span>
              <div class="buttons mb-0">
                <b-button 
                  type="is-danger" 
                  size="is-small" 
                  :loading="loading" 
                  @click="$emit('confirm')"
                >
                  SÍ, ELIMINAR
                </b-button>
                <b-button 
                  type="is-ghost" 
                  size="is-small" 
                  :disabled="loading" 
                  @click="showConfirm = false"
                >
                  Cancelar
                </b-button>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup>
import { ref } from "vue";

defineProps({
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false }
});

defineEmits(["confirm"]);

const showConfirm = ref(false);
</script>

<style scoped src="./ActionCard.css"></style>
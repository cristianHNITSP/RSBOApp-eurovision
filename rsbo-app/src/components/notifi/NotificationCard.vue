<script setup>
/**
 * NotificationCard.vue — Shell de la tarjeta de notificación.
 * El "chrome" (barra de tipo, título, contador, acciones, meta) vive aquí;
 * el CUERPO se delega al componente del tipo (notifi/types/*) vía <component :is>.
 * Añadir un tipo nuevo = nuevo componente + 1 línea en types/index.js.
 */
import { ref, computed } from "vue";
import { TYPE_TAG, TYPE_ICON, timeAgo } from "./shared/useNotifFormat.js";
import { notifBodyComponent } from "./types/index.js";

const props = defineProps({ notif: { type: Object, required: true } });
defineEmits(["toggle-pin", "dismiss"]);

const showMobileMenu = ref(false);

const tagClass = computed(() => TYPE_TAG[props.notif.type] ?? "is-info");
const iconClass = computed(() => TYPE_ICON[props.notif.type] ?? "info-circle");
const isPinned = computed(() => props.notif.isPinned === true);
const bodyComponent = computed(() => notifBodyComponent(props.notif.metadata?.type));
</script>

<template>
  <article
    class="notif-card"
    :data-notif-id="notif._id"
    :class="{ 'notif-card--pinned': isPinned }"
  >
    <div class="notif-type-bar" :class="`notif-type-bar--${notif.type || 'info'}`" />

    <div class="notif-body">
      <!-- Fila superior: icono + título + acciones -->
      <div class="notif-top">
        <b-tag :type="tagClass" size="is-small" rounded class="notif-type-tag">
          <b-icon :icon="iconClass" pack="fas" size="is-small" />
        </b-tag>

        <span class="notif-title">{{ notif.title }}</span>

        <div class="notif-actions is-hidden-mobile">
          <b-tooltip :label="isPinned ? 'Desfijar' : 'Fijar'" position="is-bottom" append-to-body>
            <b-icon :pack="isPinned ? 'fas' : 'far'" icon="star" class="action-icon"
              :class="{ 'action-icon--pinned': isPinned }" @click="$emit('toggle-pin', notif)" />
          </b-tooltip>
          <b-tooltip label="Descartar" position="is-bottom" append-to-body>
            <b-icon pack="fas" icon="times" class="action-icon action-icon--dismiss"
              @click="$emit('dismiss', notif)" />
          </b-tooltip>
        </div>

        <div class="is-hidden-tablet" style="position:relative;margin-left:auto;">
          <b-button type="is-text" size="is-small" icon-pack="fas" icon-left="ellipsis-v"
            @click="showMobileMenu = !showMobileMenu" />
          <transition name="fade-drop">
            <div v-if="showMobileMenu" class="mobile-menu" @click.stop>
              <b-icon :pack="isPinned ? 'fas' : 'far'" icon="star" class="action-icon"
                :class="{ 'action-icon--pinned': isPinned }"
                @click="$emit('toggle-pin', notif); showMobileMenu = false" />
              <b-icon pack="fas" icon="times" class="action-icon action-icon--dismiss"
                @click="$emit('dismiss', notif); showMobileMenu = false" />
            </div>
          </transition>
        </div>
      </div>

      <!-- Cuerpo por tipo (resumen + detalle). Fallback: mensaje plano. -->
      <component
        :is="bodyComponent"
        v-if="bodyComponent"
        :notif="notif"
        @dismiss="$emit('dismiss', $event)"
      />
      <p v-else class="notif-message">{{ notif.message }}</p>

      <!-- Meta: autor + tiempo -->
      <div class="notif-meta">
        <span v-if="notif.createdByName" class="notif-author">
          <b-icon pack="fas" icon="user" size="is-small" />
          {{ notif.createdByName }}
        </span>
        <span class="notif-time">
          <b-icon pack="fas" icon="clock" size="is-small" />
          {{ timeAgo(notif.updatedAt || notif.createdAt) }}
        </span>
      </div>
    </div>
  </article>
</template>

<!-- CSS compartido (no scoped) para que los componentes de tipo reutilicen las
     clases de detalle (detail-panel, level-badge, cell-list, dev-grid, ...). -->
<style src="./NotificationCard.css"></style>

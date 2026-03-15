<script>
import { ref } from 'vue'
import { labToast } from "@/composables/useLabToast.js";
export default {
  name: 'NotificationPanel',
  props: {
    visible: Boolean
  },
  setup() {
    const activeMobileMenu = ref(null)

    function toggleMobileMenu(index) {
      activeMobileMenu.value = activeMobileMenu.value === index ? null : index
    }

    function closeMobileMenu() {
      activeMobileMenu.value = null
    }
    return {
      activeMobileMenu,
      toggleMobileMenu,
      closeMobileMenu,
    }
  },
  data() {
    return {
      initial: { x: 300, opacity: 0 },
      enter: { x: 0, opacity: 1, transition: { duration: 300, easing: 'ease-out' } },
      leave: { x: 300, opacity: 0, transition: { duration: 300, easing: 'ease-in' } },
      notifications: [
        {
          id: 1,
          title: "Pedido recibido",
          message: "Nuevo pedido recibido.",
          details: "Pedido #12345 de cliente Juan Pérez.",
          tagClass: "is-success",
          timeAgo: "hace 2 horas",
          read: false,
          readAt: null,
          icon: "account"
        },
        {
          id: 2,
          title: "Servidor",
          message: "Servidor reiniciado.",
          details: "El servidor principal se reinició correctamente.",
          tagClass: "is-warning",
          timeAgo: "ayer",
          read: false,
          readAt: null,
          icon: "server"
        },
        {
          id: 3,
          title: "Servidor",
          message: "Servidor reiniciado.",
          details: "prueba.",
          tagClass: "is-info",
          timeAgo: "ayer",
          read: false,
          pinned: false,
          readAt: null,
          icon: "server"
        },
        {
          id: 4,
          title: "Servidor",
          message: "Servidor reiniciado.",
          details: "prueba.",
          tagClass: "is-info",
          timeAgo: "ayer",
          read: false,
          pinned: false,
          readAt: null,
          icon: "server"
        },
        {
          id: 5,
          title: "Servidor",
          message: "Servidor reiniciado.",
          details: "prueba.",
          tagClass: "is-info",
          timeAgo: "ayer",
          read: false,
          pinned: false,
          readAt: null,
          icon: "server"
        }
      ]
    }
  },
  watch: {
    notifications: {
      handler() {
        const count = this.notifications.filter(n => !n.read).length;
        this.$emit('update-unread', count);
      },
      deep: true,
      immediate: true
    }
  },
  computed: {
    unreadNotifications() {
      return this.notifications.filter(n => !n.read).length;
    }
  },
  methods: {
    markAsRead(index) {
      const notif = this.notifications[index];
      if (!notif.read) {
        notif.read = true;
        notif.readAt = new Date();

        this.$nextTick(() => {
          const icons = this.$el.querySelectorAll('.notification-item')[index].querySelectorAll('.b-icon');
          const icon = icons[1];
          if (icon) {
            icon.classList.add('scale-bounce');
            setTimeout(() => icon.classList.remove('scale-bounce'), 300);
          }
        });
      }
    },

    deleteNotification(index) {
      const notif = this.notifications[index];

      // ✅ NO permitir eliminar si está fijada
      if (notif.pinned) {
        labToast.warning('No puedes eliminar una notificación fijada.');
        return;
      }

      notif.tooltipActive = false;

      setTimeout(() => {
        const notifEl = this.$el.querySelectorAll('.notification-item')[index];
        if (notifEl) {
          notifEl.classList.add('slide-out-right');
          setTimeout(() => {
            this.notifications.splice(index, 1);
            console.log('Notificación eliminada');
          }, 300);
        }
      }, 50);
    },

    pinNotification(index) {
      const notif = this.notifications[index];
      const wasPinned = notif.pinned;
      notif.pinned = !notif.pinned;

      // ✅ Marcar como leída automáticamente al fijar
      if (notif.pinned && !notif.read) {
        this.markAsRead(index);
      }

      const originalId = notif.id;
      let displacedId = null;
      notif.tooltipActive = false;

      setTimeout(() => {
        if (!notif.pinned) {
          const removed = this.notifications.splice(index, 1)[0];
          const nonPinned = this.notifications.filter(n => !n.pinned);
          const insertAt = nonPinned.findIndex(n => n.originalIndex > removed.originalIndex);
          let realIndex = this.notifications.findIndex(n => !n.pinned);
          if (insertAt !== -1) realIndex += insertAt;
          displacedId = this.notifications[realIndex]?.id;
          this.notifications.splice(insertAt === -1 ? this.notifications.length : realIndex, 0, removed);
        } else {
          this.notifications.sort((a, b) => {
            if (a.pinned === b.pinned) {
              return a.originalIndex - b.originalIndex;
            }
            return a.pinned ? -1 : 1;
          });
          const indexNew = this.notifications.findIndex(n => n.id === originalId);
          displacedId = this.notifications[indexNew + 1]?.id;
        }

        this.$nextTick(() => {
          const els = this.$el.querySelectorAll('.notification-item');
          els.forEach(el => {
            const id = el.getAttribute('data-id');
            if (id == originalId) {
              el.classList.add(notif.pinned ? 'move-up' : 'move-down');
              setTimeout(() => el.classList.remove('move-up', 'move-down'), 300);
            } else if (id == displacedId) {
              el.classList.add(notif.pinned ? 'move-down' : 'move-up');
              setTimeout(() => el.classList.remove('move-up', 'move-down'), 300);
            }
          });
          setTimeout(() => {
            notif.tooltipActive = true;
          }, 300);
        });
      }, 50);

      console.log(`Notificación ${notif.originalIndex} ${notif.pinned ? 'fijada' : 'desfijada'}`);
    },

    hoverIcon(event, isHover) {
      if (isHover) {
        event.target.classList.add('has-text-primary');
        event.target.style.filter = 'drop-shadow(0 0 2px rgba(0,0,0,0.3))';
      } else {
        event.target.classList.remove('has-text-primary');
        event.target.style.filter = '';
      }
    },

    addNotification(notif) {
      notif.originalIndex = this.notifications.length;
      this.notifications.push(notif);
    }
  },
  mounted() {
    this.notifications.forEach((notif, i) => {
      notif.originalIndex = i;
    });
  }
}
</script>


<template>
  <transition name="slide-fade">
    <div v-show="visible" class="notification-panel">
      <div class="aside-container">
        <header class="panel-heading is-flex is-justify-content-space-between is-align-items-center">
          <span class="has-text-weight-semibold">Notificaciones</span>
          <b-button type="is-light" icon-left="close" size="is-small" @click="$emit('close')"
            aria-label="Cerrar panel" />
        </header>

        <div class="notification-list p-4">
          <article class="media notification-item box is-shadowless p-3" v-for="(notif, index) in notifications"
            :key="notif.id" :data-id="notif.id" :class="[
              'mb-3',
              {
                'has-background-info-light': index % 2 === 0 && !notif.read,
                'notification-read': notif.read,
                'pinned-glow': notif.pinned  // <--- Clase para borde brillante animado
              }
            ]">
            <figure class="media-left">
              <b-tag :type="notif.tagClass || 'is-info'" size="is-small" rounded>
                <b-icon :icon="notif.icon || 'information-outline'" size="is-small" />
              </b-tag>
            </figure>

            <div class="media-content">
              <div class="content">
                <div class="is-flex is-justify-content-space-between is-align-items-center mb-2">
                  <p class="is-size-6 has-text-weight-semibold mb-0">{{ notif.title }}</p>

                  <div class="is-flex is-align-items-center has-text-grey is-size-7">
                    <!-- Móvil: Menú personalizado con iconos -->
                    <div class="is-hidden-tablet" style="position: relative;">
                      <b-button type="is-text" size="is-small" icon-left="ellipsis-v"
                        @click="toggleMobileMenu(index)" />

                      <transition name="fade-slide">
                        <div v-if="activeMobileMenu === index" class="custom-mobile-menu" @click.stop>
                          <b-icon :pack="notif.pinned ? 'fas' : 'far'" icon="star" size="is-medium" class="is-clickable"
                            :class="{ 'has-text-warning': notif.pinned }"
                            @click="pinNotification(index); closeMobileMenu()" />
                          <b-icon :icon="notif.read ? 'times-circle' : 'check-circle'" pack="fas" size="is-medium"
                            class="is-clickable" :class="{ 'has-text-success': !notif.read }"
                            @click="!notif.read && markAsRead(index); closeMobileMenu()" />
                          <b-icon icon="trash-alt" pack="fas" size="is-medium" class="is-clickable has-text-danger"
                            @click="deleteNotification(index); closeMobileMenu()" />
                        </div>
                      </transition>
                    </div>

                    <!-- Escritorio: Tooltips como siempre -->
                    <div class="is-hidden-mobile is-flex">
                      <b-tooltip :label="notif.pinned ? 'Desfijar notificación' : 'Fijar notificación'"
                        position="is-bottom" append-to-body>
                        <b-icon :pack="notif.pinned ? 'fas' : 'far'" icon="star" class="mr-2 is-clickable"
                          :class="{ 'has-text-warning': notif.pinned }" @click="pinNotification(index)" />
                      </b-tooltip>

                      <b-tooltip :label="notif.read ? 'Leído' : 'Marcar como leído'" position="is-bottom"
                        append-to-body>
                        <b-icon pack="fas" :icon="notif.read ? 'times-circle' : 'check-circle'" class="mr-2"
                          :class="{ 'is-clickable': !notif.read, 'has-text-success': !notif.read }"
                          @click="!notif.read && markAsRead(index)" />
                      </b-tooltip>

                      <b-tooltip label="Eliminar" position="is-bottom" append-to-body>
                        <b-icon pack="fas" icon="trash-alt" class="is-clickable has-text-danger"
                          @click="deleteNotification(index)" />
                      </b-tooltip>
                    </div>
                  </div>


                </div>

                <p class="mb-1 is-size-7 has-text-dark">{{ notif.message }}</p>
                <p class="mb-1 is-size-7 has-text-grey">{{ notif.details }}</p>

                <div class="is-flex is-flex-direction-column">
                  <small class="has-text-grey is-size-7">
                    <b-icon icon="clock" size="is-small" class="mr-1"></b-icon>
                    {{ notif.timeAgo }}
                  </small>

                  <small v-if="notif.readAt" class="has-text-grey is-size-7 mt-1">
                    <b-icon icon="check-circle" size="is-small" class="mr-1"></b-icon>
                    Leída el {{ new Date(notif.readAt).toLocaleString() }}
                  </small>
                </div>
              </div>
            </div>
          </article>


          <div v-if="notifications.length === 0" class="has-text-centered has-text-grey is-size-6">
            📭 No hay notificaciones
          </div>

        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.notification-panel {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 15;
  width: 285px;
  height: 100%;
  background-color: var(--surface-solid);
  border-left: 1px solid var(--border-solid);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
}

.aside-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-x: hidden;
}

.panel-heading {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-solid);
  background-color: var(--bg-subtle);
  user-select: none;
}

.notification-list {
  overflow-x: hidden;
  flex-grow: 1;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.notification-item {

  border-radius: 6px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-solid);
  transition: background-color 0.2s ease;
}

.notification-item:hover {
  background-color: var(--bg-muted);
}

/*
.notification-read {
  opacity: 0.6;
}
*/
.media-content {
  overflow-x: hidden;
}

b-icon.is-clickable:hover {
  color: var(--c-primary) !important;
}
</style>

<style scoped>
/* Animación de eliminación deslizando a la derecha */
.slide-out-right {
  animation: slideOutRight 0.3s ease forwards;
}

@keyframes slideOutRight {
  0% {
    opacity: 1;
    transform: translateX(0);
  }

  100% {
    opacity: 0;
    transform: translateX(100%);
  }
}

/* Animación desplazamiento entre cartas al fijar */
.move-up {
  animation: slideUp 0.3s ease;
}

.move-down {
  animation: slideDown 0.3s ease;
}

@keyframes slideUp {
  0% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-10px);
    opacity: 0.7;
  }

  100% {
    transform: translateY(0);
  }
}

@keyframes slideDown {
  0% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(10px);
    opacity: 0.7;
  }

  100% {
    transform: translateY(0);
  }
}


/* Animación entrada/salida */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.slide-fade-enter-to,
.slide-fade-leave-from {
  transform: translateX(0);
  opacity: 1;
}

.star-bright {
  color: gold;
  filter: drop-shadow(0 0 6px gold);
}

.notification-read {
  background-color: var(--c-success-alpha) !important;
  color: var(--c-success) !important;
  transform: scale(1.01);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.2);
  transition:
    background-color 0.4s ease,
    color 0.4s ease,
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.notification-read .b-icon {
  color: var(--c-success) !important;
  transition: color 0.3s ease;
}

.b-icon.scale-bounce {
  animation: scaleBounce 0.3s ease;
}

@keyframes scaleBounce {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.25);
  }

  100% {
    transform: scale(1);
  }
}
</style>

<style scoped>
.custom-mobile-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.25rem;
  background-color: var(--surface-solid);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  display: flex;
  gap: 1rem;
  z-index: 20;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>

<style scoped>
/* Borde animado tipo glow que recorre el borde */
.pinned-glow {
  position: relative;
  border-radius: 6px;
  border: 2px solid transparent;
  overflow: visible;
  z-index: 0;
}

.pinned-glow::before {
  content: "";
  position: absolute;
  top: -2px; left: -2px; right: -2px; bottom: -2px;
  border-radius: 6px;

  background: linear-gradient(270deg, #ffcc00, #ff6600, #ffcc00, #ff6600, #ffcc00);
  background-size: 400% 400%;
  animation: glowBorder 3s linear infinite;

  filter: blur(4px);
  opacity: 0.8;

  z-index: -1;

  /* Solo borde visible, enmascaramos el centro */
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: exclude;
  -webkit-mask-composite: destination-out;

  /* Reservamos espacio para el borde */
  padding: 2px;
  box-sizing: border-box;
}

@keyframes glowBorder {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 400% 50%;
  }
}

</style>

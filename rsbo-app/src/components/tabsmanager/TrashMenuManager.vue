<template>
  <div class="trash-menu-container no-drag" v-click-outside="closeMenu" draggable="false">
    <button
      ref="triggerRef"
      class="trash-menu-trigger"
      @click.stop="toggleMenu"
      :class="{ 'is-active': isOpen }"
      title="Papelera de Reciclaje"
      draggable="false"
    >
      <i class="fas fa-trash-alt"></i>
    </button>

    <Teleport to="body">
      <Transition name="popover-fade">
        <TrashPopoverCard
          v-if="isOpen"
          :api-type="apiType"
          :actor="actor"
          @close="closeMenu"
          @restored="handleRestored"
          class="teleported-popover"
          :style="popoverStyle"
        />
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, watch } from "vue";
import TrashPopoverCard from "./TrashPopoverCard.vue";

const props = defineProps({
  apiType: { type: String, default: "inventory" },
  actor: { type: Object, default: null }
});

const emit = defineEmits(["restored"]);

const isOpen = ref(false);
const triggerRef = ref(null);
const popoverStyle = ref({ position: 'fixed', top: '0px', left: '0px' });

const updatePosition = () => {
  if (!isOpen.value || !triggerRef.value) return;

  const rect = triggerRef.value.getBoundingClientRect();
  const popoverWidth = 340; 
  const gap = 8;
  const padding = 10;
  
  let leftPos = rect.left;
  if (leftPos + popoverWidth > window.innerWidth - padding) {
    leftPos = window.innerWidth - popoverWidth - padding;
  }
  leftPos = Math.max(padding, leftPos);

  const spaceBelow = window.innerHeight - rect.bottom - gap - padding;
  const spaceAbove = rect.top - gap - padding;
  
  const preferredHeight = 450;
  let topPos;
  let maxHeight;

  if (spaceBelow >= preferredHeight || spaceBelow >= spaceAbove) {
    popoverStyle.value = {
      position: 'fixed',
      top: `${rect.bottom + gap}px`,
      left: `${leftPos}px`,
      maxHeight: `${spaceBelow}px`,
      display: 'flex',
      flexDirection: 'column'
    };
  } else {
    popoverStyle.value = {
      position: 'fixed',
      bottom: `${window.innerHeight - rect.top + gap}px`,
      left: `${leftPos}px`,
      maxHeight: `${spaceAbove}px`,
      display: 'flex',
      flexDirection: 'column'
    };
  }
};

const toggleMenu = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    updatePosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
  } else {
    stopTracking();
  }
};

const handleScroll = (event) => {
  if (!isOpen.value) return;
  const popover = document.querySelector('.teleported-popover');
  if (popover && event.target instanceof Node && popover.contains(event.target)) return;
  closeMenu();
};

const stopTracking = () => {
  window.removeEventListener('scroll', handleScroll, true);
  window.removeEventListener('resize', handleScroll);
};

const closeMenu = () => {
  isOpen.value = false;
  stopTracking();
};

const handleRestored = (item) => {
  emit('restored', item);
};

onBeforeUnmount(stopTracking);

watch(isOpen, (val) => {
  if (!val) stopTracking();
});

const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (event) => {
      const popover = document.querySelector('.teleported-popover');
      if (popover && event.target instanceof Node && popover.contains(event.target)) return;
      if (!(el === event.target || (event.target instanceof Node && el.contains(event.target)))) {
        binding.value(event);
      }
    };
    document.addEventListener('mousedown', el._clickOutside);
  },
  unmounted(el) {
    document.removeEventListener('mousedown', el._clickOutside);
  }
};
</script>

<style scoped>
.trash-menu-container {
  position: relative;
  display: inline-block;
}

.trash-menu-trigger {
  background: var(--surface-overlay);
  border: 1px solid var(--border);
  color: var(--text-subtle);
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  backdrop-filter: blur(5px);
}

.trash-menu-trigger:hover {
  background: var(--c-danger-alpha);
  border-color: rgba(239, 68, 68, 0.3);
  color: var(--c-danger);
  transform: translateY(-1px);
}

.trash-menu-trigger.is-active {
  background: var(--c-danger);
  border-color: var(--c-danger);
  color: white;
  box-shadow: 0 0 15px var(--c-danger-alpha);
}

.teleported-popover {
  z-index: 10000;
}

.popover-fade-enter-active,
.popover-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.popover-fade-enter-from,
.popover-fade-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}
</style>

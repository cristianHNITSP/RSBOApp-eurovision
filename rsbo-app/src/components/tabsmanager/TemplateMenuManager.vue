<template>
  <div class="template-menu-container no-drag" v-click-outside="closeMenu" draggable="false">
    <button
      ref="triggerRef"
      class="template-menu-trigger"
      @click.stop="toggleMenu"
      :class="{ 'is-active': isOpen }"
      title="Gestión de Plantillas"
      draggable="false"
    >
      <i class="fas fa-th-large"></i>
    </button>

    <Teleport to="body">
      <Transition name="popover-fade">
        <TemplatePopoverCard
          v-if="isOpen"
          :api-type="apiType"
          @close="closeMenu"
          class="teleported-popover"
          :style="popoverStyle"
        />
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, watch } from "vue";
import TemplatePopoverCard from "./TemplatePopoverCard.vue";

const props = defineProps({
  apiType: { type: String, default: "inventory" }
});

const isOpen = ref(false);
const triggerRef = ref(null);
const popoverStyle = ref({ position: 'fixed', top: '0px', left: '0px' });
let _rafId = null;

const updatePosition = () => {
  if (!isOpen.value || !triggerRef.value) return;

  const rect = triggerRef.value.getBoundingClientRect();
  const popoverWidth = 320; 
  const gap = 8;
  const padding = 10; // Margin from screen edges
  
  // 1. Calculate horizontal position
  let leftPos = rect.left;
  if (leftPos + popoverWidth > window.innerWidth - padding) {
    leftPos = window.innerWidth - popoverWidth - padding;
  }
  leftPos = Math.max(padding, leftPos);

  // 2. Calculate vertical position and max-height
  const spaceBelow = window.innerHeight - rect.bottom - gap - padding;
  const spaceAbove = rect.top - gap - padding;
  
  const preferredHeight = 500; // Expected height of the popover
  let topPos;
  let maxHeight;

  if (spaceBelow >= preferredHeight || spaceBelow >= spaceAbove) {
    // Open DOWN
    topPos = rect.bottom + gap;
    maxHeight = spaceBelow;
  } else {
    // Open UP
    maxHeight = spaceAbove;
    topPos = rect.top - gap - maxHeight;
  }

  popoverStyle.value = {
    position: 'fixed',
    top: `${topPos}px`,
    left: `${leftPos}px`,
    maxHeight: `${maxHeight}px`,
    display: 'flex',
    flexDirection: 'column'
  };
};

const toggleMenu = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    updatePosition();
    // Use capture true for scroll to catch it early
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
  } else {
    stopTracking();
  }
};

const handleScroll = (event) => {
  if (!isOpen.value) return;

  // Si el scroll ocurre dentro del popover, lo ignoramos
  const popover = document.querySelector('.teleported-popover');
  if (popover && event.target instanceof Node && popover.contains(event.target)) {
    return;
  }

  closeMenu();
};

const stopTracking = () => {
  if (_rafId) cancelAnimationFrame(_rafId);
  window.removeEventListener('scroll', handleScroll, true);
  window.removeEventListener('resize', handleScroll);
};

const closeMenu = () => {
  isOpen.value = false;
  stopTracking();
};

onBeforeUnmount(stopTracking);

watch(isOpen, (val) => {
  if (!val) stopTracking();
});

const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (event) => {
      // Don't close if clicking the popover itself (which is teleported outside el)
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
.template-menu-container {
  position: relative;
  display: inline-block;
}

.template-menu-trigger {
  background: var(--surface-overlay);
  border: 1px solid var(--border);
  color: var(--text-primary);
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

.template-menu-trigger:hover {
  background: var(--surface-raised);
  border-color: var(--c-primary-alpha);
  transform: translateY(-1px);
}

.template-menu-trigger.is-active {
  background: var(--c-primary);
  border-color: var(--c-primary);
  color: white;
  box-shadow: 0 0 15px var(--c-primary-alpha);
}

.teleported-popover {
  z-index: 10000;
}

/* Transitions */
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

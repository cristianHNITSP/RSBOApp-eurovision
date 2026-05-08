import { ref, onMounted, onBeforeUnmount } from "vue";

/**
 * Pausa efectos visuales costosos (blur, animaciones) cuando el
 * contenedor no es visible (v-show=false / display:none).
 *
 * @param {import('vue').Ref<HTMLElement|null>} containerRef — ref al elemento raíz
 * @returns {{ isHibernating: import('vue').Ref<boolean> }}
 */
export function useVisualHibernation(containerRef) {
  const isHibernating = ref(false);
  let _observer = null;
  let _wakeFrame = null;

  function _check() {
    const el = containerRef.value;
    if (!el) return;

    // offsetParent === null → display:none (v-show=false)
    const hidden = el.offsetParent === null;

    if (hidden && !isHibernating.value) {
      isHibernating.value = true;
    } else if (!hidden && isHibernating.value) {
      // Despertar en el siguiente frame para no competir con el repaint de v-show
      cancelAnimationFrame(_wakeFrame);
      _wakeFrame = requestAnimationFrame(() => {
        isHibernating.value = false;
      });
    }
  }

  onMounted(() => {
    // MutationObserver en el padre detecta cambios de style (v-show toggling)
    const el = containerRef.value;
    if (!el?.parentElement) return;

    _observer = new MutationObserver(_check);
    _observer.observe(el.parentElement, {
      attributes: true,
      attributeFilter: ["style"],
      subtree: false,
    });

    // Check inicial
    _check();
  });

  onBeforeUnmount(() => {
    _observer?.disconnect();
    cancelAnimationFrame(_wakeFrame);
  });

  return { isHibernating };
}

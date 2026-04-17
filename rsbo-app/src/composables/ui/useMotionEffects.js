// src/composables/ui/useMotionEffects.js
import { ref, onMounted } from 'vue'
import { useMotion } from '@vueuse/motion'

/**
 * useMotionEffects.js
 * Centraliza las transiciones y efectos de movimiento para elementos core del UI.
 * Refactorizado para ser más atómico y fácil de extender.
 */
export function useMotionEffects() {
  
  // ─── Referencias DOM ───────────────────────────────────────────
  const motionRef  = ref(null) // Para el Header/Layout shift
  const motionRef2 = ref(null) // Para Panels/Drops

  // ─── Controles (se inicializan en onMounted) ───────────────────
  const motionControls  = ref(null)
  const motionControls2 = ref(null)

  /** Inicializa un par de ref + controles con una config específica */
  function initMotion(elRef, controlsRef, config) {
    if (!elRef.value) return
    const { motionControls: controls } = useMotion(elRef.value, config)
    controlsRef.value = controls
  }

  onMounted(() => {
    // Animación de desplazamiento (x)
    initMotion(motionRef, motionControls, {
      initial: { x: 0, opacity: 0, scale: 0.95 },
      enter:   { x: 0, opacity: 1, scale: 1, 
                 transition: { type: 'spring', stiffness: 120, damping: 15, mass: 0.8 } }
    })

    // Animación de caída (y)
    initMotion(motionRef2, motionControls2, {
      initial: { y: 20, opacity: 0, scale: 0.95 },
      enter:   { y: 0,  opacity: 1, scale: 1, 
                 transition: { type: 'spring', stiffness: 100, damping: 18, mass: 0.9 } }
    })
  })

  // ─── Métodos de Animación (Imperativos) ───────────────────────

  const animateSidebarShift = (isCollapsed) => {
    if (!motionControls.value) return
    const offset = isCollapsed ? -60 : 60
    motionControls.value.start({
      x: [offset, 0],
      scale: [0.98, 1],
      opacity: 1,
      transition: { duration: 0.5, easing: 'ease-out' }
    })
  }

  const animatePanelDrop = (isVisible) => {
    if (!motionControls2.value) return
    const offset = isVisible ? 30 : -30
    motionControls2.value.start({
      y: [offset, 0],
      scale: [0.9, 1],
      opacity: 1,
      transition: { duration: 0.6, easing: 'ease-out' }
    })
  }

  return {
    motionRef,
    motionControls,
    animateSidebarShift,
    motionRef2,
    motionControls2,
    animatePanelDrop,
  }
}

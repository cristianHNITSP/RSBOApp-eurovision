// composables/useMotionEffects.js
import { ref, onMounted } from 'vue'
import { useMotion } from '@vueuse/motion'

export function useMotionEffects() {
  // Primer grupo de animación
  const motionRef = ref(null)
  const motionControls = ref(null)

  // Segundo grupo de animación
  const motionRef2 = ref(null)
  const motionControls2 = ref(null)

  onMounted(() => {
    // Configuración para motionRef
    const { motionControls: controls1 } = useMotion(motionRef.value, {
      initial: {
        x: 0,
        opacity: 0,
        scale: 0.95,
      },
      enter: {
        x: 0,
        opacity: 1,
        scale: 1,
        transition: {
          type: 'spring',
          stiffness: 120,
          damping: 15,
          mass: 0.8,
        },
      },
    })
    motionControls.value = controls1

    // Configuración para motionRef2
    const { motionControls: controls2 } = useMotion(motionRef2.value, {
      initial: {
        y: 20,
        opacity: 0,
        scale: 0.95,
      },
      enter: {
        y: 0,
        opacity: 1,
        scale: 1,
        transition: {
          type: 'spring',
          stiffness: 100,
          damping: 18,
          mass: 0.9,
        },
      },
    })
    motionControls2.value = controls2
  })

  const animateSidebarShift = (isCollapsed) => {
    if (!motionControls.value) return
    const offset = isCollapsed ? -60 : 60
    motionControls.value.start({
      x: [offset, 0],
      scale: [0.98, 1],
      opacity: 1,
      transition: {
        duration: 0.5,
        easing: 'ease-out',
      },
    })
  }

  const animatePanelDrop = (isVisible) => {
    if (!motionControls2.value) return
    const offset = isVisible ? 30 : -30
    motionControls2.value.start({
      y: [offset, 0],
      scale: [0.9, 1],
      opacity: 1,
      transition: {
        duration: 0.6,
        easing: 'ease-out',
      },
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

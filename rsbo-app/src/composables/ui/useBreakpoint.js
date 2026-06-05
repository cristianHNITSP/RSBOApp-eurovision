import { ref, onUnmounted } from "vue";

/**
 * useBreakpoint — estado reactivo de breakpoints alineado con Bulma.
 * Usa matchMedia (sin escuchar 'resize' en cada píxel) para máxima eficiencia.
 *
 *   mobile : <= 768px            (isMobile)
 *   touch  : <= 1023px           (isTouch  → móvil + tablet)
 *   desktop: >= 1024px           (isDesktop)
 *
 * Reutilizable en cualquier componente que necesite ocultar/condicionar
 * elementos por tamaño sin escribir @media propios ni listeners manuales.
 */
export function useBreakpoint() {
  const mqMobile = window.matchMedia("(max-width: 768px)");
  const mqTouch = window.matchMedia("(max-width: 1023px)");

  const isMobile = ref(mqMobile.matches);
  const isTouch = ref(mqTouch.matches);

  const onMobile = (e) => (isMobile.value = e.matches);
  const onTouch = (e) => (isTouch.value = e.matches);

  mqMobile.addEventListener("change", onMobile);
  mqTouch.addEventListener("change", onTouch);

  onUnmounted(() => {
    mqMobile.removeEventListener("change", onMobile);
    mqTouch.removeEventListener("change", onTouch);
  });

  return { isMobile, isTouch };
}

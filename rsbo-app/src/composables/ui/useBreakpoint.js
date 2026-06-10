import { ref, onUnmounted } from "vue";

/**
 * useBreakpoint — estado reactivo de breakpoints alineado con Bulma.
 * Usa matchMedia (sin escuchar 'resize' en cada píxel) para máxima eficiencia.
 *
 *   mobile    : <= 768px         (isMobile)
 *   touch     : <= 1023px        (isTouch  → móvil + tablet)
 *   desktop   : >= 1024px        (isDesktop)
 *   widescreen: >= 1216px        (isWidescreen)
 *
 * Reutilizable en cualquier componente que necesite ocultar/condicionar
 * elementos por tamaño sin escribir @media propios ni listeners manuales.
 */
export function useBreakpoint() {
  const mqMobile = window.matchMedia("(max-width: 768px)");
  const mqTouch = window.matchMedia("(max-width: 1023px)");
  const mqWide = window.matchMedia("(min-width: 1216px)");

  const isMobile = ref(mqMobile.matches);
  const isTouch = ref(mqTouch.matches);
  const isWidescreen = ref(mqWide.matches);

  const onMobile = (e) => (isMobile.value = e.matches);
  const onTouch = (e) => (isTouch.value = e.matches);
  const onWide = (e) => (isWidescreen.value = e.matches);

  mqMobile.addEventListener("change", onMobile);
  mqTouch.addEventListener("change", onTouch);
  mqWide.addEventListener("change", onWide);

  onUnmounted(() => {
    mqMobile.removeEventListener("change", onMobile);
    mqTouch.removeEventListener("change", onTouch);
    mqWide.removeEventListener("change", onWide);
  });

  return { isMobile, isTouch, isWidescreen };
}

// composables/useIntersectionObserver.js
import { onMounted, onBeforeUnmount } from 'vue'

export function useIntersectionObserver(selector = '.animate-fade-up') {
  let observer = null

  const callback = (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible')
        observer.unobserve(entry.target) // Solo una vez
      }
    })
  }

  onMounted(() => {
    observer = new IntersectionObserver(callback, {
      threshold: 0.2,
    })

    document.querySelectorAll(selector).forEach((el) => {
      observer.observe(el)
    })
  })

  onBeforeUnmount(() => {
    if (observer) observer.disconnect()
  })
}

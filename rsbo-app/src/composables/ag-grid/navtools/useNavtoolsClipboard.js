/**
 * src/composables/ag-grid/navtools/useNavtoolsClipboard.js
 * Lógica para copiado/pegado y limpieza de texto del portapapeles.
 */

export function useNavtoolsClipboard({ localValue, onUpdate, safeToast }) {
  const stripHtml = (s) => String(s ?? '').replace(/<[^>]*>/g, '')
  const collapseWs = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'absolute'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
    } catch {
      safeToast('El navegador bloqueó el acceso al portapapeles.', 'is-danger')
    }
  }

  const pasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        return await navigator.clipboard.readText()
      }
      return new Promise((resolve) => {
        const textarea = document.createElement('textarea')
        textarea.style.position = 'absolute'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        const handler = (e) => {
          const pasted = e.clipboardData?.getData('text') || ''
          resolve(pasted)
          document.body.removeChild(textarea)
        }
        textarea.addEventListener('paste', handler, { once: true })
        document.execCommand('paste')
      })
    } catch {
      safeToast('El navegador bloqueó el acceso al portapapeles.', 'is-danger')
      return ''
    }
  }

  const copyCell = async () => {
    if (localValue.value !== '' && localValue.value != null) {
      await copyToClipboard(String(localValue.value))
      safeToast('Copiado al portapapeles.', 'is-success')
    }
  }

  const cutCell = async () => {
    if (localValue.value !== '' && localValue.value != null) {
      await copyToClipboard(String(localValue.value))
      onUpdate(0)
      safeToast('Cortado al portapapeles.', 'is-warning')
    }
  }

  const pasteCell = async () => {
    const pasted = await pasteFromClipboard()
    if (!pasted) return
    const str = collapseWs(stripHtml(pasted))
    const final = /^-?\d+(\.\d+)?$/.test(str) ? Number(str) : str
    onUpdate(final)
    safeToast('Pegado desde portapapeles.', 'is-info')
  }

  return {
    copyToClipboard,
    pasteFromClipboard,
    copyCell,
    cutCell,
    pasteCell
  }
}

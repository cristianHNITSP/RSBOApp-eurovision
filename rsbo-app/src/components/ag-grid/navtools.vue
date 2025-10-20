<template>
  <div class="ribbon">
    <!-- Pestañas con Buefy -->
    <b-tabs v-model="activeTab" type="is-boxed" size="is-small" class="m-0 p-0">
      <b-tab-item label="Inicio">
        <div class="ribbon-content">
          <div class="ribbon-group">
            <button @click="undo" class="ribbon-btn undo"><i>↶</i><span>Deshacer</span></button>
            <button @click="redo" class="ribbon-btn redo"><i>↷</i><span>Rehacer</span></button>
          </div>

          <div class="ribbon-group">
            <button v-if="!isMobile" @click="pasteCell" class="ribbon-btn"><i>📋</i><span>Pegar</span></button>
            <button @click="cutCell" class="ribbon-btn"><i>✂️</i><span>Cortar</span></button>
            <button @click="copyCell" class="ribbon-btn"><i>📄</i><span>Copiar</span></button>
          </div>

          <div class="ribbon-group">
            <button class="ribbon-btn"><i>B</i><span>Negrita</span></button>
            <button class="ribbon-btn"><i>I</i><span>Cursiva</span></button>
            <button class="ribbon-btn"><i>U</i><span>Subrayado</span></button>
          </div>

          <div class="ribbon-group">
            <button class="ribbon-btn"><i>☰</i><span>Formato tabla</span></button>
            <button class="ribbon-btn"><i>🎨</i><span>Estilos celda</span></button>
          </div>

          <div class="ribbon-group">
            <button class="ribbon-btn"><i>∑</i><span>Autosuma</span></button>
            <button class="ribbon-btn"><i>⏷</i><span>Autofiltro</span></button>
            <button class="ribbon-btn"><i>⇅</i><span>Ordenar</span></button>
          </div>
        </div>
      </b-tab-item>

      <b-tab-item label="Insertar">
        <div class="ribbon-content">
          <div class="ribbon-group">
            <button class="ribbon-btn"><i>➕</i><span>Nueva hoja</span></button>
            <button class="ribbon-btn"><i>🖼️</i><span>Imagen</span></button>
          </div>

          <!-- ✅ NUEVO GRUPO: Agregar fila / columna con modales dinámicos -->
          <div class="ribbon-group">
            <button class="ribbon-btn" @click="openAddRowModal"><i>⬇️</i><span>Nueva fila</span></button>
            <button class="ribbon-btn" @click="openAddColumnModal"><i>➡️</i><span>Nueva columna</span></button>
          </div>
        </div>
      </b-tab-item>

      <b-tab-item label="Diseño de página">
        <div class="ribbon-content">
          <div class="ribbon-group">
            <button class="ribbon-btn"><i>📐</i><span>Márgenes</span></button>
            <button class="ribbon-btn"><i>📏</i><span>Orientación</span></button>
          </div>
        </div>
      </b-tab-item>

      <b-tab-item label="Fórmulas">
        <div class="ribbon-content">
          <div class="ribbon-group">
            <button class="ribbon-btn"><i>📊</i><span>Insertar función</span></button>
            <button class="ribbon-btn"><i>∑</i><span>Autosuma</span></button>
          </div>
        </div>
      </b-tab-item>

      <b-tab-item label="Datos">
        <div class="ribbon-content">
          <div class="ribbon-group">
            <button class="ribbon-btn"><i>⇅</i><span>Ordenar</span></button>
            <button class="ribbon-btn"><i>⏷</i><span>Filtrar</span></button>
          </div>
        </div>
      </b-tab-item>

      <b-tab-item label="Revisar">
        <div class="ribbon-content">
          <div class="ribbon-group">
            <button class="ribbon-btn"><i>📝</i><span>Ortografía</span></button>
            <button class="ribbon-btn"><i>👥</i><span>Comentarios</span></button>
          </div>
        </div>
      </b-tab-item>

      <b-tab-item label="Vista">
        <div class="ribbon-content">
          <div class="ribbon-group">
            <button class="ribbon-btn"><i>🔍</i><span>Zoom</span></button>
            <button class="ribbon-btn"><i>🗔</i><span>Dividir</span></button>
          </div>
        </div>
      </b-tab-item>
    </b-tabs>

    <!-- Barra de fórmulas -->
    <div class="formula-bar">
      <label class="label">fx</label>
      <div style="display: flex; flex: 1; gap: 4px;">
        <b-input
          v-model="localValue"
          type="text"
          inputmode="numeric"
          placeholder="Selecciona una celda"
          size="is-small"
          style="flex: 1;"
          @blur="applyChange"
        />
        <button @click="applyChange" class="ribbon-btn" style="padding: 2px 6px;">✔️</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits, onMounted, onBeforeUnmount, getCurrentInstance } from 'vue'

const props = defineProps({
  modelValue: { type: [Number, String], default: '' }
})
const emit = defineEmits(['update:modelValue', 'add-row', 'add-column'])

const activeTab = ref(0)
const localValue = ref(props.modelValue)

// Obtener instancia de Buefy
const internalInstance = getCurrentInstance()
const $buefy = internalInstance.appContext.config.globalProperties.$buefy

// Variables para los modales
const newRowValue = ref('')
const newColumnValue = ref('')

watch(() => props.modelValue, val => {
  localValue.value = val ?? ''
})

const applyChange = () => {
  emit('update:modelValue', localValue.value === '' ? 0 : Number(localValue.value))
}

/* Copiar / Cortar / Pegar */
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
  } catch (err) {
    console.error('Error copiando:', err)
    alert('El navegador bloqueó el acceso al portapapeles.')
  }
}

const pasteFromClipboard = async () => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      return await navigator.clipboard.readText()
    } else {
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
    }
  } catch (err) {
    console.error('Error pegando:', err)
    alert('El navegador bloqueó el acceso al portapapeles.')
    return ''
  }
}

const copyCell = async () => {
  if (localValue.value !== '') await copyToClipboard(localValue.value.toString())
}

const cutCell = async () => {
  if (localValue.value !== '') {
    await copyToClipboard(localValue.value.toString())
    emit('update:modelValue', 0)
  }
}

const pasteCell = async () => {
  const pasted = await pasteFromClipboard()
  if (pasted) {
    const str = pasted.trim()
    if (/^-?\d+(\.\d+)?$/.test(str)) emit('update:modelValue', Number(str))
  }
}

/* ✅ NUEVAS FUNCIONES para fila / columna con modales DINÁMICOS usando $buefy */

const openAddRowModal = () => {
  $buefy.dialog.prompt({
    message: 'Agregar Nueva Fila',
    inputAttrs: {
      placeholder: 'Ej: -0.25, -0.50, etc.',
      type: 'number',
      step: '0.25'
    },
    trapFocus: true,
    onConfirm: (value) => {
      if (value) {
        emit('add-row', parseFloat(value))
      }
    }
  })
}

const openAddColumnModal = () => {
  $buefy.dialog.prompt({
    message: 'Agregar Nueva Columna',
    inputAttrs: {
      placeholder: 'Ej: 1.2, 1.5, 2.0, etc.',
      type: 'number',
      step: '0.1'
    },
    trapFocus: true,
    onConfirm: (value) => {
      if (value) {
        emit('add-column', parseFloat(value))
      }
    }
  })
}

/* Atajos teclado desktop */
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
const handleKey = async (e) => {
  if (isMobile) return
  if (e.ctrlKey || e.metaKey) {
    const key = e.key.toLowerCase()
    if (key === 'c') { e.preventDefault(); await copyCell() }
    else if (key === 'x') { e.preventDefault(); await cutCell() }
    else if (key === 'v') { e.preventDefault(); await pasteCell() }
  }
}

onMounted(() => { if (!isMobile) window.addEventListener('keydown', handleKey) })
onBeforeUnmount(() => { window.removeEventListener('keydown', handleKey) })
</script>

<style scoped>
.ribbon-content {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 5px;
}

.ribbon-group {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px;
  border-right: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.ribbon-group:last-child {
  border-right: none;
}

.ribbon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 12px;
  color: #4a4a4a;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ribbon-btn i {
  font-size: 18px;
  line-height: 1;
  margin-bottom: 2px;
}

.ribbon-btn span {
  font-size: 11px;
  font-weight: 500;
}

.ribbon-btn:hover {
  background-color: #e8e8e8;
  border-color: #dbdbdb;
  color: #363636;
  transform: translateY(-1px);
}

.ribbon-btn:active {
  background-color: #dbdbdb;
  transform: translateY(0);
}

/* Barra de fórmulas */
.formula-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px;
  background-color: #f3f3f3;
  border-bottom: 1px solid #d0d0d0;
}

.formula-bar .label {
  margin: 0;
  font-size: 14px;
  font-weight: bold;
  white-space: nowrap;
}

.tab-content,
::v-deep(.tab-content) {
  padding: 0 !important;
}

::v-deep(.tab-item) {
  padding: 0 !important;
}

@media (max-width: 768px) {
  .ribbon-content {
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .ribbon-group {
    flex-shrink: 0;
  }
}

/* Deshacer / Rehacer */
.ribbon-btn.undo,
.ribbon-btn.redo {
  background-color: #f5f5f5;
}

.ribbon-btn.undo:hover,
.ribbon-btn.redo:hover {
  background-color: #e8e8e8;
  border-color: #dbdbdb;
  transform: translateY(-1px);
}

.ribbon-btn.undo:active,
.ribbon-btn.redo:active {
  background-color: #dbdbdb;
  transform: translateY(0);
}
</style>
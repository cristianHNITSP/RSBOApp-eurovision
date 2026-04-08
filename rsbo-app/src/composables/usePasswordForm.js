import { ref, reactive } from 'vue'
import { userService } from '../services/myUserCRUD'

/**
 * Encapsula toda la lógica del formulario de cambio de contraseña.
 * @param {import('vue').ComputedRef<string>} userId - ID del usuario
 */
export function usePasswordForm(userId) {
  const isEditing = ref(false)
  const loading   = ref(false)
  const message   = ref('')
  const success   = ref(true)

  const form   = reactive({ password: '', confirmPassword: '' })
  const errors = reactive({ password: '', confirmPassword: '' })

  function toggle() {
    if (isEditing.value) {
      form.password = ''
      form.confirmPassword = ''
      clearErrors()
      message.value = ''
      success.value = true
      isEditing.value = false
    } else {
      isEditing.value = true
      message.value   = ''
    }
  }

  function clearErrors() {
    Object.keys(errors).forEach(k => (errors[k] = ''))
  }

  function clearFieldError(field) {
    errors[field] = ''
    if (message.value && !success.value) message.value = ''
  }

  function validate() {
    clearErrors()
    let ok = true
    if (!form.password) { errors.password = 'La nueva contraseña es requerida'; ok = false }
    else if (form.password.length < 6) { errors.password = 'La contraseña debe tener al menos 6 caracteres'; ok = false }
    if (!form.confirmPassword) { errors.confirmPassword = 'Debe confirmar la contraseña'; ok = false }
    else if (form.password !== form.confirmPassword) { errors.confirmPassword = 'Las contraseñas no coinciden'; ok = false }
    return ok
  }

  async function save() {
    if (!validate()) return false
    if (!userId.value) { message.value = 'No se pudo identificar al usuario'; success.value = false; return false }

    loading.value = true
    const result  = await userService.updatePassword(userId.value, form.password)

    if (result.success) {
      message.value   = 'Contraseña actualizada correctamente'
      success.value   = true
      form.password   = ''
      form.confirmPassword = ''
      clearErrors()
      isEditing.value = false
    } else {
      message.value = result.message || 'Ocurrió un error al actualizar la contraseña'
      success.value = false
    }

    loading.value = false
    return result.success
  }

  return { form, errors, isEditing, loading, message, success, toggle, clearFieldError, save }
}

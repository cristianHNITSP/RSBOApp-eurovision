import { ref, reactive } from 'vue'
import { userService } from '../services/myUserCRUD'
import { useAuth } from '../services/useAuth'

/**
 * Encapsula toda la lógica del formulario de perfil de usuario.
 * @param {import('vue').ComputedRef<string>} userId - ID del usuario a editar
 */
export function useProfileForm(userId) {
  const isEditing  = ref(false)
  const loading    = ref(false)
  const message    = ref('')
  const success    = ref(true)

  const form = reactive({ name: '', email: '', phone: '', avatar: '', bio: '' })
  const errors = reactive({ name: '', email: '', phone: '', bio: '' })
  const _original = reactive({})

  function init(user) {
    if (!user) return
    Object.assign(form, {
      name:   user.name  || '',
      email:  user.email || '',
      phone:  user.phone || '',
      bio:    user.bio   || '',
      avatar: user.avatar || '',
    })
    Object.assign(_original, { name: form.name, email: form.email, phone: form.phone, bio: form.bio, avatar: form.avatar })
  }

  function startEdit() {
    isEditing.value = true
    message.value   = ''
  }

  function cancelEdit() {
    Object.assign(form, _original)
    isEditing.value = false
    message.value   = ''
    success.value   = true
    clearErrors()
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
    if (!form.name.trim()) { errors.name = 'El nombre completo es requerido'; ok = false }
    if (!form.email.trim()) { errors.email = 'El correo electrónico es requerido'; ok = false }
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) { errors.email = 'El formato del correo es inválido'; ok = false }
    return ok
  }

  async function save() {
    if (!validate()) return false
    if (!userId.value) { message.value = 'No se pudo identificar al usuario'; success.value = false; return false }

    loading.value = true
    const payload = { name: form.name, email: form.email, phone: form.phone, avatar: form.avatar, bio: form.bio }
    const result  = await userService.updateProfile(userId.value, payload)

    if (result.success) {
      message.value   = 'Perfil actualizado correctamente'
      success.value   = true
      isEditing.value = false
      Object.assign(_original, payload)
      // Propagar cambios a toda la app sin re-fetch completo
      useAuth().patchUser(payload)
      // Re-fetch en background para garantizar consistencia con el servidor
      useAuth().fetchUser()
    } else {
      message.value = result.message || 'Ocurrió un error al actualizar el perfil'
      success.value = false
    }

    loading.value = false
    return result.success
  }

  return { form, errors, isEditing, loading, message, success, init, startEdit, cancelEdit, clearFieldError, save }
}

import { ref, computed } from 'vue';
import { changePassword } from '@/services/security';
import { labToast } from '@/composables/shared/useLabToast';

export function usePasswordChange() {
  const pwForm    = ref({ current: '', next: '', confirm: '' });
  const loadingPw = ref(false);

  const pwStrength = computed(() => {
    const p = pwForm.value.next;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8)           score++;
    if (p.length >= 12)          score++;
    if (/[A-Z]/.test(p))         score++;
    if (/[0-9]/.test(p))         score++;
    if (/[^A-Za-z0-9]/.test(p))  score++;
    return score;
  });

  const pwStrengthMsg = computed(() => {
    if (!pwForm.value.next) return '';
    const labels = ['', 'Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte'];
    return labels[pwStrength.value] || '';
  });

  const pwStrengthType = computed(() => {
    if (!pwForm.value.next) return '';
    const s = pwStrength.value;
    if (s <= 1) return 'is-danger';
    if (s <= 2) return 'is-warning';
    if (s <= 3) return 'is-info';
    return 'is-success';
  });

  const pwMatchMsg = computed(() => {
    if (!pwForm.value.confirm) return '';
    return pwForm.value.next === pwForm.value.confirm ? '' : 'Las contraseñas no coinciden';
  });

  const pwMatchType = computed(() => {
    if (!pwForm.value.confirm) return '';
    return pwForm.value.next === pwForm.value.confirm ? 'is-success' : 'is-danger';
  });

  const pwFormValid = computed(() =>
    pwForm.value.current.length > 0
    && pwForm.value.next.length >= 8
    && pwForm.value.next === pwForm.value.confirm,
  );

  async function submitChangePassword() {
    if (!pwFormValid.value) return;
    loadingPw.value = true;
    try {
      await changePassword({ currentPassword: pwForm.value.current, newPassword: pwForm.value.next });
      labToast.success('Contraseña actualizada. Inicia sesión nuevamente.');
      pwForm.value = { current: '', next: '', confirm: '' };
      setTimeout(() => { window.location.href = '/'; }, 1800);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Error al cambiar la contraseña.';
      labToast.danger(msg);
    } finally {
      loadingPw.value = false;
    }
  }

  return {
    pwForm,
    loadingPw,
    pwStrengthMsg,
    pwStrengthType,
    pwMatchMsg,
    pwMatchType,
    pwFormValid,
    submitChangePassword,
  };
}

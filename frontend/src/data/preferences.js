export const STORAGE_KEY = 'rsbo_preferences';

export const THEMES = [
  { id: 'glass',  label: 'Claro Glass',  desc: 'Fondo claro con transparencias y blur difuminado' },
  { id: 'oscuro', label: 'Oscuro Glass', desc: 'Fondo oscuro con glassmorphism para poca luz' },
];

export const FONT_SIZES = [
  { id: 'pequeño', label: 'Pequeño', scale: 0.875 },
  { id: 'normal',  label: 'Normal',  scale: 1 },
  { id: 'grande',  label: 'Grande',  scale: 1.125 },
];

export const LANGUAGES = [
  { id: 'es', label: 'Español' },
  { id: 'en', label: 'English' },
];

export const TOGGLE_DEFINITIONS = [
  { id: 'sonido',    label: 'Sonido de notificaciones', desc: 'Reproducir audio al recibir alertas' },
  { id: 'animacion', label: 'Animaciones reducidas',    desc: 'Menos movimiento para mayor accesibilidad' },
  { id: 'compacto',  label: 'Vista compacta',           desc: 'Reducir espaciado general de la interfaz' },
  { id: 'autosave',  label: 'Guardado automático',      desc: 'Guardar cambios en formularios al salir' },
];

export const DEFAULT_PREFERENCES = {
  theme: 'glass',
  fontSize: 'normal',
  language: 'es',
  sonido: true,
  animacion: false,
  compacto: false,
  autosave: true,
};

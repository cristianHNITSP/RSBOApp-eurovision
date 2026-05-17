export const applyPreferencesToDOM = (prefs) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = prefs.theme;
  root.dataset.fontSize = prefs.fontSize;
  root.dataset.compact = String(Boolean(prefs.compacto));
  root.dataset.reduceMotion = String(Boolean(prefs.animacion));
  root.lang = prefs.language;
};

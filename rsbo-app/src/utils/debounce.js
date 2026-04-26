/**
 * Devuelve una versión debounced de fn que solo se ejecuta tras `ms` ms
 * sin nuevas llamadas. Cancelable vía `.cancel()`.
 */
export function debounce(fn, ms = 250) {
  let t = null;
  const debounced = (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn(...args);
    }, ms);
  };
  debounced.cancel = () => {
    if (t) { clearTimeout(t); t = null; }
  };
  return debounced;
}

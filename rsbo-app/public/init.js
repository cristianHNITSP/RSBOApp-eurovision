(function () {
  var html = document.documentElement;

  // Tema — lee la clave del composable (ui-theme) con fallback a la antigua (dark-mode)
  var saved = localStorage.getItem("ui-theme") || localStorage.getItem("dark-mode");
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  var dark;
  if (saved === "dark")       dark = true;
  else if (saved === "light") dark = false;
  else if (saved === "true")  dark = true;   // backward compat
  else if (saved === "false") dark = false;  // backward compat
  else                        dark = prefersDark;

  html.setAttribute("data-theme", dark ? "dark" : "light");
  html.style.colorScheme = dark ? "dark" : "light";

  // Tamaño de fuente — evita layout shift al cargar
  var sizes = { xs: "85%", sm: "92.5%", md: "100%", lg: "112.5%" };
  var fzKey = localStorage.getItem("ui-font-size") || localStorage.getItem("user-font-size") || "md";
  html.style.fontSize = sizes[fzKey] || "100%";

  // Contraste
  var contrast = localStorage.getItem("ui-contrast") || "normal";
  html.setAttribute("data-contrast", contrast);

  // Fuente legible
  var readable = localStorage.getItem("ui-readable-font") === "true";
  html.setAttribute("data-readable-font", String(readable));

  // Efectos reducidos
  var redEffects = localStorage.getItem("ui-reduced-effects") === "true";
  if (redEffects) html.setAttribute("data-reduced-effects", "true");

  // Focus outline
  var focusOut = localStorage.getItem("ui-focus-outline") !== "false"; // default true
  html.setAttribute("data-focus-outline", String(focusOut));

  // Movimiento reducido
  var redMotion = localStorage.getItem("ui-reduced-motion") || "system";
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var motionEnabled = redMotion === "on" ? true : (redMotion === "off" ? false : prefersReduced);
  html.setAttribute("data-reduced-motion", String(motionEnabled));
})();

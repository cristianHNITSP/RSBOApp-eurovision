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
})();

const GradientDefs = () => (
  <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }} aria-hidden="true">
    <defs>
      {/* UI — vivid purple to sky blue (search, inputs, sidebar) */}
      <linearGradient id="icon-grad-ui" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7c3aed" stopOpacity="1" />
        <stop offset="100%" stopColor="#0ea5e9" stopOpacity="1" />
      </linearGradient>

      {/* Nav active/hover — deep purple to purple-400 */}
      <linearGradient id="icon-grad-nav" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#5b21b6" stopOpacity="1" />
        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="1" />
      </linearGradient>

      {/* Brand — vivid orange to vivid pink (landing page) */}
      <linearGradient id="icon-grad-brand" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ea580c" stopOpacity="1" />
        <stop offset="100%" stopColor="#db2777" stopOpacity="1" />
      </linearGradient>

      {/* Success — vivid green to cyan */}
      <linearGradient id="icon-grad-success" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#16a34a" stopOpacity="1" />
        <stop offset="100%" stopColor="#0891b2" stopOpacity="1" />
      </linearGradient>

      {/* Danger — vivid red to pink */}
      <linearGradient id="icon-grad-danger" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#dc2626" stopOpacity="1" />
        <stop offset="100%" stopColor="#db2777" stopOpacity="1" />
      </linearGradient>
    </defs>
  </svg>
);

export default GradientDefs;

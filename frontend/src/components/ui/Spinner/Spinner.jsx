import './Spinner.css';

const SIZE_MAP = {
  sm: 16,
  md: 24,
  lg: 40,
  xl: 64,
};

const Spinner = ({
  size = 'md',
  inline = false,
  label,
  className = '',
}) => {
  const px = typeof size === 'number' ? size : SIZE_MAP[size] ?? SIZE_MAP.md;
  const stroke = Math.max(2, Math.round(px / 10));
  const r = (px - stroke) / 2;
  const c = 2 * Math.PI * r;
  const cls = `spinner ${inline ? 'spinner--inline' : ''} ${className}`.trim();

  return (
    <span
      className={cls}
      style={{ width: px, height: px }}
      role={label ? 'status' : 'presentation'}
      aria-label={label || undefined}
    >
      <svg
        className="spinner__svg"
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
      >
        <defs>
          <linearGradient id={`spinner-grad-${px}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-purple-500)" />
            <stop offset="50%" stopColor="var(--color-purple-600)" />
            <stop offset="100%" stopColor="var(--color-pink-500)" />
          </linearGradient>
        </defs>
        <circle
          className="spinner__track"
          cx={px / 2}
          cy={px / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="spinner__arc"
          cx={px / 2}
          cy={px / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke={`url(#spinner-grad-${px})`}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * 0.65}
        />
      </svg>
    </span>
  );
};

export default Spinner;

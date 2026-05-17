import './Toggle.css';

const Toggle = ({ checked, onChange, ariaLabel }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    onClick={() => onChange?.(!checked)}
    className={`toggle${checked ? ' toggle--on' : ''}`}
  >
    <span className="toggle__thumb" />
  </button>
);

export default Toggle;

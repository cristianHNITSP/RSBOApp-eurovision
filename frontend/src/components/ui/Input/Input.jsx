import './Input.css';

const Input = ({ type = 'text', placeholder, value, onChange, icon, className = '', disabled = false }) => (
  <div className="input-wrapper">
    {icon && <span className="input-wrapper__icon">{icon}</span>}
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={['input-field', icon ? 'input-field--with-icon' : '', className].join(' ')}
    />
  </div>
);

export const Select = ({ children, value, onChange, className = '' }) => (
  <select
    value={value}
    onChange={onChange}
    className={['input-select', className].join(' ')}
  >
    {children}
  </select>
);

export default Input;

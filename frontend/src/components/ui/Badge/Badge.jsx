import './Badge.css';

const VARIANTS = ['default', 'primary', 'success', 'warning', 'danger', 'info', 'glass'];
const SIZES = { small: 'sm', medium: 'md', large: 'lg' };

const Badge = ({ children, variant = 'default', size = 'medium' }) => {
  const sizeKey = SIZES[size] || size;

  return (
    <span className={[
      'badge',
      `badge--${VARIANTS.includes(variant) ? variant : 'default'}`,
      `badge--${sizeKey}`,
    ].join(' ')}>
      {children}
    </span>
  );
};

export default Badge;

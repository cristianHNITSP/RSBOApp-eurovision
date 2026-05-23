import { motion } from 'framer-motion';
import useMotionTransition from '../../../composables/useMotionTransition.js';
import './IconButton.css';

const VARIANTS = ['ghost', 'glass', 'primary'];
const SIZES = { small: 'sm', medium: 'md', large: 'lg' };
const SPRING = { type: 'spring', stiffness: 400, damping: 10 };

const IconButton = ({
  icon,
  onClick,
  variant = 'ghost',
  size = 'medium',
  className = '',
  title,
  type = 'button',
  disabled = false,
  ariaLabel,
  ...rest
}) => {
  const sizeKey = SIZES[size] || size;
  const transition = useMotionTransition(SPRING);

  return (
    <motion.button
      type={type}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel ?? title}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      transition={transition}
      className={[
        'icon-btn',
        `icon-btn--${VARIANTS.includes(variant) ? variant : 'ghost'}`,
        `icon-btn--${sizeKey}`,
        disabled ? 'icon-btn--disabled' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {icon}
    </motion.button>
  );
};

export default IconButton;

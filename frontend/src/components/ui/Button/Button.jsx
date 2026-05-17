import { motion } from 'framer-motion';
import useMotionTransition from '../../../composables/useMotionTransition.js';
import './Button.css';

const VARIANTS = ['primary', 'secondary', 'success', 'danger', 'ghost', 'glass'];
const SIZES = { small: 'sm', medium: 'md', large: 'lg' };
const SPRING = { type: 'spring', stiffness: 520, damping: 8, mass: 0.35 };

const Button = ({ children, variant = 'primary', size = 'medium', icon, onClick, className = '', type = 'button', disabled = false }) => {
  const sizeKey = SIZES[size] || size;
  const transition = useMotionTransition(SPRING);

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { y: -2, boxShadow: '0 8px 20px rgba(139,92,246,0.18)' }}
      whileTap={disabled ? {} : { scale: 0.86, y: 3 }}
      transition={transition}
      className={[
        'btn',
        `btn--${VARIANTS.includes(variant) ? variant : 'primary'}`,
        `btn--${sizeKey}`,
        className,
      ].join(' ')}
    >
      {icon && <span className="btn__icon">{icon}</span>}
      {children}
    </motion.button>
  );
};

export default Button;

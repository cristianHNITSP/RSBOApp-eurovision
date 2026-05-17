import { motion } from 'framer-motion';
import useMotionTransition from '../../../composables/useMotionTransition.js';
import './IconButton.css';

const VARIANTS = ['ghost', 'glass', 'primary'];
const SIZES = { small: 'sm', medium: 'md', large: 'lg' };
const SPRING = { type: 'spring', stiffness: 400, damping: 10 };

const IconButton = ({ icon, onClick, variant = 'ghost', size = 'medium', className = '', title }) => {
  const sizeKey = SIZES[size] || size;
  const transition = useMotionTransition(SPRING);

  return (
    <motion.button
      onClick={onClick}
      title={title}
      whileTap={{ scale: 0.9 }}
      transition={transition}
      className={[
        'icon-btn',
        `icon-btn--${VARIANTS.includes(variant) ? variant : 'ghost'}`,
        `icon-btn--${sizeKey}`,
        className,
      ].join(' ')}
    >
      {icon}
    </motion.button>
  );
};

export default IconButton;

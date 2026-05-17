import { motion, useAnimation } from 'framer-motion';
import { usePreferences } from '../../../composables/usePreferences.js';
import './Button.css';

const VARIANTS = ['primary', 'secondary', 'success', 'danger', 'ghost', 'glass'];
const SIZES = { small: 'sm', medium: 'md', large: 'lg' };

// Ultra-bouncy, high-profile liquid glass springs for the button container
const BTN_HOVER_SPRING = { type: 'spring', stiffness: 380, damping: 9, mass: 0.3 };
const BTN_TAP_SPRING = { type: 'spring', stiffness: 500, damping: 14, mass: 0.25 };
const BTN_RELEASE_SPRING = { type: 'spring', stiffness: 280, damping: 7, mass: 0.4 };

// Delayed secondary springs for the button content to create a delicious liquid stagger
const CONTENT_HOVER_SPRING = { type: 'spring', stiffness: 300, damping: 8, mass: 0.35 };
const CONTENT_TAP_SPRING = { type: 'spring', stiffness: 400, damping: 15, mass: 0.3 };
const CONTENT_RELEASE_SPRING = { type: 'spring', stiffness: 200, damping: 6, mass: 0.45 };

const Button = ({ children, variant = 'primary', size = 'medium', icon, onClick, className = '', type = 'button', disabled = false }) => {
  const sizeKey = SIZES[size] || size;
  const { animacion } = usePreferences(); // Reduced motion preference
  const btnControls = useAnimation();
  const contentControls = useAnimation();

  const handleMouseEnter = () => {
    if (disabled || animacion) return;
    btnControls.start({
      y: -2.5,
      scale: 1.03,
      boxShadow: '0 8px 20px rgba(139, 92, 246, 0.22)',
      transition: BTN_HOVER_SPRING
    });
    contentControls.start({
      y: -0.8,
      scale: 1.015,
      transition: CONTENT_HOVER_SPRING
    });
  };

  const handleMouseLeave = () => {
    if (disabled || animacion) return;
    btnControls.start({
      y: 0,
      scale: 1,
      boxShadow: 'none',
      transition: BTN_RELEASE_SPRING
    });
    contentControls.start({
      y: 0,
      scale: 1,
      transition: CONTENT_RELEASE_SPRING
    });
  };

  const handleMouseDown = () => {
    if (disabled || animacion) return;
    btnControls.start({
      scale: 0.82,
      y: 5,
      transition: BTN_TAP_SPRING
    });
    contentControls.start({
      scale: 0.90,
      y: 1.5,
      transition: CONTENT_TAP_SPRING
    });
  };

  const handleMouseUp = () => {
    if (disabled || animacion) return;
    // Bouncy release with staggering liquid spring oscillations
    btnControls.start({
      scale: 1.03,
      y: -2.5,
      boxShadow: '0 8px 20px rgba(139, 92, 246, 0.22)',
      transition: BTN_RELEASE_SPRING
    });
    contentControls.start({
      scale: 1.015,
      y: -0.8,
      transition: CONTENT_RELEASE_SPRING
    });
  };

  const handleFocus = () => {
    if (disabled || animacion) return;
    btnControls.start({
      y: -2.5,
      scale: 1.03,
      boxShadow: '0 8px 20px rgba(139, 92, 246, 0.22)',
      transition: BTN_HOVER_SPRING
    });
    contentControls.start({
      y: -0.8,
      scale: 1.015,
      transition: CONTENT_HOVER_SPRING
    });
  };

  const handleBlur = () => {
    if (disabled || animacion) return;
    btnControls.start({
      y: 0,
      scale: 1,
      boxShadow: 'none',
      transition: BTN_RELEASE_SPRING
    });
    contentControls.start({
      y: 0,
      scale: 1,
      transition: CONTENT_RELEASE_SPRING
    });
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      animate={btnControls}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={[
        'btn',
        `btn--${VARIANTS.includes(variant) ? variant : 'primary'}`,
        `btn--${sizeKey}`,
        className,
      ].join(' ')}
      style={{
        outline: 'none',
        transformOrigin: 'center center'
      }}
    >
      <motion.div
        className="btn__content"
        animate={contentControls}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'inherit',
          width: '100%',
          transformOrigin: 'center center'
        }}
      >
        {icon && <span className="btn__icon">{icon}</span>}
        {children}
      </motion.div>
    </motion.button>
  );
};

export default Button;

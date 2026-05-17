import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useMotionTransition from '../../../composables/useMotionTransition.js';
import './Dropdown.css';

const Dropdown = ({ trigger, children, isOpen, onToggle, placement = 'bottom', className = '' }) => {
  const containerRef = useRef(null);
  const menuRef = useRef(null);
  const springTransition = useMotionTransition({ type: 'spring', stiffness: 520, damping: 18, mass: 0.4 });

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onToggle?.(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen, onToggle]);

  useEffect(() => {
    if (isOpen && menuRef.current) {
      // Reset inline styles
      menuRef.current.style.left = '';
      menuRef.current.style.right = '';
      menuRef.current.style.top = '';
      menuRef.current.style.bottom = '';

      const rect = menuRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Horizontal fluid collision
      if (rect.right > vw - 16) {
        menuRef.current.style.left = 'auto';
        menuRef.current.style.right = '0';
      } else if (rect.left < 16) {
        menuRef.current.style.right = 'auto';
        menuRef.current.style.left = '0';
      }

      // Vertical fluid collision
      const isTop = placement.includes('top');
      if (rect.bottom > vh - 16 && !isTop) {
        menuRef.current.style.top = 'auto';
        menuRef.current.style.bottom = 'calc(100% + var(--space-2))';
      } else if (rect.top < 16 && isTop) {
        menuRef.current.style.bottom = 'auto';
        menuRef.current.style.top = 'calc(100% + var(--space-2))';
      }
    }
  }, [isOpen, placement]);

  return (
    <div className={['dropdown', className].join(' ')} ref={containerRef}>
      <div onClick={() => onToggle?.(!isOpen)}>{trigger}</div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={['dropdown__menu', placement !== 'bottom' ? `dropdown__menu--${placement}` : ''].join(' ').trim()}
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.82, y: placement.includes('top') ? 16 : -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.82, y: placement.includes('top') ? 16 : -16 }}
            transition={springTransition}
          >
            <div className="dropdown__menu-inner">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ITEM_SPRING = { type: 'spring', stiffness: 400, damping: 25 };

export const DropdownItem = ({ icon, children, onClick, className = '' }) => {
  const transition = useMotionTransition(ITEM_SPRING);
  return (
    <motion.button
      onClick={onClick}
      className={['dropdown-item', className].join(' ')}
      whileHover={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}
      transition={transition}
    >
      {icon && <span className="dropdown-item__icon">{icon}</span>}
      <span className="dropdown-item__label">{children}</span>
    </motion.button>
  );
};

export default Dropdown;

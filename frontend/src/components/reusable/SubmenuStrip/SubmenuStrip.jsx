import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useMotionTransition from '../../../composables/useMotionTransition.js';
import { getIcon } from '../../icons/Icons.jsx';
import './SubmenuStrip.css';

const CONTAINER_SPRING = { type: 'spring', stiffness: 320, damping: 24, mass: 0.5 };
const ITEM_SPRING = { type: 'spring', stiffness: 380, damping: 26, mass: 0.4 };

const VARIANTS = {
  sidebar: {
    container: {
      initial: { opacity: 0, scaleX: 0.6, x: -8 },
      animate: { opacity: 1, scaleX: 1, x: 0 },
      exit:    { opacity: 0, scaleX: 0.6, x: -8 },
    },
    items: { animate: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } } },
    item: {
      initial: { opacity: 0, x: -12 },
      animate: { opacity: 1, x: 0 },
    },
    style: { transformOrigin: 'left center' },
  },
  'bottom-nav': {
    container: {
      initial: { opacity: 0, scaleY: 0.7, y: 12, filter: 'blur(8px)' },
      animate: { opacity: 1, scaleY: 1, y: 0, filter: 'blur(0px)' },
      exit:    { opacity: 0, scaleY: 0.7, y: 12, filter: 'blur(8px)' },
    },
    items: { animate: { transition: { staggerChildren: 0.05, delayChildren: 0.06 } } },
    item: {
      initial: { opacity: 0, y: 12, scale: 0.9 },
      animate: { opacity: 1, y: 0, scale: 1 },
    },
    style: { transformOrigin: 'bottom center' },
  },
};

const SubmenuStrip = ({
  isOpen,
  onClose,
  onSelect,
  parentId,
  items = [],
  anchorRect,
  orientation = 'horizontal',
  variant = 'sidebar',
}) => {
  const containerTransition = useMotionTransition(CONTAINER_SPRING);
  const itemTransition = useMotionTransition(ITEM_SPRING);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  const v = VARIANTS[variant] ?? VARIANTS.sidebar;

  // Position calculation
  let style = { position: 'fixed', zIndex: 60, ...v.style };
  if (anchorRect) {
    if (variant === 'sidebar') {
      style.left = `${anchorRect.right + 12}px`;
      style.top = `${anchorRect.top}px`;
    } else {
      style.bottom = `${window.innerHeight - anchorRect.top + 12}px`;
      const centerX = anchorRect.left + anchorRect.width / 2;
      style.left = `${centerX}px`;
      style.transform = 'translateX(-50%)';
    }
  }

  const handleSelect = (childId) => {
    const fullId = parentId ? `${parentId}/${childId}` : childId;
    onSelect?.(fullId);
  };

  const jsx = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="submenu-strip-backdrop"
            className="submenu-strip__backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          <motion.div
            key="submenu-strip"
            className={`submenu-strip submenu-strip--${variant} submenu-strip--${orientation}`}
            style={style}
            variants={v.container}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={containerTransition}
          >
            <motion.div
              className="submenu-strip__items"
              variants={v.items}
              initial="initial"
              animate="animate"
            >
              {items.map((it) => (
                <motion.button
                  key={it.id}
                  type="button"
                  className="submenu-strip__item"
                  onClick={() => handleSelect(it.id)}
                  variants={v.item}
                  transition={itemTransition}
                >
                  <span className="submenu-strip__item-icon">
                    {getIcon(it.icon, { width: 18, height: 18 })}
                  </span>
                  <span className="submenu-strip__item-label">{it.label}</span>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(jsx, document.body);
};

export default SubmenuStrip;

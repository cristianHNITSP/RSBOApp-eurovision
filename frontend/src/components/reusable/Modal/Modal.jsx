import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IconClose } from '../../icons/Icons.jsx';
import useMotionTransition from '../../../composables/useMotionTransition.js';
import useBreakpoint from '../../../composables/useBreakpoint.js';
import './Modal.css';

const SIZE_MAP = { small: 'sm', medium: 'md', large: 'lg', xlarge: 'xl' };

const SPRING_DESKTOP = { type: 'spring', stiffness: 250, damping: 20, mass: 1 };
const SPRING_MOBILE  = { type: 'spring', stiffness: 340, damping: 30, mass: 0.85 };

const Modal = ({ isOpen, onClose, title, children, size = 'medium', onAnimationComplete }) => {
  const sizeKey = SIZE_MAP[size] || size;
  const { isMobile } = useBreakpoint();

  const desktopTransition = useMotionTransition(SPRING_DESKTOP);
  const mobileTransition  = useMotionTransition(SPRING_MOBILE);

  const panelInitial  = isMobile ? { y: '100%' }              : { opacity: 0, scale: 0.9, y: 30 };
  const panelAnimate  = isMobile ? { y: 0 }                   : { opacity: 1, scale: 1,   y: 0  };
  const panelExit     = isMobile ? { y: '100%' }              : { opacity: 0, scale: 0.9, y: 30 };
  const panelTransition = isMobile ? mobileTransition : desktopTransition;

  const modalJSX = (
    <AnimatePresence>
      {isOpen && (
        <div className={`modal__overlay${isMobile ? ' modal__overlay--mobile' : ''}`}>
          <motion.div
            className="modal__backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          />
          <motion.div
            className={`modal modal--${sizeKey}`}
            initial={panelInitial}
            animate={panelAnimate}
            exit={panelExit}
            transition={panelTransition}
            onAnimationComplete={onAnimationComplete}
          >
            {isMobile && <div className="modal__handle" />}
            <div className="modal__header">
              <h3 className="modal__title">{title}</h3>
              <button className="modal__close" onClick={onClose}>
                <IconClose width={16} height={16} />
              </button>
            </div>
            <div className="modal__body">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalJSX, document.body)
    : modalJSX;
};

export default Modal;

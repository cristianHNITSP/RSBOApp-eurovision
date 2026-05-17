import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IconClose } from '../../icons/Icons.jsx';
import useMotionTransition from '../../../composables/useMotionTransition.js';
import './Modal.css';

const SIZE_MAP = { small: 'sm', medium: 'md', large: 'lg', xlarge: 'xl' };

const SPRING = { type: "spring", stiffness: 250, damping: 20, mass: 1 };

const Modal = ({ isOpen, onClose, title, children, size = 'medium' }) => {
  const sizeKey = SIZE_MAP[size] || size;
  const transition = useMotionTransition(SPRING);

  const modalJSX = (
    <AnimatePresence>
      {isOpen && (
        <div className="modal__overlay">
          <motion.div
            className="modal__backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={transition}
          />
          <motion.div
            className={`modal modal--${sizeKey}`}
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={transition}
          >
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

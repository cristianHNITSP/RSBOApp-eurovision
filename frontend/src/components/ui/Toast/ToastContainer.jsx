import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from 'react-responsive';
import { useToastState } from '../../../composables/useToast.js';
import useMotionTransition from '../../../composables/useMotionTransition.js';
import { usePreferences } from '../../../composables/usePreferences.js';
import { IconCheck, IconClose, IconInfo, IconWarning, IconError } from '../../icons/Icons.jsx';
import './Toast.css';

const SPRING = { type: 'spring', stiffness: 500, damping: 30, mass: 1 };
const EXIT_TWEEN = { duration: 0.2 };

const getIcon = (type) => {
  const props = { width: 20, height: 20 };
  switch (type) {
    case 'success': return <IconCheck {...props} />;
    case 'warning': return <IconWarning {...props} />;
    case 'error': return <IconError {...props} />;
    default: return <IconInfo {...props} />;
  }
};

const ToastContainer = () => {
  const { toasts, removeToast } = useToastState();
  const isMobile = useMediaQuery({ maxWidth: 639 });
  const transition = useMotionTransition(SPRING);
  const { animacion } = usePreferences();
  const exitTransition = animacion ? { duration: 0 } : EXIT_TWEEN;

  return (
    <div className={`toast-container ${isMobile ? 'toast-container--mobile' : 'toast-container--desktop'}`}>
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            layout
            initial={isMobile
              ? { opacity: 0, y: -50, scale: 0.9 }
              : { opacity: 0, x: 50, scale: 0.9 }
            }
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: exitTransition }}
            transition={transition}
            className={`toast toast--${toast.type}`}
          >
            <div className={`toast__icon toast__icon--${toast.type}`}>
              {getIcon(toast.type)}
            </div>
            <div className="toast__content">
              {toast.title && <div className="toast__title">{toast.title}</div>}
              <div className="toast__msg">{toast.message}</div>
            </div>
            <button className="toast__close" onClick={() => removeToast(toast.id)}>
              <IconClose width={16} height={16} />
            </button>

            {toast.duration > 0 && (
              <div
                className={`toast__progress toast__progress--${toast.type}`}
                style={{ animationDuration: `${toast.duration}ms` }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;

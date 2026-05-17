import { motion, AnimatePresence } from 'framer-motion';
import useMotionTransition from '../../../composables/useMotionTransition.js';
import NotificationItem from '../NotificationItem/NotificationItem.jsx';
import { IconBell, IconClose, IconCheck } from '../../icons/Icons.jsx';
import './NotificationPanel.css';

const SPRING = { type: "spring", stiffness: 300, damping: 20, mass: 1 };

const NotificationPanel = ({ isOpen, onClose, notifications = [] }) => {
  const liquidTransition = useMotionTransition(SPRING);
  let buttonRect = null;
  if (isOpen && typeof document !== 'undefined') {
    const btn = document.querySelector('.notification-trigger');
    if (btn) buttonRect = btn.getBoundingClientRect();
  }

  const topPx = buttonRect ? buttonRect.bottom + 12 : 80;
  
  const panelRightOffset = 32; // var(--space-8)
  let arrowRightPx = 24;
  if (buttonRect) {
    const buttonCenterFromRight = window.innerWidth - (buttonRect.left + buttonRect.width / 2);
    arrowRightPx = buttonCenterFromRight - panelRightOffset;
    if (arrowRightPx < 10) arrowRightPx = 10;
    if (arrowRightPx > 460) arrowRightPx = 460;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="backdrop"
          className="notif-panel__backdrop" 
          onClick={onClose} 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}

      {isOpen && (
        <motion.div 
          key="panel"
          className="notif-panel" 
          style={{ 
            top: `${topPx}px`, 
            transformOrigin: `calc(100% - ${arrowRightPx}px) 0px`,
            '--arrow-right': `${arrowRightPx - 8}px`
          }}
          initial={{ opacity: 0, scale: 0.88, y: -16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -8 }}
          transition={liquidTransition}
        >
          <div className="notif-panel__overlay" />
          <div className="notif-panel__header">
            <div className="notif-panel__header-row">
              <div className="notif-panel__title-group">
                <span className="notif-panel__title-icon"><IconBell width={20} height={20} /></span>
                <h3 className="notif-panel__title">Notificaciones</h3>
              </div>
              <button className="notif-panel__close" onClick={onClose}>
                <IconClose width={16} height={16} />
              </button>
            </div>
          </div>

          <div className="notif-panel__body">
            {notifications.length > 0 ? (
              notifications.map((notif, idx) => (
                <NotificationItem key={idx} {...notif} />
              ))
            ) : (
              <div className="notif-panel__empty">
                <div className="notif-panel__empty-icon"><IconCheck width={48} height={48} /></div>
                <div>No hay notificaciones</div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;

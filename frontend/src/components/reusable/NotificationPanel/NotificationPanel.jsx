import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useMotionTransition from '../../../composables/useMotionTransition.js';
import NotificationItem from '../NotificationItem/NotificationItem.jsx';
import NotificationItemSkeleton from '../NotificationItem/NotificationItemSkeleton.jsx';
import { IconBell, IconClose, IconCheck, IconChevronRight } from '../../icons/Icons.jsx';
import './NotificationPanel.css';

const SPRING = { type: "spring", stiffness: 250, damping: 20, mass: 1 };

const NotificationPanel = ({
  isOpen,
  onClose,
  notifications = [],
  loading = false,
  unreadCount,
  onMarkAllRead,
  onViewAll,
}) => {
  const transition = useMotionTransition(SPRING);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const computedUnread = unreadCount ?? notifications.filter((n) => !n.read).length;
  const hasUnread = computedUnread > 0;
  const showMarkAll = typeof onMarkAllRead === 'function' && hasUnread;
  const showFooter = typeof onViewAll === 'function';

  let buttonRect = null;
  if (!isMobile && isOpen && typeof document !== 'undefined') {
    const btn = document.querySelector('.notification-trigger');
    if (btn) buttonRect = btn.getBoundingClientRect();
  }

  const topPx = buttonRect ? buttonRect.bottom + 12 : 80;
  const panelRightOffset = 32;
  let arrowRightPx = 24;
  if (buttonRect) {
    const buttonCenterFromRight = window.innerWidth - (buttonRect.left + buttonRect.width / 2);
    arrowRightPx = buttonCenterFromRight - panelRightOffset;
    if (arrowRightPx < 10) arrowRightPx = 10;
    if (arrowRightPx > 460) arrowRightPx = 460;
  }

  const body = (
    <>
      <div className="notif-panel__overlay" />
      {isMobile && <div className="notif-panel__handle" />}
      <div className="notif-panel__header">
        <div className="notif-panel__header-row">
          <div className="notif-panel__title-group">
            <span className="notif-panel__title-icon">
              <IconBell width={16} height={16} />
            </span>
            <h3 className="notif-panel__title">Notificaciones</h3>
            {hasUnread && (
              <span className="notif-panel__title-badge">{computedUnread}</span>
            )}
          </div>
          <div className="notif-panel__actions">
            {showMarkAll && (
              <button
                className="notif-panel__mark-all"
                onClick={onMarkAllRead}
                title="Marcar todas como leídas"
              >
                <IconCheck width={14} height={14} />
                <span>Marcar todas</span>
              </button>
            )}
            <button className="notif-panel__close" onClick={onClose} title="Cerrar">
              <IconClose width={16} height={16} />
            </button>
          </div>
        </div>
      </div>
      <div className="notif-panel__body">
        {loading ? (
          <>
            <NotificationItemSkeleton />
            <NotificationItemSkeleton />
            <NotificationItemSkeleton />
            <NotificationItemSkeleton />
          </>
        ) : notifications.length > 0 ? (
          notifications.map((notif, idx) => (
            <NotificationItem key={idx} {...notif} />
          ))
        ) : (
          <div className="notif-panel__empty">
            <div className="notif-panel__empty-icon"><IconCheck width={32} height={32} /></div>
            <div>No hay notificaciones</div>
            <span className="notif-panel__empty-sub">
              Estás al día con todas tus notificaciones
            </span>
          </div>
        )}
      </div>
      {showFooter && (
        <div className="notif-panel__footer">
          <button className="notif-panel__footer-link" onClick={onViewAll}>
            <span>Ver todas las notificaciones</span>
            <IconChevronRight width={14} height={14} />
          </button>
        </div>
      )}
    </>
  );

  const jsx = (
    <AnimatePresence>
      {isOpen && isMobile && (
        <div key="sheet-overlay" className="notif-sheet__overlay">
          <motion.div
            className="notif-sheet__backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
          />
          <motion.div
            className="notif-panel notif-panel--sheet"
            style={{ transformOrigin: 'bottom' }}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0, opacity: 0 }}
            transition={transition}
          >
            {body}
          </motion.div>
        </div>
      )}

      {isOpen && !isMobile && (
        <>
          <motion.div
            key="backdrop"
            className="notif-panel__backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            key="panel"
            className="notif-panel"
            style={{
              top: `${topPx}px`,
              transformOrigin: `calc(100% - ${arrowRightPx}px) 0px`,
              '--arrow-right': `${arrowRightPx - 8}px`,
            }}
            initial={{ opacity: 0, scale: 0.88, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -8 }}
            transition={transition}
          >
            {body}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(jsx, document.body) : jsx;
};

export default NotificationPanel;

import Skeleton from '../../ui/Skeleton/Skeleton.jsx';
import NotificationItemSkeleton from '../NotificationItem/NotificationItemSkeleton.jsx';
import './NotificationPanel.css';

const NotificationPanelSkeleton = ({ count = 4 }) => {
  return (
    <div className="notif-panel" aria-busy="true" style={{ position: 'static', transform: 'none' }}>
      <div className="notif-panel__overlay" />
      <div className="notif-panel__header">
        <div className="notif-panel__header-row">
          <div className="notif-panel__title-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Skeleton variant="circle" width={20} height={20} />
            <Skeleton variant="text" width={140} height={16} />
          </div>
          <Skeleton variant="circle" width={28} height={28} />
        </div>
      </div>
      <div className="notif-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: count }).map((_, i) => (
          <NotificationItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

export default NotificationPanelSkeleton;

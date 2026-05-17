import Skeleton from '../../ui/Skeleton/Skeleton.jsx';
import './NotificationItem.css';

const NotificationItemSkeleton = () => (
  <div className="notif-item notif-item--info" aria-busy="true">
    <div className="notif-item__row">
      <div className="notif-item__indicator" style={{ background: 'transparent' }}>
        <Skeleton variant="circle" width={14} height={14} />
      </div>
      <div className="notif-item__body" style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div className="notif-item__title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Skeleton variant="text" width="55%" height={14} />
          <div style={{ display: 'flex', gap: 6 }}>
            <Skeleton variant="circle" width={20} height={20} />
            <Skeleton variant="circle" width={20} height={20} />
          </div>
        </div>
        <Skeleton variant="text" width="85%" height={12} />
        <div className="notif-item__meta" style={{ display: 'flex', gap: 12 }}>
          <Skeleton variant="text" width={70} height={10} />
          <Skeleton variant="text" width={60} height={10} />
        </div>
      </div>
    </div>
  </div>
);

export default NotificationItemSkeleton;

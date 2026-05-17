import Skeleton from '../../ui/Skeleton/Skeleton.jsx';
import './QuickActionCard.css';

const QuickActionCardSkeleton = () => (
  <div className="quick-action" aria-busy="true" style={{ pointerEvents: 'none' }}>
    <div className="quick-action__icon" style={{ background: 'transparent' }}>
      <Skeleton variant="circle" width="100%" height="100%" />
    </div>
    <div className="quick-action__text" style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
      <Skeleton variant="text" width="65%" height={15} />
      <Skeleton variant="text" width="90%" height={12} />
    </div>
  </div>
);

export default QuickActionCardSkeleton;

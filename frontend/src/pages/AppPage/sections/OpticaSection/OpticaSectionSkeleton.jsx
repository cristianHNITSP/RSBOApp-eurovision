import Skeleton from '../../../../components/ui/Skeleton/Skeleton.jsx';
import QuickActionCardSkeleton from '../../../../components/reusable/QuickActionCard/QuickActionCardSkeleton.jsx';
import TabNavSkeleton from '../../../../components/reusable/TabNav/TabNavSkeleton.jsx';
import './OpticaSection.css';

const OpticaSectionSkeleton = () => (
  <div className="inv-optica-section" aria-busy="true">
    <div className="inv-optica-content">
      <div className="inv-optica-content__eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Skeleton variant="circle" width={16} height={16} />
        <Skeleton variant="text" width={120} height={12} />
      </div>
      <Skeleton variant="text" width={160} height={30} />
      <Skeleton variant="text" width="100%" height={20} />
      <Skeleton variant="text" width="55%" height={20} />

      <div className="inv-optica-cards" style={{ marginTop: 12 }}>
        <QuickActionCardSkeleton />
        <QuickActionCardSkeleton />
        <QuickActionCardSkeleton />
      </div>

      <div style={{ marginTop: 16 }}>
        <TabNavSkeleton count={3} />
      </div>

      <div style={{ marginTop: 16 }}>
        <Skeleton variant="rect" width="100%" height={225} />
      </div>
    </div>
  </div>
);

export default OpticaSectionSkeleton;

import Skeleton from '../../../../components/ui/Skeleton/Skeleton.jsx';
import QuickActionCardSkeleton from '../../../../components/reusable/QuickActionCard/QuickActionCardSkeleton.jsx';
import './BasesMicasSection.css';

const BasesMicasSectionSkeleton = () => (
  <div className="inv-bases-section" aria-busy="true">
    <div className="inv-bases-content">
      <div className="inv-bases-content__eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Skeleton variant="circle" width={16} height={16} />
        <Skeleton variant="text" width={120} height={12} />
      </div>
      <Skeleton variant="text" width={180} height={30} />
      <Skeleton variant="text" width="100%" height={20} />
      <Skeleton variant="text" width="55%" height={20} />

      <div className="inv-bases-cards" style={{ marginTop: 12 }}>
        <QuickActionCardSkeleton />
        <QuickActionCardSkeleton />
        <QuickActionCardSkeleton />
      </div>

      <Skeleton variant="rect" width="100%" height={225} />
    </div>
  </div>
);

export default BasesMicasSectionSkeleton;

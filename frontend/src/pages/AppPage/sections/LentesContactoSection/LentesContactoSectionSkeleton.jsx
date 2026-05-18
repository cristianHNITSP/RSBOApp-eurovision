import Skeleton from '../../../../components/ui/Skeleton/Skeleton.jsx';
import QuickActionCardSkeleton from '../../../../components/reusable/QuickActionCard/QuickActionCardSkeleton.jsx';
import './LentesContactoSection.css';

const LentesContactoSectionSkeleton = () => (
  <div className="inv-lentes-section" aria-busy="true">
    <div className="inv-lentes-content">
      <div className="inv-lentes-content__eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Skeleton variant="circle" width={16} height={16} />
        <Skeleton variant="text" width={120} height={12} />
      </div>
      <Skeleton variant="text" width={220} height={30} />
      <Skeleton variant="text" width="100%" height={20} />
      <Skeleton variant="text" width="55%" height={20} />

      <div className="inv-lentes-cards" style={{ marginTop: 12 }}>
        <QuickActionCardSkeleton />
        <QuickActionCardSkeleton />
        <QuickActionCardSkeleton />
      </div>

      <Skeleton variant="rect" width="100%" height={225} />
    </div>
  </div>
);

export default LentesContactoSectionSkeleton;

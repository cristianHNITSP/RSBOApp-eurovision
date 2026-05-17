import SectionBannerSkeleton from '../../../../components/reusable/SectionBanner/SectionBannerSkeleton.jsx';
import QuickActionCardSkeleton from '../../../../components/reusable/QuickActionCard/QuickActionCardSkeleton.jsx';
import UsersTableSkeleton from '../../../../components/reusable/UsersTable/UsersTableSkeleton.jsx';
import Skeleton from '../../../../components/ui/Skeleton/Skeleton.jsx';
import './UsersSection.css';

const UsersSectionSkeleton = () => (
  <div className="users-section" aria-busy="true">
    <SectionBannerSkeleton showAvatar showActions />

    <div className="users-content">
      <div className="users-content__header" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Skeleton variant="text" width={180} height={12} />
        <Skeleton variant="text" width={260} height={22} />
        <Skeleton variant="text" width="55%" height={13} />
        <div className="users-content__summary" style={{ display: 'flex', gap: 16 }}>
          <Skeleton variant="text" width={100} height={12} />
          <Skeleton variant="text" width={80} height={12} />
          <Skeleton variant="text" width={120} height={12} />
        </div>
      </div>

      <div className="users-quick-actions">
        <QuickActionCardSkeleton />
        <QuickActionCardSkeleton />
      </div>

      <div className="users-filters">
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton variant="text" width="55%" height={11} />
            <Skeleton variant="rect" width="100%" height={38} radius={10} />
          </div>
        ))}
      </div>

      <UsersTableSkeleton />
    </div>
  </div>
);

export default UsersSectionSkeleton;

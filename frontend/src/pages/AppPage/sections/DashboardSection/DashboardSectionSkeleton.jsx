import UserProfileCardSkeleton from '../../../../components/reusable/UserProfileCard/UserProfileCardSkeleton.jsx';
import StatCardSkeleton from '../../../../components/reusable/StatCard/StatCardSkeleton.jsx';
import TabNavSkeleton from '../../../../components/reusable/TabNav/TabNavSkeleton.jsx';
import Skeleton from '../../../../components/ui/Skeleton/Skeleton.jsx';
import { dashboardStats, dashboardTabs } from '../../../../data/statsCards.js';
import './DashboardSection.css';

const DashboardSectionSkeleton = () => (
  <div className="dashboard" aria-busy="true">
    <div className="dashboard__hero">
      <UserProfileCardSkeleton />
    </div>

    <div className="dashboard__stats">
      {dashboardStats.map((stat, i) => (
        <StatCardSkeleton key={i} variant={stat.variant} />
      ))}
    </div>

    <div className="dashboard__tabs">
      <TabNavSkeleton count={Math.max(3, dashboardTabs.length)} />
      <div className="dashboard__tab-content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
          <Skeleton variant="text" width="40%" height={16} />
          <Skeleton variant="text" width="80%" height={12} />
          <Skeleton variant="text" width="65%" height={12} />
          <Skeleton variant="rect" width="100%" height={140} radius={12} />
        </div>
      </div>
    </div>
  </div>
);

export default DashboardSectionSkeleton;

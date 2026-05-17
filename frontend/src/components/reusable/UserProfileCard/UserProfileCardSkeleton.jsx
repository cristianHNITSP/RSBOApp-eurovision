import Skeleton from '../../ui/Skeleton/Skeleton.jsx';
import './UserProfileCard.css';

const UserProfileCardSkeleton = ({ showAdminBtn = true }) => (
  <div className="user-profile-card" aria-busy="true">
    <div className="user-profile-card__header">
      <div className="user-profile-card__header-left">
        <Skeleton variant="circle" width={96} height={96} />
        <div className="user-profile-card__info" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="user-profile-card__greeting-badge">
            <Skeleton variant="badge" width={150} height={22} />
          </div>
          <Skeleton variant="text" width={180} height={12} />
          <Skeleton variant="text" width={240} height={26} />
          <Skeleton variant="text" width={200} height={13} />
        </div>
      </div>

      <div className="user-profile-card__end">
        <div className="user-profile-card__stats">
          {[0, 1, 2].map((i) => (
            <div key={i} className="user-profile-card__stat" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton variant="text" width={48} height={26} />
              <Skeleton variant="text" width={64} height={11} />
            </div>
          ))}
        </div>
        {showAdminBtn && (
          <Skeleton variant="rect" width={220} height={44} radius={12} />
        )}
      </div>
    </div>

    <div className="user-profile-card__footer">
      <div className="user-profile-card__meta">
        <div className="user-profile-card__meta-item" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Skeleton variant="circle" width={14} height={14} />
          <Skeleton variant="text" width={160} height={12} />
        </div>
        <div className="user-profile-card__meta-item" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Skeleton variant="circle" width={14} height={14} />
          <Skeleton variant="text" width={120} height={12} />
        </div>
      </div>
    </div>
  </div>
);

export default UserProfileCardSkeleton;

import Skeleton from '../../ui/Skeleton/Skeleton.jsx';
import './StatCard.css';

const VARIANTS = ['default', 'purple', 'blue', 'green', 'orange', 'cyan', 'red'];

const StatCardSkeleton = ({ variant = 'default', showDescription = true }) => {
  const v = VARIANTS.includes(variant) ? variant : 'default';
  return (
    <div className={`stat-card stat-card--${v}`} aria-busy="true">
      <div className="stat-card__overlay" />
      <div className="stat-card__content">
        <div className="stat-card__header">
          <div className="stat-card__icon" style={{ background: 'transparent' }}>
            <Skeleton variant="circle" width="100%" height="100%" />
          </div>
        </div>
        <div className="stat-card__value">
          <Skeleton variant="text" width="55%" height={28} />
        </div>
        <div className="stat-card__label" style={{ marginTop: 6 }}>
          <Skeleton variant="text" width="70%" height={13} />
        </div>
        {showDescription && (
          <div className="stat-card__description" style={{ marginTop: 6 }}>
            <Skeleton variant="text" width="90%" height={11} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCardSkeleton;

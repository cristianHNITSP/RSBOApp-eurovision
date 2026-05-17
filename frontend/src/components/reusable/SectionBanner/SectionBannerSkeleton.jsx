import Skeleton from '../../ui/Skeleton/Skeleton.jsx';
import './SectionBanner.css';

const SectionBannerSkeleton = ({ showAvatar = false, showActions = false }) => (
  <div className="section-banner" aria-busy="true">
    <div className="section-banner__overlay" />
    <div className="section-banner__content">
      <div className="section-banner__main-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          {showAvatar && (
            <div className="section-banner__avatar">
              <Skeleton variant="circle" width={48} height={48} />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="section-banner__tags" style={{ display: 'flex', gap: 8 }}>
              <Skeleton variant="badge" width={80} height={20} />
              <Skeleton variant="badge" width={64} height={20} />
            </div>
            <Skeleton variant="text" width={260} height={14} />
          </div>
        </div>
        <Skeleton variant="badge" width={88} height={26} />
      </div>
      {showActions && (
        <div className="section-banner__actions" style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <Skeleton variant="rect" width={120} height={36} radius={10} />
          <Skeleton variant="rect" width={120} height={36} radius={10} />
        </div>
      )}
    </div>
  </div>
);

export default SectionBannerSkeleton;

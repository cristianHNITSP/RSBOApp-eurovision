import Skeleton from '../../ui/Skeleton/Skeleton.jsx';
import useBreakpoint from '../../../composables/useBreakpoint.js';
import './Header.css';

const HeaderSkeleton = ({ showSearch = true }) => {
  const { isMobileOrTablet } = useBreakpoint();
  const compact = isMobileOrTablet;

  return (
    <header className="app-header" aria-busy="true">
      <div className="app-header__inner">
        <div className="app-header__left" style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <div className="app-header__breadcrumbs" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Skeleton variant="text" width={60} height={11} />
            <Skeleton variant="text" width={8} height={11} />
            <Skeleton variant="text" width={80} height={11} />
          </div>
          <Skeleton variant="text" width={compact ? 140 : 220} height={22} />
        </div>

        {showSearch && !compact && (
          <div className="app-header__search" style={{ flex: 1, maxWidth: 380 }}>
            <Skeleton variant="rect" width="100%" height={38} radius={10} />
          </div>
        )}

        <div className="app-header__right" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {showSearch && compact && (
            <Skeleton variant="circle" width={38} height={38} />
          )}
          <Skeleton variant="circle" width={38} height={38} />
          <Skeleton variant="rect" width={108} height={38} radius={10} />
        </div>
      </div>
    </header>
  );
};

export default HeaderSkeleton;

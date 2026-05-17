import Skeleton from '../../ui/Skeleton/Skeleton.jsx';
import useBreakpoint from '../../../composables/useBreakpoint.js';
import './Sidebar.css';

const NAV_ITEMS = [
  { id: 'i1', section: 0, width: '78%' },
  { id: 'i2', section: 0, width: '65%' },
  { id: 'i3', section: 0, width: '70%' },
  { id: 'i4', section: 1, width: '60%' },
  { id: 'i5', section: 1, width: '72%' },
  { id: 'i6', section: 1, width: '58%' },
  { id: 'i7', section: 1, width: '68%' },
];

const SidebarSkeleton = ({ collapsed = false }) => {
  const { isTablet } = useBreakpoint();
  const effectiveCollapsed = isTablet ? true : collapsed;

  return (
    <aside
      className={`sidebar ${effectiveCollapsed ? 'sidebar--collapsed' : 'sidebar--expanded'}`}
      aria-busy="true"
    >
      <div className="sidebar__bg" />
      <div className="sidebar__orb-2" />

      <div className="sidebar__inner">
        <div className="sidebar__header">
          <div className="sidebar__header-row" style={{ gap: 12 }}>
            {!effectiveCollapsed && (
              <div className="sidebar__brand" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Skeleton variant="text" width="60%" height={18} />
                <Skeleton variant="text" width="85%" height={11} />
              </div>
            )}
            <Skeleton variant="circle" width={32} height={32} />
          </div>
        </div>

        <nav className="sidebar__nav" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {[0, 1].map((sectionIdx) => (
            <div key={sectionIdx} className="sidebar__section">
              {!effectiveCollapsed && (
                <div className="sidebar__section-label" style={{ padding: '0 8px 8px' }}>
                  <Skeleton variant="text" width="40%" height={10} />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {NAV_ITEMS.filter((it) => it.section === sectionIdx).map((item) => (
                  <div
                    key={item.id}
                    className="sidebar__item"
                    style={{ pointerEvents: 'none', background: 'transparent' }}
                  >
                    <div className="sidebar__item-left">
                      <span className="sidebar__item-icon">
                        <Skeleton variant="circle" width={20} height={20} />
                      </span>
                      {!effectiveCollapsed && (
                        <span className="sidebar__item-label" style={{ flex: 1 }}>
                          <Skeleton variant="text" width={item.width} height={13} />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <Skeleton variant="circle" width={40} height={40} />
            {!effectiveCollapsed && (
              <div className="sidebar__user-info" style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <Skeleton variant="text" width="70%" height={13} />
                <Skeleton variant="text" width="50%" height={11} />
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default SidebarSkeleton;

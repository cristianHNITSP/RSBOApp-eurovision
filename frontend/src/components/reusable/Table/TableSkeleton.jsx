import Skeleton from '../../ui/Skeleton/Skeleton.jsx';
import useBreakpoint from '../../../composables/useBreakpoint.js';
import './Table.css';

const DEFAULT_ROWS = 7;

const TableSkeleton = ({ rows = DEFAULT_ROWS }) => {
  const { isMobileOrTablet } = useBreakpoint();

  const desktop = (
    <div className="table" aria-busy="true">
      <table className="table__el">
        <thead>
          <tr className="table__head">
            <th><Skeleton variant="text" width={70} height={11} /></th>
            <th><Skeleton variant="text" width={120} height={11} /></th>
            <th><Skeleton variant="text" width={90} height={11} /></th>
            <th><Skeleton variant="text" width={60} height={11} /></th>
            <th><Skeleton variant="text" width={50} height={11} /></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="table__row">
              <td className="table__cell">
                <div className="table__identity" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Skeleton variant="circle" width={36} height={36} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Skeleton variant="text" width={130} height={13} />
                    <Skeleton variant="text" width={80} height={11} />
                  </div>
                </div>
              </td>
              <td className="table__cell">
                <Skeleton variant="text" width={120} height={12} />
              </td>
              <td className="table__cell">
                <Skeleton variant="text" width={90} height={12} />
              </td>
              <td className="table__cell">
                <Skeleton variant="badge" width={64} height={20} />
              </td>
              <td className="table__cell">
                <Skeleton variant="text" width={70} height={12} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const mobile = (
    <div className="table-cards" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="table-card">
          <div className="table-card__top" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Skeleton variant="circle" width={40} height={40} />
            <div className="table-card__identity" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton variant="text" width="65%" height={14} />
              <Skeleton variant="text" width="45%" height={11} />
            </div>
            <Skeleton variant="badge" width={64} height={22} />
          </div>
          <div className="table-card__meta" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            <div className="table-card__meta-item" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Skeleton variant="circle" width={14} height={14} />
              <Skeleton variant="text" width="55%" height={11} />
            </div>
            <div className="table-card__meta-item" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Skeleton variant="circle" width={14} height={14} />
              <Skeleton variant="text" width="60%" height={11} />
            </div>
            <div className="table-card__meta-item" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Skeleton variant="circle" width={14} height={14} />
              <Skeleton variant="text" width="50%" height={11} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div>{isMobileOrTablet ? mobile : desktop}</div>
      <div className="table__pagination" aria-busy="true">
        <Skeleton variant="text" width={110} height={11} />
        <div className="table__pagination-controls" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Skeleton variant="circle" width={28} height={28} />
          <Skeleton variant="text" width={40} height={11} />
          <Skeleton variant="circle" width={28} height={28} />
        </div>
      </div>
    </>
  );
};

export default TableSkeleton;

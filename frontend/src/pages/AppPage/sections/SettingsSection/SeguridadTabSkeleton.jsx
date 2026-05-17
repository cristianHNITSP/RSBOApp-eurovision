import Skeleton from '../../../../components/ui/Skeleton/Skeleton.jsx';

const SeguridadTabSkeleton = () => (
  <div className="settings-grid" aria-busy="true">
    <div className="settings-form-card">
      <div className="settings-form-card__eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Skeleton variant="circle" width={16} height={16} />
        <Skeleton variant="badge" width={90} height={20} />
      </div>
      <Skeleton variant="text" width={220} height={18} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton variant="text" width="45%" height={11} />
            <Skeleton variant="rect" width="100%" height={38} radius={10} />
          </div>
        ))}
        <Skeleton variant="rect" width="100%" height={42} radius={10} />
      </div>
    </div>

    <div className="settings-form-card">
      <div className="settings-form-card__eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Skeleton variant="circle" width={16} height={16} />
        <Skeleton variant="badge" width={70} height={20} />
      </div>
      <Skeleton variant="text" width={180} height={18} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="settings-session-row"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <Skeleton variant="circle" width={28} height={28} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <Skeleton variant="text" width="55%" height={12} />
                <Skeleton variant="text" width="70%" height={10} />
              </div>
            </div>
            <Skeleton variant="badge" width={64} height={20} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default SeguridadTabSkeleton;

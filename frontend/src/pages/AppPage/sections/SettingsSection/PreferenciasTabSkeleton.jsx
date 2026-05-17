import Skeleton from '../../../../components/ui/Skeleton/Skeleton.jsx';

const PreferenciasTabSkeleton = () => (
  <div className="settings-grid" aria-busy="true">
    <div className="settings-form-card">
      <div className="settings-form-card__eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Skeleton variant="circle" width={16} height={16} />
        <Skeleton variant="badge" width={88} height={20} />
      </div>
      <Skeleton variant="text" width={180} height={18} />

      <div className="settings-theme-options" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginTop: 16 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="settings-theme-card" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
            <Skeleton variant="rect" width="100%" height={72} radius={10} />
            <Skeleton variant="text" width="60%" height={13} />
            <Skeleton variant="text" width="85%" height={11} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
        {[0, 1].map((i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton variant="text" width="30%" height={12} />
            <Skeleton variant="rect" width="100%" height={38} radius={10} />
          </div>
        ))}
      </div>
    </div>

    <div className="settings-form-card">
      <div className="settings-form-card__eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Skeleton variant="circle" width={16} height={16} />
        <Skeleton variant="badge" width={88} height={20} />
      </div>
      <Skeleton variant="text" width={220} height={18} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="settings-toggle-row"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              <Skeleton variant="text" width="40%" height={13} />
              <Skeleton variant="text" width="75%" height={11} />
            </div>
            <Skeleton variant="rect" width={44} height={24} radius={999} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default PreferenciasTabSkeleton;

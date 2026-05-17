import Skeleton from '../../../../components/ui/Skeleton/Skeleton.jsx';

const PerfilTabSkeleton = () => (
  <div className="settings-grid" aria-busy="true">
    <div className="settings-profile-card">
      <div className="settings-profile-card__badges" style={{ display: 'flex', gap: 8 }}>
        <Skeleton variant="badge" width={70} height={20} />
        <Skeleton variant="badge" width={70} height={20} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
        <Skeleton variant="circle" width={96} height={96} />
      </div>

      <div className="settings-profile-card__name-center" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        <Skeleton variant="text" width={200} height={20} />
        <Skeleton variant="text" width={140} height={12} />
      </div>

      <div className="settings-profile-card__stats" style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        {[0, 1].map((i) => (
          <div key={i} className="settings-stat-box" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton variant="text" width="65%" height={10} />
            <Skeleton variant="text" width="80%" height={14} />
          </div>
        ))}
      </div>
    </div>

    <div className="settings-form-card">
      <div className="settings-form-card__eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Skeleton variant="circle" width={16} height={16} />
        <Skeleton variant="badge" width={70} height={20} />
      </div>
      <Skeleton variant="text" width={220} height={18} />

      <div className="settings-form-card__fields" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
        {[0, 1].map((i) => (
          <div key={i} className="settings-form-card__field" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton variant="text" width="35%" height={11} />
            <Skeleton variant="rect" width="100%" height={38} radius={10} />
          </div>
        ))}
        <div className="settings-form-card__row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[0, 1].map((i) => (
            <div key={i} className="settings-form-card__field" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton variant="text" width="50%" height={11} />
              <Skeleton variant="rect" width="100%" height={38} radius={10} />
            </div>
          ))}
        </div>
        <Skeleton variant="rect" width="100%" height={42} radius={10} />
      </div>
    </div>
  </div>
);

export default PerfilTabSkeleton;

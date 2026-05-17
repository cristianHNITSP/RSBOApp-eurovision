import QuickActionCardSkeleton from '../../../../components/reusable/QuickActionCard/QuickActionCardSkeleton.jsx';
import TabNavSkeleton from '../../../../components/reusable/TabNav/TabNavSkeleton.jsx';
import Skeleton from '../../../../components/ui/Skeleton/Skeleton.jsx';
import PerfilTabSkeleton from './PerfilTabSkeleton.jsx';
import PreferenciasTabSkeleton from './PreferenciasTabSkeleton.jsx';
import SeguridadTabSkeleton from './SeguridadTabSkeleton.jsx';
import './SettingsSection.css';

const TAB_SKELETONS = {
  perfil: PerfilTabSkeleton,
  preferencias: PreferenciasTabSkeleton,
  seguridad: SeguridadTabSkeleton,
};

const SettingsSectionSkeleton = ({ activeSubSection = 'perfil' }) => {
  const TabSkel = TAB_SKELETONS[activeSubSection] || PerfilTabSkeleton;

  return (
    <div className="settings-section" aria-busy="true">
      <div className="settings-content">
        <div className="settings-content__eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Skeleton variant="circle" width={16} height={16} />
          <Skeleton variant="text" width={140} height={12} />
        </div>
        <Skeleton variant="text" width={260} height={22} />
        <Skeleton variant="text" width="65%" height={13} />

        <div className="settings-cards" style={{ marginTop: 12 }}>
          <QuickActionCardSkeleton />
          <QuickActionCardSkeleton />
          <QuickActionCardSkeleton />
        </div>

        <div style={{ marginTop: 16 }}>
          <TabNavSkeleton count={3} />
        </div>

        <div style={{ marginTop: 16 }}>
          <TabSkel />
        </div>
      </div>
    </div>
  );
};

export default SettingsSectionSkeleton;

import { useState, useEffect, useRef } from 'react';
import UserProfileCard from '../../../../components/reusable/UserProfileCard/UserProfileCard.jsx';
import StatCard from '../../../../components/reusable/StatCard/StatCard.jsx';
import TabNav, { TabNavProvider, TabPanels, TabPanel } from '../../../../components/reusable/TabNav/TabNav.jsx';
import DashboardSectionSkeleton from './DashboardSectionSkeleton.jsx';
import { dashboardStats, dashboardTabs } from '../../../../data/statsCards.js';
import { currentUser } from '../../../../data/users.js';
import { showToast } from '../../../../composables/useToast.js';
import useSectionLoading from '../../../../composables/useSectionLoading.js';
import './DashboardSection.css';

export const searchConfig = {
  id: 'dashboard',
  title: 'Panel de Control',
  description: 'Resumen del sistema, métricas y atajos rápidos',
  icon: 'dashboard',
  group: 'principal',
  tags: ['inicio', 'home', 'resumen', 'métricas', 'estadísticas', 'panel'],
};

const DashboardSection = ({ onAdminProfile, user = currentUser }) => {
  const [activeTab, setActiveTab] = useState('resumen');
  const hasToasted = useRef(false);
  const { loading } = useSectionLoading('dashboard');

  useEffect(() => {
    if (loading || hasToasted.current) return;
    hasToasted.current = true;
    const id = setTimeout(() => {
      showToast('Listo', `Bienvenido ${user.name}!`, 'success');
    }, 300);
    return () => clearTimeout(id);
  }, [user.name, loading]);

  if (loading) return <DashboardSectionSkeleton />;

  const userInfo = {
    ...user,
    stats: { hojas: 24, pendientes: 12, devoluciones: 2 },
  };

  return (
    <div className="dashboard">
      <div className="dashboard__hero">
        <UserProfileCard {...userInfo} onAdminProfile={onAdminProfile} />
      </div>

      <div className="dashboard__stats">
        {dashboardStats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      <div className="dashboard__tabs">
        <TabNavProvider tabs={dashboardTabs} activeTab={activeTab} onChange={setActiveTab}>
          <TabNav />
          <div className="dashboard__tab-content">
            <TabPanels>
              {dashboardTabs.map((tab) => (
                <TabPanel key={tab.id} tabId={tab.id}>
                  <div className="dashboard__tab-placeholder">
                    Contenido de la pestaña:{' '}
                    <span className="dashboard__tab-placeholder-label">{tab.label}</span>
                  </div>
                </TabPanel>
              ))}
            </TabPanels>
          </div>
        </TabNavProvider>
      </div>

    </div>
  );
};

export default DashboardSection;

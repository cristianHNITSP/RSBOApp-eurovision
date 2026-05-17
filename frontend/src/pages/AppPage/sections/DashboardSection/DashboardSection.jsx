import { useState, useEffect, useRef } from 'react';
import UserProfileCard from '../../../../components/reusable/UserProfileCard/UserProfileCard.jsx';
import StatCard from '../../../../components/reusable/StatCard/StatCard.jsx';
import TabNav, { TabNavProvider, TabPanel } from '../../../../components/reusable/TabNav/TabNav.jsx';
import { dashboardStats, dashboardTabs } from '../../../../data/statsCards.js';
import { currentUser } from '../../../../data/users.js';
import { showToast } from '../../../../composables/useToast.js';
import './DashboardSection.css';

const DashboardSection = ({ onAdminProfile, user = currentUser }) => {
  const [activeTab, setActiveTab] = useState('resumen');
  const hasToasted = useRef(false);

  useEffect(() => {
    if (!hasToasted.current) {
      setTimeout(() => {
        showToast('Listo', `Bienvenido ${user.name}!`, 'success');
      }, 300);
      hasToasted.current = true;
    }
  }, [user.name]);

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
            {dashboardTabs.map((tab) => (
              <TabPanel key={tab.id} tabId={tab.id}>
                <div className="dashboard__tab-placeholder">
                  Contenido de la pestaña:{' '}
                  <span className="dashboard__tab-placeholder-label">{tab.label}</span>
                </div>
              </TabPanel>
            ))}
          </div>
        </TabNavProvider>
      </div>

    </div>
  );
};

export default DashboardSection;

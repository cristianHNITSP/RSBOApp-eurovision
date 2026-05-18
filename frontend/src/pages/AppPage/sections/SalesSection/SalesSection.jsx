import { useEffect, useState } from 'react';
import TabNav, { TabNavProvider, TabPanels, TabPanel } from '../../../../components/reusable/TabNav/TabNav.jsx';
import SectionBanner from '../../../../components/reusable/SectionBanner/SectionBanner.jsx';
import Badge from '../../../../components/ui/Badge/Badge.jsx';
import Button from '../../../../components/ui/Button/Button.jsx';
import { getIcon, IconSettings, IconRefresh, IconPlus } from '../../../../components/icons/Icons.jsx';
import './SalesSection.css';

const TABS = [
  { id: 'pedidos',  label: 'Pedidos',  icon: 'clipboard' },
  { id: 'catalogo', label: 'Catálogo', icon: 'box' },
];

const SalesSection = ({ activeView = 'pedidos' }) => {
  const [activeTab, setActiveTab] = useState(activeView);

  useEffect(() => {
    if (activeView) setActiveTab(activeView);
  }, [activeView]);

  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <div className="sales-section">
      <SectionBanner
        avatar={
          <div className="sales-section__avatar">
            {getIcon(currentTab.icon, { width: 32, height: 32 })}
          </div>
        }
        tags={[
          { label: currentTab.label },
          { label: 'Ventas', size: 'sm' },
        ]}
        subtitle="Módulo de ventas — en desarrollo"
        badge={<Badge variant="warning">Mantenimiento</Badge>}
        actions={
          <>
            <Button variant="success" size="medium" icon={<IconPlus width={16} height={16} />}>Nuevo</Button>
            <Button variant="glass" size="medium" icon={<IconRefresh width={16} height={16} />}>Recargar</Button>
          </>
        }
      />

      <div className="sales-section__body">
        <TabNavProvider tabs={TABS} activeTab={activeTab} onChange={setActiveTab}>
          <TabNav />
          <TabPanels>
            {TABS.map((tab) => (
              <TabPanel key={tab.id} tabId={tab.id}>
                <div className="sales-section__demo">
                  <div className="sales-section__demo-icon">
                    <IconSettings width={36} height={36} />
                  </div>
                  <h3 className="sales-section__demo-title">Mantenimiento</h3>
                  <p className="sales-section__demo-text">
                    Sección <strong>{tab.label}</strong> — módulo en construcción.
                    {tab.id === 'pedidos'
                      ? ' Aquí aparecerán la lista de pedidos, filtros y acciones rápidas.'
                      : ' Aquí se gestionará el catálogo de productos (bases, micas, lentes de contacto, óptica).'}
                  </p>
                </div>
              </TabPanel>
            ))}
          </TabPanels>
        </TabNavProvider>
      </div>
    </div>
  );
};

export default SalesSection;

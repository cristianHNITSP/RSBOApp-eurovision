import { useEffect, useState } from 'react';
import TabNav, { TabNavProvider, TabPanels, TabPanel } from '../../../../components/reusable/TabNav/TabNav.jsx';
import SectionBanner from '../../../../components/reusable/SectionBanner/SectionBanner.jsx';
import Badge from '../../../../components/ui/Badge/Badge.jsx';
import Button from '../../../../components/ui/Button/Button.jsx';
import { getIcon, IconSettings, IconRefresh, IconPlus } from '../../../../components/icons/Icons.jsx';
import './InventorySection.css';

const TABS = [
  { id: 'optica',          label: 'Óptica',             icon: 'eye' },
  { id: 'bases-micas',     label: 'Bases y Micas',      icon: 'shield' },
  { id: 'lentes-contacto', label: 'Lentes de Contacto', icon: 'microscope' },
];

const InventorySection = ({ activeCategory = 'optica' }) => {
  const [activeTab, setActiveTab] = useState(activeCategory);

  useEffect(() => {
    if (activeCategory) setActiveTab(activeCategory);
  }, [activeCategory]);

  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <div className="inventory-section">
      <SectionBanner
        avatar={
          <div className="inventory-section__avatar">
            {getIcon(currentTab.icon, { width: 32, height: 32 })}
          </div>
        }
        tags={[
          { label: currentTab.label },
          { label: 'Inventario', size: 'sm' },
        ]}
        subtitle="Módulo de mantenimiento del catálogo de inventario"
        badge={<Badge variant="warning">Mantenimiento</Badge>}
        actions={
          <>
            <Button variant="success" size="medium" icon={<IconPlus width={16} height={16} />}>Nuevo</Button>
            <Button variant="glass" size="medium" icon={<IconRefresh width={16} height={16} />}>Recargar</Button>
          </>
        }
      />

      <div className="inventory-section__body">
        <TabNavProvider tabs={TABS} activeTab={activeTab} onChange={setActiveTab}>
          <TabNav />
          <TabPanels>
            {TABS.map((tab) => (
              <TabPanel key={tab.id} tabId={tab.id}>
                <div className="inventory-section__demo">
                  <div className="inventory-section__demo-icon">
                    <IconSettings width={36} height={36} />
                  </div>
                  <h3 className="inventory-section__demo-title">Mantenimiento</h3>
                  <p className="inventory-section__demo-text">
                    Sección <strong>{tab.label}</strong> — módulo de mantenimiento en construcción.
                    Aquí se gestionará el catálogo, los atributos y los movimientos del inventario.
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

export default InventorySection;

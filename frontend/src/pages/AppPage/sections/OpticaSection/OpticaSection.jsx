import { useState } from 'react';
import QuickActionCard from '../../../../components/reusable/QuickActionCard/QuickActionCard.jsx';
import TabNav, { TabNavProvider, TabPanels, TabPanel } from '../../../../components/reusable/TabNav/TabNav.jsx';
import { getIcon, IconSettings } from '../../../../components/icons/Icons.jsx';
import useSectionLoading from '../../../../composables/useSectionLoading.js';
import OpticaSectionSkeleton from './OpticaSectionSkeleton.jsx';
import { opticaTabs } from './data.js';

import './OpticaSection.css';

const OpticaSection = () => {
  const [activeTab, setActiveTab] = useState('equipos');
  const { loading } = useSectionLoading('inventario/optica');

  if (loading) return <OpticaSectionSkeleton />;

  return (
    <div className="inv-optica-section">
      <div className="inv-optica-content">
        <div className="inv-optica-content__eyebrow">
          {getIcon('eye', { width: 16, height: 16 })} INVENTARIO
        </div>
        <h2 className="inv-optica-content__title">Óptica</h2>
        <p className="inv-optica-content__desc">
          Gestiona el catálogo de armazones, aros y accesorios ópticos del laboratorio.
        </p>

        <div className="inv-optica-cards">
          <QuickActionCard icon="box"     title="Catálogo"    description="Artículos y referencias ópticas" />
          <QuickActionCard icon="refresh" title="Movimientos" description="Entradas, salidas y ajustes" />
          <QuickActionCard icon="users"   title="Proveedores" description="Gestión de proveedores ópticos" />
        </div>

        <TabNavProvider tabs={opticaTabs} activeTab={activeTab} onChange={setActiveTab}>
          <TabNav />
          <TabPanels>
            {opticaTabs.map((tab) => (
              <TabPanel key={tab.id} tabId={tab.id}>
                <div className="inv-optica-demo-wrapper">
                  <div className="inv-optica-demo">
                    <div className="inv-optica-demo__icon">
                      <IconSettings width={40} height={40} />
                    </div>
                    <h3 className="inv-optica-demo__title">Mantenimiento</h3>
                    <p className="inv-optica-demo__text">
                      Sección <strong>{tab.label}</strong> — módulo en construcción.
                    </p>
                  </div>
                </div>
              </TabPanel>
            ))}
          </TabPanels>
        </TabNavProvider>
      </div>
    </div>
  );
};

export default OpticaSection;

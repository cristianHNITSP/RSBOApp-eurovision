import { useState, useEffect } from 'react';
import QuickActionCard from '../../../../components/reusable/QuickActionCard/QuickActionCard.jsx';
import TabNav, { TabNavProvider, TabPanel } from '../../../../components/reusable/TabNav/TabNav.jsx';
import { IconSettings } from '../../../../components/icons/Icons.jsx';
import PerfilTab from './PerfilTab.jsx';
import PreferenciasTab from './PreferenciasTab.jsx';
import SeguridadTab from './SeguridadTab.jsx';
import './SettingsSection.css';

const TABS = [
  { id: 'perfil',       label: 'Mi perfil',     icon: 'user' },
  { id: 'preferencias', label: 'Preferencias',  icon: 'palette' },
  { id: 'seguridad',    label: 'Seguridad',      icon: 'shield' },
];

const SettingsSection = ({ activeSubSection, onOpenAvatarModal }) => {
  const [activeTab, setActiveTab] = useState(activeSubSection || 'perfil');

  useEffect(() => { if (activeSubSection) setActiveTab(activeSubSection); }, [activeSubSection]);

  return (
    <div className="settings-section">
      <div className="settings-content">
        <div className="settings-content__eyebrow">
          <IconSettings width={16} height={16} /> CONFIGURACIÓN
        </div>
        <h2 className="settings-content__title">Configuración del sistema</h2>
        <p className="settings-content__desc">Gestiona tu perfil, preferencias visuales y seguridad de la cuenta.</p>

        <div className="settings-cards">
          <QuickActionCard icon="user"    title="Mi perfil"    description="Nombre, avatar y contraseña" />
          <QuickActionCard icon="palette" title="Preferencias" description="Tema, fuente y efectos visuales" />
          <QuickActionCard icon="shield"  title="Seguridad"    description="Opciones avanzadas de acceso" />
        </div>

        <TabNavProvider tabs={TABS} activeTab={activeTab} onChange={setActiveTab}>
          <TabNav />
          <TabPanel tabId="perfil">
            <PerfilTab onOpenAvatarModal={onOpenAvatarModal} />
          </TabPanel>
          <TabPanel tabId="preferencias">
            <PreferenciasTab />
          </TabPanel>
          <TabPanel tabId="seguridad">
            <SeguridadTab />
          </TabPanel>
        </TabNavProvider>
      </div>
    </div>
  );
};

export default SettingsSection;

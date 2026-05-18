import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';

import { usePreferences } from '../../composables/usePreferences.js';
import { INSTANT } from '../../composables/useMotionTransition.js';
import useSectionLoading from '../../composables/useSectionLoading.js';
import Sidebar from '../../components/reusable/Sidebar/Sidebar.jsx';
import Header from '../../components/reusable/Header/Header.jsx';
import NotificationPanel from '../../components/reusable/NotificationPanel/NotificationPanel.jsx';
import BottomNav from '../../components/reusable/BottomNav/BottomNav.jsx';
import DashboardSection from './sections/DashboardSection/DashboardSection.jsx';
import UsersSection from './sections/UsersSection/UsersSection.jsx';
import SettingsSection from './sections/SettingsSection/SettingsSection.jsx';
import InventorySection from './sections/InventorySection/InventorySection.jsx';
import SalesSection from './sections/SalesSection/SalesSection.jsx';
import AvatarSelectorModal from '../../components/reusable/AvatarSelectorModal/AvatarSelectorModal.jsx';
import useNotifications from '../../composables/useNotifications.js';
import useBreakpoint from '../../composables/useBreakpoint.js';
import { pageTitles, breadcrumbMap } from '../../data/menuItems.js';
import { currentUser } from '../../data/users.js';
import ToastContainer from '../../components/ui/Toast/ToastContainer.jsx';
import './AppPage.css';

const LIQUID_SPRING = { type: "spring", stiffness: 250, damping: 20, mass: 0.8 };

const getSectionOrder = (id) => {
  const flat = [
    'dashboard', 'analiticas', 'usuarios',
    'inventario',
    'inventario/optica', 'inventario/bases-micas', 'inventario/lentes-contacto',
    'ventas',
    'ventas/pedidos', 'ventas/catalogo',
    'devoluciones', 'encargos',
    'ajustes', 'ajustes-perfil', 'ajustes-preferencias', 'ajustes-seguridad', 'ayuda'
  ];
  return flat.indexOf(id) !== -1 ? flat.indexOf(id) : 0;
};


const AppPage = () => {
  const prefs = usePreferences();
  const [user, setUser] = useState(currentUser);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [direction, setDirection] = useState(0);
  const [avatarModal, setAvatarModal] = useState({ isOpen: false, onSelect: null });
  const { notifications, count, isPanelOpen, openPanel, closePanel } = useNotifications();
  const { isMobile, isTablet } = useBreakpoint();
  const navigate = useNavigate();
  const { loading: bootLoading } = useSectionLoading('__boot__', { bootstrap: 700, change: 0 });

  const openAvatarModal = (onSelect) => setAvatarModal({ isOpen: true, onSelect });
  const closeAvatarModal = () => setAvatarModal({ isOpen: false, onSelect: null });

  const handleModalAvatarSelect = (av) => {
    avatarModal.onSelect?.(av);
    closeAvatarModal();
  };

  const commitGlobalAvatar = (av) => {
    currentUser.avatar = av;
    setUser({ ...currentUser });
  };

  useEffect(() => {
    if (isTablet && !sidebarCollapsed) setSidebarCollapsed(true);
  }, [isTablet]);

  const changeSection = (newId) => {
    const oldIndex = getSectionOrder(activeSection);
    const newIndex = getSectionOrder(newId);
    if (newIndex !== oldIndex) {
      setDirection(newIndex > oldIndex ? 1 : -1);
    }
    setActiveSection(newId);
  };

  const handleSectionChange = (id) => changeSection(id);
  const handleUserClick = (sub) => {
    if (sub === 'logout') {
      sessionStorage.removeItem('rsbo_auth');
      sessionStorage.removeItem('rsbo_user');
      navigate('/login');
    } else {
      changeSection(`ajustes-${sub}`);
    }
  };

  const title = pageTitles[activeSection.startsWith('ajustes') ? 'ajustes' : activeSection] || 'Panel de Control';
  const breadcrumbs = breadcrumbMap[activeSection] || ['Dashboard'];

  const sectionTransition = prefs.animacion ? INSTANT : LIQUID_SPRING;
  const sectionVariants = {
    initial: (dir) => ({ opacity: 0, y: prefs.animacion ? 0 : (dir > 0 ? 12 : -12) }),
    animate: { opacity: 1, y: 0, transition: sectionTransition },
    exit:    (dir) => ({ opacity: 0, y: prefs.animacion ? 0 : (dir > 0 ? -12 : 12), transition: prefs.animacion ? INSTANT : { duration: 0.15 } }),
  };

  const renderSection = () => {
    if (activeSection === 'dashboard') {
      return <DashboardSection onAdminProfile={() => changeSection('ajustes-perfil')} user={user} />;
    }
    if (activeSection === 'usuarios') {
      return <UsersSection openAvatarModal={openAvatarModal} commitGlobalAvatar={commitGlobalAvatar} />;
    }
    if (activeSection.startsWith('ajustes')) {
      const sub = activeSection === 'ajustes' ? 'perfil' : activeSection.replace('ajustes-', '');
      return (
        <SettingsSection
          activeSubSection={sub}
          openAvatarModal={openAvatarModal}
          commitGlobalAvatar={commitGlobalAvatar}
          user={user}
        />
      );
    }
    if (activeSection.startsWith('inventario/')) {
      const child = activeSection.split('/')[1];
      if (['optica', 'bases-micas', 'lentes-contacto'].includes(child)) {
        return <InventorySection activeCategory={child} />;
      }
    }
    if (activeSection.startsWith('ventas/')) {
      const child = activeSection.split('/')[1];
      if (['pedidos', 'catalogo'].includes(child)) {
        return <SalesSection activeView={child} />;
      }
    }
    return <DashboardSection onAdminProfile={() => changeSection('ajustes-perfil')} />;
  };

  return (
    <MotionConfig transition={prefs.animacion ? INSTANT : undefined}>
      <div className={`app-page ${isMobile ? 'app-page--mobile' : ''}`}>
        {!isMobile && (
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((v) => !v)}
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            userInfo={user}
            loading={bootLoading}
          />
        )}

        <div className="app-page__main">
          <Header
            title={title}
            breadcrumbs={breadcrumbs}
            onNotificationClick={openPanel}
            notificationCount={count}
            onUserClick={handleUserClick}
            onNavigate={handleSectionChange}
            showSearch={true}
            loading={bootLoading}
          />
          <div className="app-page__content">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={activeSection}
                custom={direction}
                variants={sectionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                onAnimationStart={() => document.querySelector('.app-page__content')?.classList.add('is-transitioning')}
                onAnimationComplete={() => document.querySelector('.app-page__content')?.classList.remove('is-transitioning')}
                style={{ height: '100%' }}
              >
                {renderSection()}
              </motion.div>
            </AnimatePresence>
          </div>
          {isMobile && (
            <BottomNav activeSection={activeSection} onSectionChange={handleSectionChange} />
          )}
        </div>

        <NotificationPanel
          isOpen={isPanelOpen}
          onClose={closePanel}
          notifications={notifications}
          loading={bootLoading}
        />

        <AvatarSelectorModal
          isOpen={avatarModal.isOpen}
          onClose={closeAvatarModal}
          onSelect={handleModalAvatarSelect}
        />

        <ToastContainer />
      </div>
    </MotionConfig>
  );
};

export default AppPage;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button/Button.jsx';
import { IconMicroscope, IconUser, IconClose } from '../../../components/icons/Icons.jsx';
import useBreakpoint from '../../../composables/useBreakpoint.js';
import './Navbar.css';

const NAV_LINKS = [
  { href: '#productos', label: 'Productos', active: true },
  { href: '#servicios', label: 'Servicios' },
  { href: '#nosotros', label: 'Nosotros' },
  { href: '#contacto', label: 'Contacto' },
];

const HamburgerIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const Navbar = () => {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="landing-nav">
      <div className="landing-nav__inner">
        <div className="landing-nav__brand">
          <div className="landing-nav__logo">
            <IconMicroscope width={22} height={22} />
          </div>
          <span className="landing-nav__name">Laboratorio Eurovisión</span>
        </div>

        {!isMobile && (
          <div className="landing-nav__links">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className={`landing-nav__link ${l.active ? 'landing-nav__link--active' : ''}`}>
                {l.label}
              </a>
            ))}
            <Button
              variant="primary"
              icon={<IconUser width={16} height={16} />}
              onClick={() => navigate('/login')}
            >
              Usuario
            </Button>
          </div>
        )}

        {isMobile && (
          <button
            type="button"
            className="landing-nav__toggle"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <IconClose width={20} height={20} /> : <HamburgerIcon />}
          </button>
        )}
      </div>

      {isMobile && menuOpen && (
        <div className="landing-nav__mobile-panel">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`landing-nav__mobile-link ${l.active ? 'landing-nav__mobile-link--active' : ''}`}
              onClick={closeMenu}
            >
              {l.label}
            </a>
          ))}
          <Button
            variant="primary"
            icon={<IconUser width={16} height={16} />}
            onClick={() => { closeMenu(); navigate('/login'); }}
          >
            Usuario
          </Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

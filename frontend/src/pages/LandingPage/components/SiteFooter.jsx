import { IconMicroscope } from '../../../components/icons/Icons.jsx';
import './SiteFooter.css';

const SiteFooter = () => (
  <footer className="site-footer">
    <div className="container">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <div className="site-footer__logo">
            <IconMicroscope width={22} height={22} />
          </div>
          <div>
            <div className="site-footer__brand-name">Laboratorio</div>
            <div className="site-footer__brand-sub">Eurovisión</div>
          </div>
        </div>

        <div className="site-footer__right">
          <div className="site-footer__contact">
            <div>Tel: 55-1234-5678</div>
            <div>Email: info@eurovision.com.mx</div>
          </div>
          <div className="site-footer__socials">
            <a href="#" className="site-footer__social">f</a>
            <a href="#" className="site-footer__social">in</a>
            <a href="#" className="site-footer__social">yt</a>
          </div>
          <div className="site-footer__legal">
            <div>Aviso de Privacidad</div>
            <div>Términos y Condiciones</div>
          </div>
        </div>
      </div>
    </div>
  </footer>
);

export default SiteFooter;

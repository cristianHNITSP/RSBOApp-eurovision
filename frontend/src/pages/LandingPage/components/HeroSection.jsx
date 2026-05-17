import Button from '../../../components/ui/Button/Button.jsx';
import { IconMicroscope } from '../../../components/icons/Icons.jsx';
import './HeroSection.css';

const HeroSection = () => (
  <section className="hero">
    <div className="hero__overlay" />
    <div className="container">
      <div className="hero__inner">
        <div>
          <h1 className="hero__title">
            Innovación Óptica<br />de Precisión
          </h1>
          <p className="hero__subtitle">
            Descubre la excelencia en tecnología y calidad para el cuidado de la visión.
          </p>
          <Button variant="glass" size="large">
            Explorar Catálogo
          </Button>
        </div>
        <div className="hero__visual">
          <div className="hero__visual-icon">
            <IconMicroscope width={96} height={96} />
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;

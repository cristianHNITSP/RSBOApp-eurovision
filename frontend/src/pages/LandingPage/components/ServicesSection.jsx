import { IconEdit, IconCheck, IconUsers, IconTruck } from '../../../components/icons/Icons.jsx';
import './ServicesSection.css';

const services = [
  { icon: <IconEdit width={32} height={32} />, title: 'Tallado Digital Avanzado', desc: 'Tallado digital avanzado con tecnología de última generación.' },
  { icon: <IconCheck width={32} height={32} />, title: 'Control de Calidad Riguroso', desc: 'Control de calidad de excelencia y precisión rigurosos.' },
  { icon: <IconUsers width={32} height={32} />, title: 'Asesoría Técnica Especializada', desc: 'Asesoría técnica especializada para profesionales.' },
  { icon: <IconTruck width={32} height={32} />, title: 'Distribución Rápida y Segura', desc: 'Distribución rápida con envíos ágiles y seguros.' },
];

const ServicesSection = () => (
  <section id="servicios" className="services">
    <div className="container">
      <h2 className="services__title">Nuestros Servicios</h2>
      <div className="services__grid">
        {services.map((s, i) => (
          <div key={i} className="service-item">
            <div className="service-item__icon">{s.icon}</div>
            <h3 className="service-item__title">{s.title}</h3>
            <p className="service-item__desc">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ServicesSection;

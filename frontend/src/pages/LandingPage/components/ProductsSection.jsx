import { IconGlasses, IconPackage, IconStar } from '../../../components/icons/Icons.jsx';
import './ProductsSection.css';

const products = [
  {
    icon: <IconGlasses width={64} height={64} />,
    title: 'Bases y Micas',
    features: ['Índice 1.50/1.60/1.67', 'Material: CR-38, Policarbonato', 'Disponibilidad: Inmediata'],
    color: 'purple',
  },
  {
    icon: <IconPackage width={64} height={64} />,
    title: 'Lentes Terminadas',
    features: ['Diseño: Monofocal, Progresivo', 'Tratamientos: Antirreflejante, Blue Light', 'Índice 1.50 - 1.74'],
    color: 'pink',
  },
  {
    icon: <IconStar width={64} height={64} />,
    title: 'Especialidades Ópticas',
    features: ['Fotocromáticos', 'Polarizados', 'Lentes de Alto Índice'],
    color: 'purple',
  },
];

const ProductsSection = () => (
  <section id="productos" className="products">
    <div className="container">
      <div className="products__header">
        <h2 className="products__title">Productos Destacados</h2>
        <p className="products__subtitle">Descubre la excelencia en tecnología para el cuidado de la visión.</p>
      </div>
      <div className="products__grid">
        {products.map((p, i) => (
          <div key={i} className={`product-card product-card--${p.color}`}>
            <div className="product-card__image">{p.icon}</div>
            <h3 className="product-card__title">{p.title}</h3>
            <ul className="product-card__list">
              {p.features.map((f, j) => <li key={j}>{f}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ProductsSection;

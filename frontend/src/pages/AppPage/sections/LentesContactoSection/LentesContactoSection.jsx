import QuickActionCard from '../../../../components/reusable/QuickActionCard/QuickActionCard.jsx';
import { getIcon, IconSettings } from '../../../../components/icons/Icons.jsx';
import useSectionLoading from '../../../../composables/useSectionLoading.js';
import LentesContactoSectionSkeleton from './LentesContactoSectionSkeleton.jsx';
import './LentesContactoSection.css';

const LentesContactoSection = () => {
  const { loading } = useSectionLoading('inventario/lentes-contacto');

  if (loading) return <LentesContactoSectionSkeleton />;

  return (
    <div className="inv-lentes-section">
      <div className="inv-lentes-content">
        <div className="inv-lentes-content__eyebrow">
          {getIcon('microscope', { width: 16, height: 16 })} INVENTARIO
        </div>
        <h2 className="inv-lentes-content__title">Lentes de Contacto</h2>
        <p className="inv-lentes-content__desc">
          Control de inventario de lentes de contacto, parámetros y reposición de stock.
        </p>

        <div className="inv-lentes-cards">
          <QuickActionCard icon="box"     title="Catálogo"    description="Referencias y parámetros de lentes" />
          <QuickActionCard icon="refresh" title="Movimientos" description="Entradas, salidas y ajustes" />
          <QuickActionCard icon="users"   title="Proveedores" description="Gestión de proveedores" />
        </div>

        <div className="inv-lentes-demo">
          <div className="inv-lentes-demo__icon">
            <IconSettings width={40} height={40} />
          </div>
          <h3 className="inv-lentes-demo__title">Mantenimiento</h3>
          <p className="inv-lentes-demo__text">
            Módulo de mantenimiento de lentes de contacto — en construcción.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LentesContactoSection;

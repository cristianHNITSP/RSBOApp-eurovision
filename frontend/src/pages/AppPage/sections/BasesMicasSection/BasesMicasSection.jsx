import QuickActionCard from '../../../../components/reusable/QuickActionCard/QuickActionCard.jsx';
import { getIcon, IconSettings } from '../../../../components/icons/Icons.jsx';
import useSectionLoading from '../../../../composables/useSectionLoading.js';
import BasesMicasSectionSkeleton from './BasesMicasSectionSkeleton.jsx';
import './BasesMicasSection.css';

const BasesMicasSection = () => {
  const { loading } = useSectionLoading('inventario/bases-micas');

  if (loading) return <BasesMicasSectionSkeleton />;

  return (
    <div className="inv-bases-section">
      <div className="inv-bases-content">
        <div className="inv-bases-content__eyebrow">
          {getIcon('shield', { width: 16, height: 16 })} INVENTARIO
        </div>
        <h2 className="inv-bases-content__title">Bases y Micas</h2>
        <p className="inv-bases-content__desc">
          Administra el stock de bases oftálmicas y micas para lentes graduados.
        </p>

        <div className="inv-bases-cards">
          <QuickActionCard icon="box"     title="Catálogo"    description="Referencias de bases y micas" />
          <QuickActionCard icon="refresh" title="Movimientos" description="Entradas, salidas y ajustes" />
          <QuickActionCard icon="users"   title="Proveedores" description="Gestión de proveedores" />
        </div>

        <div className="inv-bases-demo">
          <div className="inv-bases-demo__icon">
            <IconSettings width={40} height={40} />
          </div>
          <h3 className="inv-bases-demo__title">Mantenimiento</h3>
          <p className="inv-bases-demo__text">
            Módulo de mantenimiento de bases y micas — en construcción.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BasesMicasSection;

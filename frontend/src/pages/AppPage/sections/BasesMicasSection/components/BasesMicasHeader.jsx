import QuickActionCard from '../../../../../components/reusable/QuickActionCard/QuickActionCard.jsx';
import { getIcon } from '../../../../../components/icons/Icons.jsx';

const BasesMicasHeader = () => {
  return (
    <>
      <div className="inv-bases-content__eyebrow">
        {getIcon('shield', { width: 16, height: 16 })} INVENTARIO
      </div>
      <h2 className="inv-bases-content__title">Bases y Micas</h2>
      <p className="inv-bases-content__desc">
        Administra el stock de bases oftálmicas y micas para lentes graduados.
      </p>

      <div className="inv-bases-cards">
        <QuickActionCard icon="box"     title="Catálogo"     description="Referencias de bases y micas" />
        <QuickActionCard icon="refresh" title="Movimientos"  description="Entradas, salidas y ajustes" />
        <QuickActionCard icon="users"   title="Proveedores"  description="Gestión de proveedores" />
      </div>
    </>
  );
};

export default BasesMicasHeader;
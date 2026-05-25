import { getIcon } from '../../../../../components/icons/Icons.jsx';
import Tooltip from '../../../../../components/ui/Tooltip/Tooltip.jsx';
import ContextMenu from '../../../../../components/ui/ContextMenu/ContextMenu.jsx';
import { TEMPLATE_TABS } from '../config/data.js';
import {
  renderActiveTemplateItem,
  renderDeletedTemplateItem,
  getTemplateSearchText,
  templateMenuHeight,
} from '../utils/basesMicasUtils.jsx';

const BasesMicasTabs = ({
  isCreating,
  handleToggleCreate,
  isTemplateMenuOpen,
  setIsTemplateMenuOpen,
  activeTemplates,
  handleSendToTrash,
  isDeletedMenuOpen,
  setIsDeletedMenuOpen,
  deletedTemplates,
  handleRestoreTemplate,
  handleDeleteTemplateForever,
}) => {
  return (
    <div className="inv-bases-tabs">
      <Tooltip label={isCreating ? 'Cancelar creación' : 'Crear plantilla'} portal>
        <button
          className={['inv-bases-tab', isCreating ? 'inv-bases-tab--active' : ''].join(' ').trim()}
          aria-label={isCreating ? 'Cancelar creación' : 'Crear plantilla'}
          onClick={handleToggleCreate}
        >
          {isCreating
            ? getIcon('close', { width: 15, height: 15 })
            : getIcon('plus',  { width: 15, height: 15 })
          }
          {isCreating ? 'Cancelar' : 'Crear plantilla'}
        </button>
      </Tooltip>

      <ContextMenu
        trigger={
          <Tooltip label="Abrir plantilla" portal>
            <button className="inv-bases-tab" aria-label="Abrir plantilla">
              {getIcon('clipboard', { width: 15, height: 15 })}
              Abrir plantilla
            </button>
          </Tooltip>
        }
        isOpen={isTemplateMenuOpen}
        onToggle={setIsTemplateMenuOpen}
        placement="bottom-right"
        title="Catálogo de Plantillas"
        tabs={TEMPLATE_TABS}
        data={activeTemplates}
        renderItem={(item, ctx) => renderActiveTemplateItem(item, {
          ...ctx,
          onSendToTrash: handleSendToTrash,
        })}
        getItemSearchText={getTemplateSearchText}
        width="300"
        maxHeight={templateMenuHeight}
        initialSize={6}
        pageSize={4}
        searchPlaceholder="Buscar por nombre o SKU..."
      />

      <ContextMenu
        trigger={
          <Tooltip label="Plantillas eliminadas" portal>
            <button className="inv-bases-tab" aria-label="Plantillas eliminadas">
              {getIcon('trash', { width: 15, height: 15 })}
              Plantillas eliminadas
            </button>
          </Tooltip>
        }
        isOpen={isDeletedMenuOpen}
        onToggle={setIsDeletedMenuOpen}
        placement="bottom-right"
        title="Plantillas Eliminadas"
        data={deletedTemplates}
        renderItem={(item, ctx) => renderDeletedTemplateItem(item, {
          ...ctx,
          onRestore: handleRestoreTemplate,
          onDeleteForever: handleDeleteTemplateForever,
        })}
        getItemSearchText={getTemplateSearchText}
        width="300"
        maxHeight={templateMenuHeight}
        initialSize={6}
        pageSize={4}
        searchPlaceholder="Buscar por nombre o SKU..."
      />
    </div>
  );
};

export default BasesMicasTabs;
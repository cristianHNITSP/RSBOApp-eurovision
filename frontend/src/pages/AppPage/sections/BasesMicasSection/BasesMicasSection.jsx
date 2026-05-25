import { useRef, useMemo } from 'react';
import useBreakpoint from '../../../../composables/useBreakpoint.js';
import BasesMicasHeader from './components/BasesMicasHeader.jsx';
import BasesMicasTabs from './components/BasesMicasTabs.jsx';
import BasesMicasGridArea from './components/BasesMicasGridArea.jsx';

import { getToolbarGroups } from './config/basesMicasGrid.js';
import { useBasesMicas } from './hooks/useBasesMicas.js';

import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

import './BasesMicasSection.css';
import './BasesMicasGrid.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const BasesMicasSection = () => {
  const gridRef = useRef(null);

  const { state, actions } = useBasesMicas();
  const {
    rowData, isTemplateMenuOpen, isDeletedMenuOpen, isCreating,
    templateValues, gridApi, selectionCount,
    activeTemplates, deletedTemplates,
    canUndo, canRedo,
  } = state;
  const {
    setIsTemplateMenuOpen, setIsDeletedMenuOpen,
    handleToggleCreate, handleFormChange, handleGridReady, handleSelectionChanged,
    handleSendToTrash, handleRestoreTemplate, handleDeleteTemplateForever,
  } = actions;

  const { isTablet, isDesktop, isMobileLandscape } = useBreakpoint();
  const gridHeight = isDesktop ? 470 : isTablet ? 370 : isMobileLandscape ? 250 : 310;

  const toolbarGroups = useMemo(() => getToolbarGroups({
    isCreating,
    gridApi,
    selectionCount,
    canUndo,
    canRedo,
    actions
  }), [isCreating, gridApi, selectionCount, canUndo, canRedo, actions]);

  const navLeading = isCreating
    ? <span className="nav__count nav__count--muted">Nueva plantilla</span>
    : (selectionCount > 0
        ? <span className="nav__count">{selectionCount} {selectionCount === 1 ? 'seleccionada' : 'seleccionadas'}</span>
        : <span className="nav__count nav__count--muted">Sin selección</span>);

  return (
    <div className="inv-bases-section">
      <div className="inv-bases-content">
        <BasesMicasHeader />

        <div className="inv-bases-demo-wrapper">
          <BasesMicasTabs
            isCreating={isCreating}
            handleToggleCreate={handleToggleCreate}
            isTemplateMenuOpen={isTemplateMenuOpen}
            setIsTemplateMenuOpen={setIsTemplateMenuOpen}
            activeTemplates={activeTemplates}
            handleSendToTrash={handleSendToTrash}
            isDeletedMenuOpen={isDeletedMenuOpen}
            setIsDeletedMenuOpen={setIsDeletedMenuOpen}
            deletedTemplates={deletedTemplates}
            handleRestoreTemplate={handleRestoreTemplate}
            handleDeleteTemplateForever={handleDeleteTemplateForever}
          />

          <BasesMicasGridArea
            isCreating={isCreating}
            gridHeight={gridHeight}
            gridRef={gridRef}
            rowData={rowData}
            templateValues={templateValues}
            handleFormChange={handleFormChange}
            handleGridReady={handleGridReady}
            handleSelectionChanged={handleSelectionChanged}
            toolbarGroups={toolbarGroups}
            navLeading={navLeading}
          />
        </div>
      </div>
    </div>
  );
};

export default BasesMicasSection;

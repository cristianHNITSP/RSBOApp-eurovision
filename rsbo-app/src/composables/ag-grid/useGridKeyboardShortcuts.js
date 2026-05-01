/**
 * rsbo-app/src/composables/ag-grid/useGridKeyboardShortcuts.js
 * Sistema de atajos de teclado para las grillas de inventario.
 */

import { onMounted, onActivated, onDeactivated, onBeforeUnmount } from 'vue';
import { labToast } from '@/composables/shared/useLabToast';

export function useGridKeyboardShortcuts({
  onSave,
  onUndo,
  onRedo,
  gridApi,
  dirty,
  canUndo,
  canRedo,
  isActive
}) {
  const isInputTarget = (target) => {
    if (!target) return false;
    const tag = target.tagName?.toLowerCase();
    const isEditable = target.isContentEditable;
    return tag === 'input' || tag === 'textarea' || tag === 'select' || isEditable;
  };

  const isGridEditing = () => {
    if (!gridApi?.value) return false;
    return gridApi.value.getEditingCells().length > 0;
  };

  const handleKeydown = async (event) => {
    if (!isActive()) return;

    const target = event.target;
    const ctrlOrCmd = event.ctrlKey || event.metaKey;
    const key = event.key?.toLowerCase();

    // Si es un input externo (modales, buscador, etc), no hacemos nada a menos que sea un atajo global que queramos bloquear.
    // AG-Grid pone los inputs de edición dentro de la grilla. isGridEditing lo captura.
    // Si isInputTarget es true pero NO estamos en edición de grilla, significa que estamos en un input fuera de la grilla.
    if (isInputTarget(target) && !isGridEditing()) {
        // Excepción: Ctrl+S en un input normal igual queremos guardarlo si es posible,
        // o al menos prevenir que se abra el "Guardar como" del navegador.
        if (ctrlOrCmd && key === 's') {
             event.preventDefault();
             if (dirty.value) {
                 onSave();
             } else {
                 labToast.info('No hay cambios pendientes.');
             }
        }
        return;
    }

    if (ctrlOrCmd) {
      if (key === 's') {
        event.preventDefault(); // Evitar guardar página
        if (dirty.value) {
          onSave();
        } else {
          labToast.info('No hay cambios pendientes.');
        }
      } else if (key === 'z') {
        if (!event.shiftKey) {
            // Undo
            if (isGridEditing()) {
                // Dejamos pasar para que el navegador haga el undo nativo del texto
                return;
            }
            event.preventDefault();
            if (canUndo.value) {
                onUndo();
            }
        } else {
             // Redo (Ctrl+Shift+Z)
            if (isGridEditing()) {
                return;
            }
            event.preventDefault();
            if (canRedo.value) {
                onRedo();
            }
        }
      } else if (key === 'y') {
        // Redo
        if (isGridEditing()) {
            return;
        }
        event.preventDefault();
        if (canRedo.value) {
            onRedo();
        }
      } else if (key === 'c') {
         // Copy
         if (isGridEditing()) return;
         
         const focusedCell = gridApi?.value?.getFocusedCell();
         if (focusedCell) {
             const val = gridApi.value.getValue(focusedCell.column, focusedCell.rowIndex);
             if (val !== undefined && val !== null) {
                navigator.clipboard.writeText(String(val)).catch(err => console.error("Error copiando al portapapeles:", err));
             }
         }
      } else if (key === 'x') {
         // Cut (Para el inventario puede que no queramos cortar y dejar vacio, pero si queremos copiar y borrar, necesitamos un applyTransaction o modificar el rowNode. Dado que es edición manual de cantidades, el corte simple requiere lógica de edit. Implementemos copy y borrado).
         if (isGridEditing()) return;

         const focusedCell = gridApi?.value?.getFocusedCell();
         if (focusedCell) {
             const rowNode = gridApi.value.getDisplayedRowAtIndex(focusedCell.rowIndex);
             const colId = focusedCell.column.getColId();
             const val = gridApi.value.getValue(focusedCell.column, focusedCell.rowIndex);
             
             if (val !== undefined && val !== null) {
                navigator.clipboard.writeText(String(val)).catch(err => console.error("Error copiando al portapapeles:", err));
                
                // Intentar limpiar la celda
                if (rowNode && colId) {
                   // Para setear un valor en Infinite Row Model sin re-hacer todo el set, podemos intentar setDataValue
                   rowNode.setDataValue(colId, null);
                }
             }
         }
      } else if (key === 'v') {
         // Paste
         if (isGridEditing()) return;
         
         const focusedCell = gridApi?.value?.getFocusedCell();
         if (focusedCell) {
             const rowNode = gridApi.value.getDisplayedRowAtIndex(focusedCell.rowIndex);
             const colId = focusedCell.column.getColId();
             
             if (rowNode && colId) {
                 navigator.clipboard.readText().then(text => {
                     if (text !== undefined && text !== null) {
                         const numValue = Number(text);
                         const finalValue = !isNaN(numValue) ? numValue : text;
                         rowNode.setDataValue(colId, finalValue);
                     }
                 }).catch(err => {
                     console.warn("No se pudo leer el portapapeles. Puede requerir permisos.", err);
                 });
             }
         }
      }
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown, { capture: false });
  });

  onActivated(() => {
    window.addEventListener('keydown', handleKeydown, { capture: false });
  });

  onDeactivated(() => {
    window.removeEventListener('keydown', handleKeydown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
}

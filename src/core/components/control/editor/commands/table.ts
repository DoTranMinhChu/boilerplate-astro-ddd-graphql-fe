// src/core/components/control/editor/commands/table.ts
import type { EditorCore, EditorModule } from '../types';
import { closestAncestor, closestBlock, getCurrentRange } from '../core/Selection';

const CELL_STYLE = 'border:1px solid #ccc;padding:4px 8px;';
const SELECTED_CLASS = 'ed-cell-selected';

export function closestCell(core: EditorCore, node: Node): HTMLTableCellElement | null {
  return closestAncestor(core.root, node, (el) => el.tagName === 'TD' || el.tagName === 'TH') as HTMLTableCellElement | null;
}

export function closestTable(core: EditorCore, node: Node): HTMLTableElement | null {
  return closestAncestor(core.root, node, (el) => el.tagName === 'TABLE') as HTMLTableElement | null;
}

export function getSelectedCells(root: HTMLElement): HTMLTableCellElement[] {
  return Array.from(root.querySelectorAll(`.${SELECTED_CLASS}`));
}

function newCell(): HTMLTableCellElement {
  const td = document.createElement('td');
  td.setAttribute('style', CELL_STYLE);
  td.appendChild(document.createElement('br'));
  return td;
}

function insertColumn(core: EditorCore, after: boolean): void {
  const range = getCurrentRange(core.root);
  const cell = range && closestCell(core, range.startContainer);
  const table = range && closestTable(core, range.startContainer);
  if (!cell || !table) return;
  const index = Array.from(cell.parentElement!.children).indexOf(cell);
  table.querySelectorAll('tr').forEach((row) => {
    const refCell = row.children[index] as HTMLElement | undefined;
    if (!refCell) return;
    const td = newCell();
    if (after) refCell.after(td); else refCell.before(td);
  });
}

export const tableModule: EditorModule = {
  name: 'table',
  commands: {
    insertTable: {
      exec: (core, rows: number, cols: number) => {
        const range = getCurrentRange(core.root);
        if (!range) return;
        const table = document.createElement('table');
        table.style.borderCollapse = 'collapse';
        const tbody = document.createElement('tbody');
        for (let r = 0; r < rows; r++) {
          const tr = document.createElement('tr');
          for (let c = 0; c < cols; c++) tr.appendChild(newCell());
          tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        const block = closestBlock(range.startContainer, core.root);
        if (block && (block.tagName === 'TD' || block.tagName === 'TH')) {
          // A table cell is itself a BLOCK_TAG, so `.after()` would make the nested table a
          // stray child of the <tr> and the parser would foster-parent it out of the outer
          // table on the next round-trip. Nesting inside the cell is valid and stable.
          block.appendChild(table);
        } else if (block) {
          block.after(table);
        } else {
          core.root.appendChild(table);
        }
      },
    },
    insertRowAfter: {
      exec: (core) => {
        const range = getCurrentRange(core.root);
        const cell = range && closestCell(core, range.startContainer);
        const row = cell?.closest('tr');
        if (!row) return;
        const newRow = row.cloneNode(true) as HTMLTableRowElement;
        newRow.querySelectorAll('td,th').forEach((td) => { td.innerHTML = ''; td.appendChild(document.createElement('br')); });
        row.after(newRow);
      },
    },
    insertRowBefore: {
      exec: (core) => {
        const range = getCurrentRange(core.root);
        const cell = range && closestCell(core, range.startContainer);
        const row = cell?.closest('tr');
        if (!row) return;
        const newRow = row.cloneNode(true) as HTMLTableRowElement;
        newRow.querySelectorAll('td,th').forEach((td) => { td.innerHTML = ''; td.appendChild(document.createElement('br')); });
        row.before(newRow);
      },
    },
    deleteRow: {
      exec: (core) => {
        const range = getCurrentRange(core.root);
        const cell = range && closestCell(core, range.startContainer);
        const row = cell?.closest('tr');
        const table = range && closestTable(core, range.startContainer);
        if (!row || !table) return;
        if (table.querySelectorAll('tr').length <= 1) { table.remove(); return; }
        row.remove();
      },
    },
    insertColumnAfter: { exec: (core) => insertColumn(core, true) },
    insertColumnBefore: { exec: (core) => insertColumn(core, false) },
    deleteColumn: {
      exec: (core) => {
        const range = getCurrentRange(core.root);
        const cell = range && closestCell(core, range.startContainer);
        const table = range && closestTable(core, range.startContainer);
        if (!cell || !table) return;
        const index = Array.from(cell.parentElement!.children).indexOf(cell);
        const rows = Array.from(table.querySelectorAll('tr'));
        if (rows[0]?.children.length <= 1) { table.remove(); return; }
        rows.forEach((row) => row.children[index]?.remove());
      },
    },
    mergeCells: {
      exec: (_core, cells: HTMLTableCellElement[]) => {
        if (cells.length < 2) return;
        const rowGroups = new Map<Element, HTMLTableCellElement[]>();
        cells.forEach((cell) => {
          const row = cell.closest('tr');
          if (!row) return;
          const group = rowGroups.get(row) ?? [];
          group.push(cell);
          rowGroups.set(row, group);
        });
        const counts = Array.from(rowGroups.values()).map((g) => g.length);
        const isRectangular = counts.length > 0 && counts.every((c) => c === counts[0]);
        if (!isRectangular) return;
        const [first, ...rest] = cells;
        const rowCount = rowGroups.size;
        first.colSpan = Math.max(1, cells.length / rowCount);
        first.rowSpan = rowCount;
        rest.forEach((cell) => {
          first.innerHTML += cell.innerHTML;
          cell.remove();
        });
      },
    },
    splitCell: {
      exec: (core) => {
        const range = getCurrentRange(core.root);
        const cell = range && closestCell(core, range.startContainer);
        if (!cell || (cell.colSpan <= 1 && cell.rowSpan <= 1)) return;
        const row = cell.closest('tr');
        const table = closestTable(core, cell);
        if (!row || !table) return;
        const rows = Array.from(table.querySelectorAll('tr'));
        const rowIndex = rows.indexOf(row);
        const cellIndexInRow = Array.from(row.children).indexOf(cell);
        const colSpan = cell.colSpan;
        const rowSpan = cell.rowSpan;
        cell.removeAttribute('colspan');
        cell.removeAttribute('rowspan');
        for (let i = 0; i < colSpan - 1; i++) cell.after(newCell());
        for (let r = 1; r < rowSpan; r++) {
          const targetRow = rows[rowIndex + r];
          if (!targetRow) continue;
          const refCell = targetRow.children[cellIndexInRow] as HTMLElement | undefined;
          for (let c = 0; c < colSpan; c++) {
            const nc = newCell();
            if (refCell) refCell.before(nc); else targetRow.appendChild(nc);
          }
        }
      },
    },
    setTableStyle: {
      exec: (core, style: Partial<CSSStyleDeclaration>) => {
        const range = getCurrentRange(core.root);
        const table = range && closestTable(core, range.startContainer);
        if (!table) return;
        Object.assign(table.style, style);
      },
    },
    setCellStyle: {
      exec: (core, style: Partial<CSSStyleDeclaration>) => {
        const cells = getSelectedCells(core.root);
        const range = getCurrentRange(core.root);
        const targets = cells.length ? cells : [range && closestCell(core, range.startContainer)].filter(Boolean) as HTMLTableCellElement[];
        targets.forEach((cell) => Object.assign(cell.style, style));
      },
    },
  },
  setup: (core) => {
    let selecting = false;
    let anchorCell: HTMLTableCellElement | null = null;

    const clearSelection = () => {
      core.root.querySelectorAll(`.${SELECTED_CLASS}`).forEach((el) => el.classList.remove(SELECTED_CLASS));
    };

    const selectRange = (a: HTMLTableCellElement, b: HTMLTableCellElement) => {
      const table = a.closest('table');
      if (!table || table !== b.closest('table')) return;
      const rows = Array.from(table.querySelectorAll('tr'));
      const cellsOf = (row: Element) => Array.from(row.children) as HTMLTableCellElement[];
      const rowIndex = (cell: HTMLTableCellElement) => rows.findIndex((r) => cellsOf(r).includes(cell));
      const colIndex = (cell: HTMLTableCellElement) => cellsOf(cell.parentElement!).indexOf(cell);
      const r1 = Math.min(rowIndex(a), rowIndex(b));
      const r2 = Math.max(rowIndex(a), rowIndex(b));
      const c1 = Math.min(colIndex(a), colIndex(b));
      const c2 = Math.max(colIndex(a), colIndex(b));
      clearSelection();
      for (let r = r1; r <= r2; r++) {
        const cells = cellsOf(rows[r]);
        for (let c = c1; c <= c2; c++) cells[c]?.classList.add(SELECTED_CLASS);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      const cell = (e.target as HTMLElement).closest('td,th') as HTMLTableCellElement | null;
      if (!cell) { clearSelection(); return; }
      selecting = true;
      anchorCell = cell;
      clearSelection();
    };
    const onMouseOver = (e: MouseEvent) => {
      if (!selecting || !anchorCell) return;
      const cell = (e.target as HTMLElement).closest('td,th') as HTMLTableCellElement | null;
      if (cell) selectRange(anchorCell, cell);
    };
    const onMouseUp = () => { selecting = false; };

    core.root.addEventListener('mousedown', onMouseDown);
    core.root.addEventListener('mouseover', onMouseOver);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      core.root.removeEventListener('mousedown', onMouseDown);
      core.root.removeEventListener('mouseover', onMouseOver);
      window.removeEventListener('mouseup', onMouseUp);
    };
  },
};

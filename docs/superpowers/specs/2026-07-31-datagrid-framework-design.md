# DataGrid Framework — Design Spec

**Date:** 2026-07-31
**Goal:** A standalone datagrid framework in pure JavaScript (no ES-module system — loaded via `<script>` tags, exposed as a `window.DataGrid` global) and pure CSS, whose visual design and feature set follow the *AG Grid Design System (Community)* Figma file (Quartz theme).

> **Note on Figma access:** The Figma file could not be inspected directly in this session (WebGL canvas, login-walled viewer, Figma connector unauthenticated). The design below is grounded in the AG Grid Community design system the file documents — the Quartz theme's published design tokens, component anatomy, and the Community-edition feature list.

## 1. Deliverables

| File | Purpose |
|------|---------|
| `dist/datagrid.js` | The framework. One IIFE, no imports/exports, attaches `DataGrid` to `window`/`globalThis`. |
| `dist/datagrid.css` | The theme. CSS custom-property design tokens (Quartz-style), light + dark. |
| `index.html` | **Template** page — a full realistic grid application (toolbar, quick filter, pagination, status bar). |
| `examples/features.html` | **Features** page — one small grid per feature (sorting, filtering, selection, editing, pinning, grouping-lite, CSV export…). |
| `examples/components.html` | **Components** page — static gallery of the visual pieces (header cell states, row states, cells, checkboxes, tags, pagination bar, overlays, inputs) for design reference. |
| `test/run-tests.js` | Node test runner for the headless data logic. |

## 2. Architecture

Single global namespace, classic script loading:

```html
<link rel="stylesheet" href="dist/datagrid.css">
<script src="dist/datagrid.js"></script>
<script>
  var grid = new DataGrid(document.getElementById('myGrid'), {
    columnDefs: [...],
    rowData: [...],
  });
</script>
```

Internally the IIFE is organized in plain objects/functions (ES6 *syntax* is fine — classes, arrow functions, const/let — only the ES-module *system* is avoided):

- **DataModel** — owns `rowData`; computes the view pipeline `rows → filter → quickFilter → sort → paginate`. Pure functions, individually testable in Node (no DOM).
- **ColumnModel** — column defs, widths, order, pinning, visibility.
- **SelectionModel** — single/multiple row selection, checkbox + header select-all (tri-state).
- **EditModel** — one active cell editor at a time; commit/cancel semantics.
- **Renderer** — DOM construction: header, virtualized body viewport, pinned sections, pagination bar, overlays. Renders only visible row range (windowed virtualization, buffer rows above/below).
- **Events** — `grid.on(name, cb)`: `rowClicked`, `cellClicked`, `selectionChanged`, `sortChanged`, `filterChanged`, `cellValueChanged`, `paginationChanged`, `rowDoubleClicked`.
- **Api** — public methods: `setRowData`, `getRowData`, `setQuickFilter`, `getSelectedRows`, `selectAll/deselectAll`, `setColumnVisible`, `applyColumnFilter`, `clearFilters`, `exportCsv`, `setPage/paginationGoTo`, `refresh`, `destroy`, `updateRow`, `addRow`, `removeSelectedRows`.

DOM structure (mirrors AG Grid anatomy):

```
.dg-root
  .dg-header        (.dg-header-row > .dg-header-cell*)
  .dg-body          (scroll viewport)
    .dg-canvas      (height = rowCount × rowHeight; virtualized .dg-row > .dg-cell*)
  .dg-overlay       (loading / no-rows)
  .dg-paging-panel  (page size select, range label, first/prev/pages/next/last)
```

Header and body horizontal scroll are synchronized; body vertical scroll drives the virtual window.

## 3. Features (AG Grid Community parity, scoped)

- **Sorting** — click header cycles asc → desc → none; multi-sort with Shift+click; sort arrows + order index badges.
- **Filtering** — per-column filter via header menu popup: text (contains/equals/starts with), number (=, ≠, <, >, range), set-style checkbox list for `filter:'set'` columns. Filtered columns show a filter icon.
- **Quick filter** — global search across all visible columns.
- **Row selection** — `rowSelection: 'single' | 'multiple'`; checkbox column (`checkboxSelection`), header tri-state select-all, click/Ctrl-click/Shift-click range selection.
- **Pagination** — optional; page size selector (10/20/50/100), first/prev/numbered/next/last, "1 to 20 of 5,000" label. Without pagination: full virtual scroll.
- **Column resize** — drag the header edge; double-click edge = auto-size to content sample. Min width respected.
- **Column reorder** — drag header cell; drop indicator line.
- **Column pinning** — `pinned: 'left' | 'right'` via column def.
- **Cell editing** — `editable: true`; double-click or Enter starts edit; text/number/select editors; Esc cancels, Enter/blur commits; fires `cellValueChanged`.
- **Rendering** — `valueFormatter`, `cellRenderer` (returns string/HTML/Node), `cellClass`, built-in renderers: tag/badge (`dgTagRenderer`), checkmark. Values are HTML-escaped by default.
- **Keyboard** — arrow-key cell focus navigation, Enter to edit, Space to toggle selection.
- **CSV export** — visible (filtered+sorted) data.
- **Overlays** — loading spinner overlay, "No rows to show" empty state.
- **Row states** — hover, selected, odd/even (optional zebra), focused cell outline.

Out of scope (Enterprise or YAGNI for v1): full row grouping/pivot, tree data, master-detail, range selection, column tool panel sidebar, infinite server-side model.

## 4. Visual design (Quartz theme tokens)

All styling flows from CSS custom properties on `.dg-root`, so consumers re-theme without touching the JS:

```css
--dg-font-family: system stack ("Inter", -apple-system, "Segoe UI", …);
--dg-font-size: 14px;
--dg-background-color: #fff;
--dg-foreground-color: #181d1f;          /* AG Quartz text */
--dg-secondary-foreground-color: color-mix(... 50%);
--dg-border-color: #dde2eb;               /* row + outer borders */
--dg-header-background-color: #f8f8f8;
--dg-accent-color: #2196f3;               /* focus, selection, links */
--dg-row-hover-color: rgba(33,150,243,.08);
--dg-selected-row-background-color: rgba(33,150,243,.12);
--dg-row-height: 42px;  --dg-header-height: 48px;
--dg-cell-horizontal-padding: 16px;
--dg-border-radius: 8px (wrapper), 4px (inputs/buttons);
--dg-checkbox-checked-color: var(--dg-accent-color);
```

Dark mode: `.dg-theme-dark` overrides tokens (bg `#181d1f`, text `#fff`, borders `rgba(255,255,255,.16)`), matching Quartz Dark.

Component states per the design system: header cell (default / hover / sorted / filtered / menu-open), row (default / hover / selected / selected-hover), cell (default / focused / edited), checkbox (unchecked / checked / indeterminate / disabled), pagination buttons (default / hover / active / disabled).

## 5. Error handling

- Missing/invalid container element → throw `Error` with a clear message at construction.
- Unknown `field` in a column def → renders empty cells, warns once via `console.warn`.
- `cellRenderer` exceptions are caught per-cell; the cell falls back to the raw formatted value.
- Editing a non-numeric value into a number column reverts on commit.
- All public API methods are no-ops with a warning after `destroy()`.

## 6. Testing

- **Node unit tests** (`test/run-tests.js`, zero dependencies, loaded via `require` of the same non-module file using a `globalThis` shim): sort comparators (string/number/date, multi-sort), filter predicates for every operator, quick filter, pagination math, selection model (range, tri-state), CSV escaping.
- **Browser verification**: serve the repo, load demo pages, assert DOM via scripted checks (row counts after filter/sort, selection classes, pagination label), plus console-error sweep.

## 7. Success criteria

1. `new DataGrid(el, options)` renders a Quartz-look grid from plain script tags — no build step, no modules, no dependencies.
2. 100k rows scroll smoothly (virtualized DOM stays under ~60 row nodes).
3. All Node tests pass; demo pages load with zero console errors.
4. Theming demonstrably swappable via CSS variables (dark mode toggle on the template page).

/* toolbar-lit.ts */
import { LitElement, html, css, nothing, adoptStyles } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../ui/button'
import '../ui/input'
import './faceted-filter'
import { stylesheet } from '../pod';

/**
 * Props expected from the parent:
 * - `table`: an instance of @tanstack/table-core (works the same in plain JS)
 * - optional placeholders / search key / filter definitions
 */
@customElement('data-table-toolbar')
export class DataTableToolbar<T> extends LitElement {
  /** TanStack Table instance (generic) */
  @property({ attribute: false }) table!: import('@tanstack/table-core').Table<T>;

  /** Placeholder for the search input */
  @property({ type: String }) searchPlaceholder = 'Filter...';

  /** Column id used for the “single‑column” search */
  @property({ type: String }) searchKey?: string;

  /** Faceted filter definitions (same shape as the React version) */
  @property({ attribute: false }) filters: {
    columnId: string;
    title: string;
    options: {
      label: string;
      value: string;
      icon?: any; // Lit component class (optional)
    }[];
  }[] = [];

  static styles = css`
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .left {
      display: flex;
      flex: 1;
      flex-direction: column-reverse;
      align-items: start;
      gap: 0.5rem;
    }
    @media (min-width: 640px) {
      .left {
        flex-direction: row;
        align-items: center;
        gap: 0.5rem;
      }
    }
    .input {
      height: 2rem;
      width: 150px;
    }
    .lg\\:input {
      width: 250px;
    }
    .reset-btn {
      height: 2rem;
      padding-inline: 0.75rem;
    }
  `;

  connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet, DataTableToolbar.styles]);
  }

  /** Compute whether any filter is active */
  @state()
  private get isFiltered(): boolean {
    const colFilters = this.table.getState().columnFilters;
    const global = this.table.getState().globalFilter;
    return colFilters.length > 0 || Boolean(global);
  }

  /** Helper to retrieve the current filter value for the search column */
  private _getSearchValue(): string {
    if (this.searchKey) {
      const col = this.table.getColumn(this.searchKey);
      return (col?.getFilterValue() as string) ?? '';
    }
    return (this.table.getState().globalFilter as string) ?? '';
  }

  /** Update the filter value when the input changes */
  private _onSearchChange(e: CustomEvent) {
    // const value = (e.detail.target as HTMLInputElement).value;
    if (this.searchKey) {
      console.log("_onSearchChange", this.searchKey, e, e.detail)
      // this.table.getColumn(this.searchKey!)?.setFilterValue(value);
    } else {
      console.log("_onSearchChange", e, e.detail)
      // this.table.setGlobalFilter(value);
    }
  }

  /** Reset all filters */
  private _resetFilters() {
    this.table.resetColumnFilters();
    this.table.setGlobalFilter('');
  }

  render() {
    return html`
      <div class="toolbar">
        <!-- LEFT SIDE -->
        <div class="left">
          <ui-input
            class="h-8 w-[150px] lg:w-[250px]"
            placeholder=${this.searchPlaceholder}
            .value=${this._getSearchValue()}
            @input=${this._onSearchChange}
          />

          <div class="flex gap-2">
            ${this.filters.map(
              (filter) => {
                const column = this.table.getColumn(filter.columnId);
                if (!column) return nothing;
                return html`
                  <data-table-faceted-filter
                    .column=${column}
                    .title=${filter.title}
                    .options=${filter.options}
                  ></data-table-faceted-filter>
                `;
              },
            )}
          </div>

          ${this.isFiltered
            ? html`
                <ui-button
                  variant="ghost"
                  class="reset-btn"
                  @click=${this._resetFilters}
                >
                  Reset
                  <cross-2-icon class="ms-2 h-4 w-4"></cross-2-icon>
                </ui-button>
              `
            : nothing}
        </div>

        <!-- RIGHT SIDE -->
        <data-table-view-options .table=${this.table}></data-table-view-options>
      </div>
    `;
  }
}

/* ------------------------------------------------------------------ */
/* Note:
 * - `ui-button`, `ui-input`, `cross-2-icon`, `data-table-faceted-filter`
 *   and `data-table-view-options` must exist as Lit components (or be wrapped
 *   around the original React ones). Their APIs mirror the React props used
 *   in the original code.
 * - The generic `<T>` is kept for typing purposes only; at runtime it does
 *   not affect the component.
 * - CSS mirrors the Tailwind classes used in the React version, but you can
 *   switch to Tailwind‑lite or any other styling system you prefer.
 */
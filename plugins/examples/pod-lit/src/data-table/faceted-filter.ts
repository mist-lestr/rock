// src/components/faceted-filter.ts
import { LitElement, html, css, nothing, adoptStyles } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import '../ui/badge';                        // <ui-badge>
import '../ui/popover';                      // <ui-popover>, <ui-popover-trigger>, <ui-popover-content>
import '../ui/command';                      // <ui-command>, <ui-command-input>, …
import '../ui/separator';                    // <ui-separator>
import { stylesheet } from '../pod';

/**
 * Props attendus (similaires à la version React)
 * - `column`: l’objet TanStack Table correspondant à la colonne filtrée
 * - `title`: libellé du filtre
 * - `options`: tableau d’options `{label, value, icon?}`
 */
@customElement('data-table-faceted-filter')
export class DataTableFacetedFilter<TData, TValue> extends LitElement {
  /** TanStack column (passed as a plain object) */
  @property({ attribute: false }) column?: import('@tanstack/table-core').Column<TData, TValue>;

  /** Titre affiché dans le bouton du pop‑over */
  @property({ type: String }) title = '';

  /** Options du filtre */
  @property({ attribute: false }) options: {
    label: string;
    value: string;
    icon?: any; // Lit component class (optional)
  }[] = [];

  /** Set of currently selected values (derived from column filter) */
  @state() private selected = new Set<string>();

  /** Search term entered in the command input */
  @state() private search = '';

  static styles = css`
    :host { display: inline-block; }
    .badge-group { display: flex; gap: 0.25rem; flex-wrap: wrap; }
    .badge { border-radius: 0.125rem; padding: 0 0.25rem; font-size: 0.75rem; }
    .count-badge { background: var(--badge-bg, #e5e7eb); color: var(--badge-fg, #111); }
    .selected-indicator {
      display: flex; align-items: center; justify-content: center;
      width: 1rem; height: 1rem; border: 1px solid var(--primary);
      border-radius: 0.25rem;
    }
    .selected-indicator.selected {
      background: var(--primary); color: var(--primary-foreground);
    }
  `;

  /** Refresh the internal set whenever the column filter changes */
  connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet, DataTableFacetedFilter.styles]);
    this._syncFromColumn();
  }

  /** Sync selected values from the column’s filter value */
  private _syncFromColumn() {
    const fv = this.column?.getFilterValue() as string[] | undefined;
    this.selected = new Set(fv ?? []);
  }

  /** Toggle a value in the set and push the new filter back to the column */
  private _toggle(value: string) {
    if (this.selected.has(value)) this.selected.delete(value);
    else this.selected.add(value);

    const arr = Array.from(this.selected);
    this.column?.setFilterValue(arr.length ? arr : undefined);
    this.requestUpdate();
  }

  /** Clear all filters */
  private _clear() {
    this.selected.clear();
    this.column?.setFilterValue(undefined);
    this.requestUpdate();
  }

  /** Filter options according to the search box */
  private get _filteredOptions() {
    const term = this.search.toLowerCase();
    return this.options.filter(o => o.label.toLowerCase().includes(term));
  }

  render() {
    // ----- BUTTON (trigger) -------------------------------------------------
    const selectedCount = this.selected.size;
    const showBadges = selectedCount > 0;

    return html`
      <ui-popover>
        <ui-popover-trigger slot="trigger">
          <ui-button variant="outline" size="sm" class="h-8 border-dashed">
            <plus-circled-icon class="size-4"></plus-circled-icon>
            ${this.title}
            ${showBadges ? html`
              <ui-separator orientation="vertical" class="mx-2 h-4"></ui-separator>
              <ui-badge variant="secondary" class="rounded-sm px-1 font-normal lg:hidden">
                ${selectedCount}
              </ui-badge>
              <div class="hidden lg:flex space-x-1">
                ${selectedCount > 2 ? html`
                  <ui-badge variant="secondary" class="rounded-sm px-1 font-normal">
                    ${selectedCount} selected
                  </ui-badge>
                ` : this.options
                    .filter(o => this.selected.has(o.value))
                    .map(o => html`
                      <ui-badge variant="secondary" class="rounded-sm px-1 font-normal">
                        ${o.label}
                      </ui-badge>
                    `)}
              </div>
            ` : nothing}
          </ui-button>
        </ui-popover-trigger>

        <ui-popover-content class="w-[200px] p-0" align="start">
          <ui-command>
            <ui-command-input
              placeholder=${this.title}
              .value=${this.search}
              @input=${(e: InputEvent) => this.search = (e.target as HTMLInputElement).value}>
            </ui-command-input>

            <ui-command-list>
              <ui-command-empty>No results found.</ui-command-empty>

              <ui-command-group>
                ${this._filteredOptions.map(opt => {
                  const isSel = this.selected.has(opt.value);
                  const facetCount = this.column?.getFacetedUniqueValues()?.get(opt.value);
                  return html`
                    <ui-command-item @click=${() => this._toggle(opt.value)}>
                      <div class="selected-indicator ${isSel ? 'selected' : ''}">
                        <check-icon class="h-4 w-4"></check-icon>
                      </div>
                      ${opt.icon ? unsafeHTML(`<${opt.icon.name} class="size-4 text-muted-foreground"></${opt.icon.name}>`) : nothing}
                      <span>${opt.label}</span>
                      ${facetCount !== undefined ? html`
                        <span class="ms-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                          ${facetCount}
                        </span>
                      ` : nothing}
                    </ui-command-item>
                  `;
                })}
              </ui-command-group>

              ${selectedCount > 0 ? html`
                <ui-command-separator></ui-command-separator>
                <ui-command-group>
                  <ui-command-item @click=${this._clear} class="justify-center text-center">
                    Clear filters
                  </ui-command-item>
                </ui-command-group>
              ` : nothing}
            </ui-command-list>
          </ui-command>
        </ui-popover-content>
      </ui-popover>
    `;
  }
}
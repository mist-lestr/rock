// ui-input.ts
import { cn } from 'lestr-plugin';
import { stylesheet } from '../pod';
import { LitElement, html, adoptStyles } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('ui-input')
export class UIInput extends LitElement {
  /** HTML input type (text, password, …) */
  @property({ type: String }) type = 'text';

  @property({ type: String }) placeholder = '';

  /** Additional CSS classes supplied by the consumer */
  @property({ type: String }) class = '';

  render() {
    const classes = cn(
        'flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        this.class
    );

    return html`
      <input
        type=${this.type}
        placeholder=${this.placeholder}
        data-slot="input"
        class=${classes}
        @input=${(e: InputEvent) => this.dispatchEvent(new CustomEvent('input', {bubbles: false, composed: true, detail: e}))}
        ...${this._spreadAttributes()}
      />
    `;
  }

  connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet]);
  }

  /** Spread any extra attributes passed to the custom element onto the native <input>. */
  private _spreadAttributes() {
    const attrs: Record<string, string> = {};
    for (const attr of this.attributes) {
      if (attr.name === 'type' || attr.name === 'class') continue;
      attrs[attr.name] = attr.value;
    }
    return attrs;
  }
}
// src/components/ui-button.ts
import { stylesheet } from '../pod';
import { LitElement, html, css, adoptStyles } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Utility that builds the Tailwind‑like class string.
 * It reproduces the `cva` configuration from the React version.
 */
function buttonClasses(opts: {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  class?: string;
}) {
  const v = opts.variant ?? 'default';
  const s = opts.size ?? 'default';
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive";

  const variantCls = variants[v];
  const sizeCls = sizes[s];
  return `${base} ${variantCls} ${sizeCls} ${opts.class ?? ''}`.trim();
}

/* Variant definitions – copied from the React `cva` config */
const variants = {
  default:
    'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
  destructive:
    'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
  outline:
    'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
  secondary:
    'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
  link: 'text-primary underline-offset-4 hover:underline',
};

/* Size definitions – copied from the React `cva` config */
const sizes = {
  default: 'h-9 px-4 py-2 has-[>svg]:px-3',
  sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
  lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
  icon: 'size-9',
};

@customElement('ui-button')
export class UIButton extends LitElement {
  /** Variant name – matches keys of `variants` */
  @property({ type: String }) variant: keyof typeof variants = 'default';

  /** Size name – matches keys of `sizes` */
  @property({ type: String }) size: keyof typeof sizes = 'default';

  /** Additional CSS classes supplied by the consumer */
  @property({ type: String }) class = '';

  /** Disabled flag */
  @property({ type: Boolean, reflect: true }) disabled = false;

  static styles = css`
    :host {
      display: inline-block;
    }
    button {
      all: unset;
      cursor: pointer;
    }
    button:disabled {
      cursor: not-allowed;
    }
  `;

  connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet, UIButton.styles]);
  }

  render() {
    const cls = buttonClasses({
      variant: this.variant,
      size: this.size,
      class: this.class,
    });

    return html`
      <button
        part="button"
        class=${cls}
        ?disabled=${this.disabled}
        @click=${(_e: Event) => {
          // re‑emit a native click event so consumers can listen on <ui-button>
          this.dispatchEvent(new Event('click', { bubbles: true, composed: true }));
        }}
      >
        <slot></slot>
      </button>
    `;
  }
}

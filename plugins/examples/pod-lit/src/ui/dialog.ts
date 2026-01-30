// ui-dialog.ts
import { stylesheet } from '../pod';
import { LitElement, html, css, adoptStyles } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/* --------------------------------------------------------------
   Dialog – wrapper (root) – just a container that holds the slots.
   -------------------------------------------------------------- */
@customElement('ui-dialog')
export class UIDialog extends LitElement {
  connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet]);
  }

  render() {
    return html`<slot></slot>`;   // children will be DialogTrigger / DialogContent
  }
}

/* --------------------------- Trigger --------------------------- */
@customElement('ui-dialog-trigger')
export class UIDialogTrigger extends LitElement {
  connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet]);
  }

  render() {
    return html`<slot></slot>`;
  }
}

/* --------------------------- Portal --------------------------- */
@customElement('ui-dialog-portal')
export class UIDialogPortal extends LitElement {
  connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet]);
  }

  render() {
    return html`<slot></slot>`;
  }
}

/* --------------------------- Overlay -------------------------- */
@customElement('ui-dialog-overlay')
export class UIDialogOverlay extends LitElement {
  static styles = css`
    :host {
      position: fixed;
      inset: 0;
      z-index: 50;
      background: rgba(0,0,0,.5);
      animation: fade-in .2s forwards;
    }
    @keyframes fade-in { from { opacity:0 } to { opacity:1 } }
    @keyframes fade-out { from { opacity:1 } to { opacity:0 } }
    :host([data-state='closed']) { animation: fade-out .2s forwards; }
  `;

  connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet, UIDialogOverlay.styles]);
  }

  render() {
    return html``;   // empty – the host element itself is the overlay
  }
}

/* --------------------------- Close button ---------------------- */
@customElement('ui-dialog-close')
export class UIDialogClose extends LitElement {
  @property({ type: Boolean }) show = true;

  static styles = css`
    button {
      position: absolute;
      inset-inline-end: 1rem;
      inset-block-start: 1rem;
      border-radius: .25rem;
      opacity: .7;
      transition: opacity .15s;
    }
    button:hover { opacity:1; }
    button:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }
  `;

  connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet, UIDialogClose.styles]);
  }

  render() {
    return html`
      <button @click=${this._close} part="close">
        <x-icon></x-icon>
        <span class="sr-only">Close</span>
      </button>
    `;
  }

  private _close() {
    const dialog = this.closest('ui-dialog-content');
    if (dialog) (dialog as any).close();
  }
}

/* --------------------------- Content -------------------------- */
@customElement('ui-dialog-content')
export class UIDialogContent extends LitElement {
  @property({ type: Boolean, attribute: 'show-close-button' })
  showCloseButton = true;

  @property({ type: String }) class = '';

  // @query('slot') private _slot!: HTMLSlotElement;

  static styles = css`
    :host {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      z-index: 51;
      max-width: calc(100% - 2rem);
      width: 100%;
      max-height: 90vh;
      overflow: auto;
      background: var(--background);
      border-radius: .5rem;
      padding: 1.5rem;
      box-shadow: 0 10px 25px rgba(0,0,0,.2);
      animation: zoom-in .2s forwards;
    }
    @keyframes zoom-in { from { opacity:0; transform:translate(-50%,-48%) scale(.95) } to { opacity:1; transform:translate(-50%,-50%) scale(1) } }
    @keyframes zoom-out { from { opacity:1; transform:translate(-50%,-50%) scale(1) } to { opacity:0; transform:translate(-50%,-48%) scale(.95) } }
    :host([data-state='closed']) { animation: zoom-out .2s forwards; }
  `;

  connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet, UIDialogContent.styles]);
  }

  render() {
    const classes = 'fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 ' + this.class;

    return html`
      <ui-dialog-portal>
        <ui-dialog-overlay></ui-dialog-overlay>
        <div class=${classes} data-slot="dialog-content">
          <slot></slot>
          ${this.showCloseButton
            ? html`<ui-dialog-close></ui-dialog-close>`
            : null}
        </div>
      </ui-dialog-portal>
    `;
  }

  /** Public API used by the close button */
  close() {
    this.setAttribute('data-state', 'closed');
    setTimeout(() => this.remove(), 200);   // wait for animation
  }
}

/* --------------------------- Header --------------------------- */
@customElement('ui-dialog-header')
export class UIDialogHeader extends LitElement {
  @property({ type: String }) class = '';

  connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet]);
  }

  render() {
    const classes = 'flex flex-col gap-2 text-center sm:text-start ' + this.class;
    return html`<div class=${classes} data-slot="dialog-header"><slot></slot></div>`;
  }
}

/* --------------------------- Footer --------------------------- */
@customElement('ui-dialog-footer')
export class UIDialogFooter extends LitElement {
  @property({ type: String }) class = '';

  connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet]);
  }

  render() {
    const classes = 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end ' + this.class;
    return html`<div class=${classes} data-slot="dialog-footer"><slot></slot></div>`;
  }
}

/* --------------------------- Title ---------------------------- */
@customElement('ui-dialog-title')
export class UIDialogTitle extends LitElement {
  @property({ type: String }) class = '';

  connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet]);
  }

  render() {
    const classes = 'text-lg leading-none font-semibold ' + this.class;
    return html`<h2 class=${classes} data-slot="dialog-title"><slot></slot></h2>`;
  }
}

/* --------------------------- Description ---------------------- */
@customElement('ui-dialog-description')
export class UIDialogDescription extends LitElement {
  @property({ type: String }) class = '';

  connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet]);
  }

  render() {
    const classes = 'text-sm text-muted-foreground ' + this.class;
    return html`<p class=${classes} data-slot="dialog-description"><slot></slot></p>`;
  }
}
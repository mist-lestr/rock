// ui-command.ts
import { LitElement, html, css, adoptStyles } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './dialog';   // for CommandDialog (modal)
import { stylesheet } from '../pod';

@customElement('ui-command')
export class UICommand extends LitElement {
  @property({ type: String }) class = '';

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      overflow: hidden;
      border-radius: var(--radius);
      background: var(--popover);
      color: var(--popover-foreground);
    }
  `;

  connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet, UICommand.styles]);
  }

  render() {
    return html`<slot class=${this.class}></slot>`;
  }
}

/* ---------- CommandDialog (modal wrapper) ---------- */
@customElement('ui-command-dialog')
export class UICommandDialog extends LitElement {
  @property({ type: String }) title = 'Command Palette';
  @property({ type: String }) description = 'Search for a command to run…';
  @property({ type: Boolean }) showCloseButton = true;

  connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet]);
  }

  render() {
    return html`
      <ui-dialog>
        <ui-dialog-header class="sr-only">
          <ui-dialog-title>${this.title}</ui-dialog-title>
          <ui-dialog-description>${this.description}</ui-dialog-description>
        </ui-dialog-header>
        <ui-dialog-content class="overflow-hidden p-0" ?show-close-button=${this.showCloseButton}>
          <ui-command class="**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
            <slot></slot>
          </ui-command>
        </ui-dialog-content>
      </ui-dialog>
    `;
  }
}

/* ---------- Sub‑components (input, list, item, …) ---------- */
@customElement('ui-command-input')
export class UICommandInput extends LitElement {
  @property({ type: String }) class = '';

  connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet]);
  }


  render() {
    return html`
      <div data-slot="command-input-wrapper" class="flex h-9 items-center gap-2 border-b px-3">
        <search-icon class="size-4 shrink-0 opacity-50"></search-icon>
        <input
          data-slot="command-input"
          class=${'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 ' + this.class}
          @input=${(e: InputEvent) => this.dispatchEvent(new CustomEvent('input', {detail: (e.target as HTMLInputElement).value}))}
        />
      </div>
    `;
  }
}

/* list, empty, group, separator, item, shortcut follow the same pattern:
   just forward slots and apply the Tailwind‑like classes via `cn`. */
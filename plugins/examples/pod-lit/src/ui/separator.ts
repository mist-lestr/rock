// ui-separator.ts
import { stylesheet } from '../pod';
import { LitElement, html, css, adoptStyles } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('ui-separator')
export class UISeparator extends LitElement {
  @property({ type: String }) orientation: 'horizontal' | 'vertical' = 'horizontal';
  @property({ type: Boolean }) decorative = true;
  @property({ type: String }) class = '';

  static styles = css`
    :host {
      display: block;
      flex-shrink: 0;
      background: var(--border);
    }
    :host([orientation='horizontal']) {
      height: 1px;
      width: 100%;
    }
    :host([orientation='vertical']) {
      width: 1px;
      height: 100%;
    }
  `;

  connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet, UISeparator.styles]);
  }


  render() {
    const classes = 'shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px ' + this.class;
    return html`<div class=${classes} role=${this.decorative ? 'separator' : 'none'}></div>`;
  }
}
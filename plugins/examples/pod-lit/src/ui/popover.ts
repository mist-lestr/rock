// ui-popover.ts
import { stylesheet } from '../pod';
import { LitElement, html, css, adoptStyles } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('ui-popover')
export class UIPopover extends LitElement {
  render() {
    return html`<slot></slot>`; // root element, will contain trigger & content
  }
}

@customElement('ui-popover-trigger')
export class UIPopoverTrigger extends LitElement {
  connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet]);
  }

  render() {
    return html`<slot></slot>`;
  }
}

@customElement('ui-popover-content')
export class UIPopoverContent extends LitElement {
  @property({ type: String }) class = '';
  @property({ type: String }) align = 'center';
  @property({ type: Number }) sideOffset = 4;

  static styles = css`
    :host {
      position: absolute;
      z-index: 50;
    }
  `;

  connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet, UIPopoverContent.styles]);
  }
  
  
  render() {
    return html`
      <div
        data-slot="popover-content"
        class=${'w-72 origin-(--radix-popover-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 ' + this.class}
        style="transform-origin:${this.align};margin:${this.sideOffset}px"
      >
        <slot></slot>
      </div>
    `;
  }
}

@customElement('ui-popover-anchor')
export class UIPopoverAnchor extends LitElement {
  connectedCallback() {
    super.connectedCallback();

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet]);
  }

  render() {
    return html`<slot></slot>`;
  }
}
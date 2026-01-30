import { Pods } from './features/pods'
import r2wc from "@r2wc/react-to-web-component"
import { useRegistry } from "lestr-plugin"
import rawCss from './index.css?inline';

const LestrPluginPods = r2wc(Pods)

class StyledLestrPluginPods extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    // 1️⃣ style tag
    const styleEl = document.createElement('style');
    styleEl.textContent = rawCss;
    shadow.appendChild(styleEl);
    // 2️⃣ instancie le composant r2wc à l'intérieur du shadow root
    const wcInstance = new LestrPluginPods();
    shadow.appendChild(wcInstance);
  }
}
customElements.define('lestr-plugin-pods-unstyled', LestrPluginPods);
customElements.define("lestr-plugin-pods", StyledLestrPluginPods)

console.log("Register plugin")

const registry = useRegistry()

registry?.registerSidebarEntry({
  name: "test",
  label: "This is a test",
  url: "/pods"
})

registry?.registerRoute({
  path: '/pods',
  tagName: 'lestr-plugin-pods'
})


// @customElement('pod')
// export class Pod extends LitElement {

//   private _reactRoot?: ReturnType<typeof createRoot>

//   connectedCallback() {
//     super.connectedCallback()
//     // Attendre que l'élément soit connecté au DOM
//     this.attachReactComponent()
//   }

//   disconnectedCallback() {
//     // Nettoyer le rendu React
//     if (this._reactRoot) {
//       this._reactRoot.unmount()
//     }
//     super.disconnectedCallback()
//   }

//   private attachReactComponent() {
//     const container = this.shadowRoot?.getElementById('react-root')
//     if (container) {
//       this._reactRoot = createRoot(container)
//       this._reactRoot.render(
//         React.createElement(ReactPod, { })
//       )
//     }
//   }

//   render() {
//     return html`
//       <div id="react-root"></div>
//     `
//   }
// }
import { batch, Store } from "@tanstack/react-store";
import { useQuery } from '@tanstack/react-query'
import { apiClient } from "@/lib/api";
import { PluginAPIRegistry } from "./api";

export type Plugin = {
  name: string,
  source: | {component: { tagName: string }}
          | {inline: { code: string }},
  loading: boolean,
  loaded: boolean,
}

export const pluginsStore: Store<{[name: string]: Plugin}> = new Store({});

export const loadPlugins = async () => {

  try {
    const plugins = await apiClient.getPlugins()

    batch(() => {
      plugins.forEach(plugin => {
        pluginsStore.setState((state) => {
          return {
            ...state,
            [plugin.name]: plugin,
          }
        })
        pluginStore.loadPlugin(plugin)
      })
    })

  } catch (err) {
    console.log(err instanceof Error ? err.message : 'Error loading plugins')
  } finally {
  }
}


class PluginStore {
  private pluginPromiseCache: Map<string, Promise<string>> = new Map()

  constructor() {
    (window as any).pluginAPI = new PluginAPIRegistry()
  }

  async load(plugin: Plugin): Promise<string> {
    if ('inline' in plugin!.source && typeof plugin!.source.inline?.code === 'string') {
      await loadInline(plugin!.source.inline.code, plugin!.name)
      return plugin!.name
    } else if ('component' in plugin!.source && typeof plugin!.source.component?.tagName === 'string') {
      loadComponent(plugin!.source.component.tagName)
      return plugin!.source.component.tagName
    }

    return 'unkown'
  }

  // Charger un plugin avec memoïsation
  async loadPlugin(plugin: Plugin): Promise<string> {
    // Vérifier si une promesse existe déjà
    const existingPromise = this.pluginPromiseCache.get(plugin.name)
    if (existingPromise) {
      return existingPromise
    }

    // Créer et mettre en cache la promesse
    const pluginPromise = this.load(plugin)
    this.pluginPromiseCache.set(plugin.name, pluginPromise)

    return pluginPromise
  }
}

export const pluginStore = new PluginStore()


export function usePlugin(plugin: Plugin) {
  return useQuery({
    queryKey: ['plugin', plugin],
    queryFn: () => pluginStore.loadPlugin(plugin),
    staleTime: Infinity, // Pas de rechargement automatique
  })
}

// async function loadFromUrl(url: string, container: HTMLElement): Promise<void> {
//   const script = document.createElement('script')
//   script.src = url
//   script.type = 'module'
  
//   return new Promise((resolve, reject) => {
//     script.onload = () => {
//       // Le script devrait définir un custom element
//       // On attend un peu pour que le custom element soit enregistré
//       setTimeout(() => {
//         const element = document.createElement('rock-plugin')
//         container.appendChild(element)
//         resolve()
//       }, 100)
//     }
//     script.onerror = () => reject(new Error(`Failed to load plugin from URL: ${url}`))
//     document.head.appendChild(script)
//   })
// }

function loadComponent(tagName: string): void {
  // Le web component est déjà défini dans le shell, on le crée directement
  if (!customElements.get(tagName)) {
    throw new Error(`Web Component "${tagName}" is not defined. Make sure it is registered in the shell.`)
  }
}

// async function loadFromPath(path: string, container: HTMLElement): Promise<void> {
//   try {
//     // Charger depuis le chemin relatif du projet
//     const module = await import(`./plugins/${path}`)
//     if (module.default) {
//       if (module.default.tagName) {
//         // Si c'est un Web Component avec tagName
//         // Le module devrait enregistrer le custom element
//         // On crée l'élément et l'ajoutons au conteneur
//         const element = document.createElement(module.default.tagName)
//         container.appendChild(element)
//       } else {
//         throw new Error(`Plugin at path ${path} does not export a valid Web Component with tagName`)
//       }
//     } else {
//       throw new Error(`Plugin at path ${path} does not export a default component`)
//     }
//   } catch (err) {
//     throw new Error(`Failed to load plugin from path ${path}: ${err}`)
//   }
// }

/**
 * Decode a Base64‑encoded UTF‑8 string into a Uint8Array.
 *
 * @param base64 - The Base64 representation of the JavaScript source.
 * @returns Uint8Array containing the original UTF‑8 bytes.
 */
function base64ToUint8Array(base64: string): BufferSource {
  // atob gives a binary string (each char = one byte)
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; ++i) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function loadInline(
  code: string,
  name: string,
): Promise<void> {
  try {

    // Convert the Base64 payload to a Uint8Array preserving UTF‑8 bytes
    const uint8 = base64ToUint8Array(code);

    // Créer un script blob pour exécuter le code inline
    const blob = new Blob([uint8], { type: 'application/javascript; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const script = document.createElement('script')
    script.src = url
    script.type = 'module'

    console.log("load inline plugin")
    
    return new Promise((resolve, reject) => {
      script.onload = () => {
        URL.revokeObjectURL(url)

        resolve()
      }
      script.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error(`Failed to execute inline plugin: ${name}`))
      }
      document.head.appendChild(script)
    })
  } catch (err) {
    throw new Error(`Failed to load inline plugin ${name}: ${err}`)
  }
}

import {
    type PluginAPI,
    PluginAPIClient,
    type Route
} from '../lib/api'

export {
    type PluginAPI,
    PluginAPIClient,
    type Route
}

import {
    KubeObject,
    type KubeObjectInterface
} from '../lib/k8s/KubeObject'
import type { ListResponse } from '../lib/k8s/api/v2/useKubeObjectList'

export {
    KubeObject,
    type KubeObjectInterface,
    type ListResponse
}

export const useRegistry = (): PluginAPI | null => {
    if ((window as any).pluginAPI) {
        return new PluginAPIClient((window as any).pluginAPI)
    } else {
        return null
    }
}

import {
    User
} from '../lib/auth'

export {
    User
}

export * from '../lib/utils'
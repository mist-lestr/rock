import { batch, Store } from "@tanstack/react-store";
import { apiClient } from "@/lib/api";
import { routesStore } from "@/lib/router/Route";
import { PluginLoader } from "../components/app/plugins/plugin-loader";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { pluginsStore } from "../plugins"

export interface Service {
  name: string

  group: string
  version: string
  kind: string

  domain: string
  service: string

  pluginRef: {
    name: string
  } | null
}

export const servicesStore: Store<{[name: string]: Service}> = new Store({});

const queryClient = new QueryClient()

export const loadServices = async () => {

  try {
    const services = await apiClient.getServices()

    batch(() => {
      services.forEach(service => {
        servicesStore.setState((state) => {
          return {
            ...state,
            [service.name]: service,
          }
        })

        const route = {
          path: `/${service.service}`,
          component: () => {
            const plugin = service.pluginRef ? pluginsStore.state[service.pluginRef!.name] : undefined
            return <QueryClientProvider client={queryClient}><PluginLoader plugin={plugin} /></QueryClientProvider>
          }
        }

        routesStore.setState((state) => {
          return {
            ...state,
            [route.path]: route
          }
        })

      })
    })

  } catch (err) {
    console.log(err instanceof Error ? err.message : 'Error loading services')
  } finally {
  }
}


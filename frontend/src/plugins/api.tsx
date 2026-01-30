import { userManager, userStore } from "@/auth";
import { registerSidebarEntry } from "@/components/app/sidebar/store";
import { routesStore } from "@/lib/router/Route";
import { useStore } from "@tanstack/react-store";
import { User, type PluginAPI, type Route } from "lestr-plugin"
import React from "react";

export class PluginAPIRegistry implements PluginAPI {
  registerRoute(routeSpec: Route): void {
    
    const route = {
      path: routeSpec.path,
      component: () => {
        const component = React.createElement(routeSpec.tagName)

        return component
      }
    }

    routesStore.setState((state) => {
      return {
        ...state,
        [route.path]: route
      }
    })

  }

  registerSidebarEntry(sidebarEntry: { name: string; parent?: string | null; label: string; url?: string; }): void {

    console.log("registerSidebarEntry", sidebarEntry)

    registerSidebarEntry(sidebarEntry)
  }

  async backendFetch(url: string, init: RequestInit = {}): Promise<Response> {

    const user = await userManager.getUser()

    init.headers = new Headers(init.headers);
    init.headers.append("Authorization", "Bearer " + user?.id_token)

    return fetch(url, init);
  }

  getUser(): User | null {
    return useStore(userStore, (state) => state)
  }
}
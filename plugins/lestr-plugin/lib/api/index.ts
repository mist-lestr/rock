import type { User } from "../auth";

export interface Route {
  /** Any valid URL path or array of paths that path-to-regexp@^1.7.0 understands. */
  path: string;
  /** When true, will only match if the path matches the location.pathname exactly. */
  exact?: boolean;
  /** Human readable name. Capitalized and short. */
  name?: string;
  /** Shown component for this route. */
  tagName: string;
}

export interface PluginAPI {
  registerRoute(routeSpec: Route): void

  registerSidebarEntry({
    parent,
    name,
    label,
    url,
  }: {
    name: string,
    parent?: string | null,
    label: string,
    url?: string,

  }
  ): void

  backendFetch(url: string, init: RequestInit): Promise<Response>

  getUser(): User | null
}

export class PluginAPIClient implements PluginAPI {
  private api: PluginAPI;

  constructor(apiImplementation: PluginAPI) {
    this.api = apiImplementation;
  }
  registerSidebarEntry(sidebarEntryProps: {
    name: string;
    parent?: string | null;
    label: string;
    url?: string;

  }): void {
    return this.api.registerSidebarEntry(sidebarEntryProps);
  }

  registerRoute(routeSpec: Route) {
    return this.api.registerRoute(routeSpec);
  }

  async backendFetch(url: string, init: RequestInit = {}) {
    return this.api.backendFetch(url, init)
  }

  getUser(): User | null {
    return this.api.getUser();
  }
}
import type { ExoticComponent, ReactNode } from 'react';
import { Store } from "@tanstack/react-store";

export interface Route {
  /** Any valid URL path or array of paths that path-to-regexp@^1.7.0 understands. */
  path: string;
  /** When true, will only match if the path matches the location.pathname exactly. */
  exact?: boolean;
  /** Human readable name. Capitalized and short. */
  name?: string;
  /** Shown component for this route. */
  component: ExoticComponent<{}> | (() => ReactNode);
}

export const routesStore: Store<{[path: string]: Route}> = new Store({});

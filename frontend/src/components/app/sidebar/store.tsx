import { Store } from "@tanstack/react-store";

export interface SidebarEntry {
  /**
   * Name of this SidebarItem.
   */
  name: string;
  /**
   * Label to display.
   */
  label: string;
  /**
   * Name of the parent SidebarEntry.
   */
  parent?: string | null;
  /**
   * URL to go to when this item is followed.
   */
  url?: string;
}

export interface SidebarState {
  /**
   * The currently selected item in the sidebar.
   */
  selected: {
    item?: string;
  };
  /**
   * Is the sidebar open?
   */
  isSidebarOpen?: boolean;
  /**
   * Was there user interaction to set the sidebar open?
   */
  isSidebarOpenUserSelected?: boolean;
  /**
   * The entries in the sidebar.
   */
  entries: { [propName: string]: SidebarEntry };
}

export const sidebarStore: Store<SidebarState> = new Store({selected: {}, entries: {}})

export const registerSidebarEntry = (sidebarEntry: SidebarEntry) => {
  sidebarStore.setState((state) => {
    state.entries = {
      ...state.entries,
      [sidebarEntry.name]:sidebarEntry
    }
    return {
      ...state,
    };
  });
};
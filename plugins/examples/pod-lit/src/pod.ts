import { LitElement, adoptStyles, css, html, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { getCoreRowModel, flexRender, createColumnHelper, TableController, getSortedRowModel, type SortingState, getFilteredRowModel } from '@tanstack/lit-table'

import style from "./index.css?inline";

// import '@shcnwc/shadcn-table-web-component'

import { KubeObject, useRegistry, type KubeObjectInterface, type ListResponse } from "lestr-plugin"
import { repeat } from 'lit/directives/repeat.js';

import './data-table/toolbar'

export const stylesheet = unsafeCSS(style);

interface KubePodSpec {
  containers: KubeContainer[];
  nodeName: string;
  nodeSelector?: {
    [key: string]: string;
  };
  initContainers?: KubeContainer[];
  ephemeralContainers?: KubeContainer[];
  readinessGates?: {
    conditionType: string;
  }[];
  volumes?: KubeVolume[];
  serviceAccountName?: string;
  serviceAccount?: string;
  priority?: string;
  tolerations?: any[];
  restartPolicy?: string;
}

interface KubeVolume {
  name: string;
  [volumeName: string]: any;
}

interface KubeContainer {
  args?: string[];
  command?: string[];
  env?: {
    name: string;
    value?: string;
    valueFrom?: {
      configMapKeyRef?: {
        key: string;
        name: string;
        optional?: boolean;
      };
      fieldRef?: {
        apiVersion: string;
        fieldPath: string;
      };
      resourceFieldRef?: {
        containerName?: string;
        divisor?: string;
        resource: string;
      };
      secretKeyRef?: {
        key: string;
        name: string;
        optional?: boolean;
      };
    };
  }[];
  envFrom?: {
    secretRef?: {
      name: string;
      optional?: boolean;
    };
    configMapRef?: {
      name: string;
      optional?: boolean;
    };
    prefix?: string;
  }[];

  image: string;
  imagePullPolicy: string;
  livenessProbe?: KubeContainerProbe;
  name: string;
  ports?: {
    /** Number of port to expose on the pod's IP address. This must be a valid port number, 0 < x < 65536. */
    containerPort: number;
    /** What host IP to bind the external port to. */
    hostIP?: string;
    /**
     * Number of port to expose on the host. If specified, this must be a valid port number, 0 < x < 65536.
     * If HostNetwork is specified, this must match ContainerPort. Most containers do not need this.
     */
    hostPort?: number;
    /** If specified, this must be an IANA_SVC_NAME and unique within the pod. Each named port in a pod must have a unique name. Name for the port that can be referred to by services. */
    name?: string;
    /** Protocol for port. Must be UDP, TCP, or SCTP. Defaults to "TCP". */
    protocol?: string;
  }[];
  readinessProbe?: KubeContainerProbe;
  resizePolicy?: {
    resourceName: string;
    restartPolicy?: string;
  }[];
  resources?: {
    claims?: {
      name: string;
    };
    limits?: {
      cpu?: string;
      memory?: string;
    };
    requests?: {
      cpu?: string;
      memory?: string;
    };
  };
  restartPolicy?: string;
  terminationMessagePath?: string;
  terminationMessagePolicy?: string;

  volumeMounts?: {
    name: string;
    readOnly: boolean;
    mountPath: string;
  }[];
  stdin?: boolean;
  stdinOnce?: boolean;
  tty?: boolean;
  volumeDevices?: {
    devicePath: string;
    name: string;
  }[];
  workingDir?: string;
}

interface KubeContainerProbe {
  httpGet?: {
    path?: string;
    port: number;
    scheme: string;
    host?: string;
  };
  exec?: {
    command: string[];
  };
  tcpSocket?: {
    port: number;
  };
  initialDelaySeconds?: number;
  timeoutSeconds?: number;
  periodSeconds?: number;
  successThreshold?: number;
  failureThreshold?: number;
}

interface ContainerState {
  running: {
    startedAt: string;
  };
  terminated: {
    containerID: string;
    exitCode: number;
    finishedAt: string;
    message?: string;
    reason: string;
    signal?: number;
    startedAt: string;
  };
  waiting: {
    message?: string;
    reason: string;
  };
}

interface KubeContainerStatus {
  containerID?: string;
  image: string;
  imageID: string;
  name: string;
  ready: boolean;
  restartCount: number;
  lastState: Partial<ContainerState>;
  state: Partial<ContainerState>;
  started?: boolean;
}

type Time = number | string | null;

interface KubeCondition {
  /** Last time we probed the condition. */
  lastProbeTime: Time;
  lastTransitionTime?: Time;
  lastUpdateTime?: Time;
  message?: string;
  /** Unique, one-word, CamelCase reason for the condition's last transition. */
  reason?: string;
  /** Status of the condition, one of True, False, Unknown. */
  status: string;
  type: string;
}

interface KubePod extends KubeObjectInterface {
  spec: KubePodSpec;
  status: {
    conditions: KubeCondition[];
    containerStatuses: KubeContainerStatus[];
    initContainerStatuses?: KubeContainerStatus[];
    ephemeralContainerStatuses?: KubeContainerStatus[];
    hostIP?: string;
    hostIPs?: { ip: string }[];
    podIPs?: { ip: string }[];
    message?: string;
    phase: string;
    qosClass?: string;
    reason?: string;
    startTime: Time;
    [other: string]: any;
  };
}

class Pods extends KubeObject<KubePod> {
  static kind = 'pods';
  static apiName = 'Pod';
  static apiVersion = 'v1';
  static isNamespaced = true;

  get spec(): KubePod['spec'] {
    return this.jsonData.spec;
  }

  get status(): KubePod['status'] {
    return this.jsonData.status;
  }
}

const columnHelper = createColumnHelper<Pods>()

const columns = [
  columnHelper.accessor((row) => row.metadata.name, {
    id: 'name',
    cell: (info) => info.getValue(),
    header: 'Name',
    meta: {
      thClassNames: 'text-left w-[150px]',
      tdClassNames: 'font-medium'
    }
  }),
  columnHelper.accessor('metadata.namespace', {
    id: 'namespace',
    header: 'Namespace',
    cell: (info) => info.renderValue(),
  }),
  columnHelper.accessor('status.phase', {
    id: 'phase',
    header: 'Phase',
    cell: (info) => info.renderValue(),
  }),
  columnHelper.accessor((row) => _formatAge(row.metadata?.creationTimestamp), {
    id: 'age',
    header: 'Age',
    cell: (info) => info.renderValue(),
    meta: {
      thClassNames: 'text-right',
      tdClassNames: 'text-right'
    }
  }),
]


/**
 * An example element.
 *
 * @slot - This element has a slot
 * @csspart button - The button
 */
@customElement('lestr-plugin-pod')
export class Pod extends LitElement {

  private tableController = new TableController<Pods>(this)

  /**
   * Copy for the read the docs hint.
   */
  @property()
  docsHint = 'Click on the Vite and Lit logos to learn more'

  /**
   * The number of times @the button has been clicked.
   */
  @property({ type: Number })
  count = 0

  @state()
  private pods: ListResponse<Pods> | null | undefined;   // keep the raw objects returned by the API

  @state()
  private _sorting: SortingState = []

  static {
    console.log("Register plugin")

    const registry = useRegistry()

    registry?.registerSidebarEntry({
      name: "test",
      label: "This is a test",
      url: "/pod"
    })

    registry?.registerRoute({
      path: '/pod',
      tagName: 'lestr-plugin-pod'
    })
  }

  connectedCallback() {
    super.connectedCallback()

    if (this.shadowRoot) adoptStyles(this.shadowRoot, [stylesheet]);
    console.log("Plugin Connected Callback")

    // Pods.useList({namespace: 'kube-system'}).then((res) => {
    //   console.log("List pods", res);
    //   this.pods = res;
    //   this.pods?.list.items.map(pod => {
    //     console.log(pod)
    //     console.log(pod.status)
    //   })
    // }).catch((error) => {
    //   console.log("List pods", error)
    // })

    this.loadFakeData()
  }

  disconnectedCallback() {

    super.disconnectedCallback()
  }

  public loadFakeData() {
    const phases = ['Running', 'Pending', 'Succeeded', 'Failed', 'CrashLoopBackOff'];
    const namespaces = ['default', 'kube-system', 'monitoring', 'dev', 'prod'];

    // Helper to generate a random integer in [min, max]
    const randInt = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min;

    const fakePods: Pods[] = Array.from({ length: 20 }, (_, i) => {
      const name = `demo-pod-${i + 1}`;
      const ns = namespaces[randInt(0, namespaces.length - 1)];
      const phase = phases[randInt(0, phases.length - 1)];

      return {
        // Minimal metadata required by the table
        metadata: { name, namespace: ns, uid: `uid-${i + 1}` },

        // The underlying KubeObject expects a `jsonData` field
        jsonData: {
          spec: {} as any,
          status: {
            phase,
            conditions: [],
            containerStatuses: [],
            startTime: new Date(Date.now() - randInt(0, 86400000)).toISOString(), // up to 24 h ago
          },
        },
      } as unknown as Pods; // cast to satisfy the generic type
    });

    // Simulate the shape returned by Pods.useList()
    this.pods = {
      list: { items: fakePods },
    } as any;

    // Reset sorting if you want a clean view
    this._sorting = [];
  }

  render() {

    var pods: Pods[] = []
    if (this.pods) {
      pods = this.pods!.list.items
    }

    const table = this.tableController.table({
      columns,
      data: pods,
      state: {
        sorting: this._sorting,
      },
      onSortingChange: (updaterOrValue) => {
        if (typeof updaterOrValue === 'function') {
          this._sorting = updaterOrValue(this._sorting)
        } else {
          this._sorting = updaterOrValue
        }
      },
      globalFilterFn: (row, _columnId, filterValue) => {
        const namespace = String(row.getValue('namespace')).toLowerCase()
        const name = String(row.getValue('name')).toLowerCase()
        const searchValue = String(filterValue).toLowerCase()

        return namespace.includes(searchValue) || name.includes(searchValue)
      },
      getCoreRowModel: getCoreRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getSortedRowModel: getSortedRowModel(),

    })

    return html`
      <data-table-toolbar
        .table=${table}
        .filters=${[
          {
            columnId: 'phase',
            title: 'Phase',
            options: [
              { label: 'Running', value: 'running' },
              { label: 'Failed',  value: 'failed' },
            ],
          },
        ]}
      ></data-table-toolbar>

      <div data-slot="table-container" class="relative w-full overflow-x-auto">

        <table data-slot="table" class="w-full caption-bottom text-sm">
          <thead data-slot="table-header" class="[&_tr]:border-b">
            ${repeat(
              table.getHeaderGroups(),
              (headerGroup) => headerGroup.id,
              (headerGroup) =>
                html`
                  <tr data-slot="table-row" class="hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors">
                    ${repeat(
                      headerGroup.headers,
                      (header) => header.id,
                      (header) => {
                        const classNames = (header.column.columnDef.meta as any)?.thClassNames ?? '';
                        return html` <th data-slot="table-head" class="text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap ${classNames}">
                              ${header.isPlaceholder
                                ? null
                                : html`<div
                                title=${header.column.getCanSort()
                                  ? header.column.getNextSortingOrder() === 'asc'
                                    ? 'Sort ascending'
                                    : header.column.getNextSortingOrder() === 'desc'
                                      ? 'Sort descending'
                                      : 'Clear sort'
                                  : undefined}
                                @click="${header.column.getToggleSortingHandler()}"
                                style="cursor: ${header.column.getCanSort()
                                  ? 'pointer'
                                  : 'not-allowed'}"
                              >
                                  ${flexRender(
                                    header.column.columnDef.header,
                                    header.getContext(),
                                  )}
                                  ${{ asc: html` ▲`, desc: html` ▼` }[
                                    header.column.getIsSorted() as string
                                  ] ?? null}
                              </div>`}
                            </th>`
                      },
                    )}
                  </tr>`,
            )}
          </thead>
          <tbody data-slot="table-body" class="[&_tr:last-child]:border-0">
            ${repeat(
              table.getRowModel().rows,
              (row) => row.id,
              (row) => html`
                <tr data-slot="table-row" class="hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors">
                  ${repeat(
                    row.getVisibleCells(),
                    (cell) => cell.id,
                    (cell) => {
                      const classNames = (cell.column.columnDef.meta as any)?.tdClassNames ?? '';
                      return html` <td data-slot="table-cell" class="p-2 align-middle whitespace-nowrap ${classNames}">
                        ${flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>`
                    },
                  )}
                </tr>
              `,
            )}
          </tbody>
        </table>

      </div>
    `
  }


  static styles = css`
    :host {
      all: inherit;
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'pod': Pod
  }
}

const _formatAge = (timestamp?: string): string => {
  if (!timestamp) return '‑';
  const created = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

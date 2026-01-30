import { KubeObject, type KubeObjectInterface } from "lestr-plugin";

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

export class Pod extends KubeObject<KubePod> {
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
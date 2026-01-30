import { apiFactoryWithNamespace, apiFactory } from "./api/v1/factories";
import type { QueryParameters } from "./api/v1/queryParameters";
import { useKubeObjectList } from "./api/v2/useKubeObjectList";
import type { ApiError } from "./api/v2/ApiError";
import type { KubeMetadata } from "./KubeMetadata";
import { timeAgo } from "../utils";

export class KubeObject<T extends KubeObjectInterface = any> {
  jsonData: T;

  /** The kind of the object. Corresponding to the resource kind in Kubernetes. */
  static readonly kind: string;

  /** Name of the resource, plural, used in API */
  static readonly apiName: string;

  /** Group and version of the resource formatted as "GROUP/VERSION", e.g. "policy.k8s.io/v1". */
  static readonly apiVersion: string | string[];

  /** Whether the object is namespaced. */
  static readonly isNamespaced: boolean;

  /** Whether the object is scalable, and should have a ScaleButton */
  static readonly isScalable: boolean;

  static _internalApiEndpoint?: ReturnType<typeof apiFactoryWithNamespace | typeof apiFactory>;

  static get apiEndpoint() {
    if (this._internalApiEndpoint) return this._internalApiEndpoint;

    const factory = this.isNamespaced ? apiFactoryWithNamespace : apiFactory;
    const versions = Array.isArray(this.apiVersion) ? this.apiVersion : [this.apiVersion];

    // Create factory arguments per API version, usually just one
    const factoryArgumentsArray = versions.map(apiVersion => {
      const [group, version] = apiVersion.includes('/') ? apiVersion.split('/') : ['', apiVersion];
      const includeScaleApi = this.isScalable;

      return [group, version, this.apiName, includeScaleApi];
    });

    // Extract the first argument list if we only have one version
    // Because for resources with only one API version
    // the factory expects flat arguments instead of an array
    const factoryArguments =
      factoryArgumentsArray.length === 1
        ? factoryArgumentsArray[0]
        : (factoryArgumentsArray as any);

    const endpoint = factory(...factoryArguments);
    this._internalApiEndpoint = endpoint;

    return endpoint;
  }
  static set apiEndpoint(endpoint: ReturnType<typeof apiFactoryWithNamespace | typeof apiFactory>) {
    this._internalApiEndpoint = endpoint;
  }

  constructor(json: T) {
    this.jsonData = json;
  }

  static get className(): string {
    return this.kind;
  }

  get detailsRoute(): string {
    return this._class().detailsRoute;
  }

  static get detailsRoute(): string {
    return this.kind;
  }

  /**
   * Get name of the API group of this resource
   * for example will return batch for CronJob
   *
   * For core group, like Pods, it will return undefined
   *
   * API group reference https://kubernetes.io/docs/reference/using-api/#api-groups
   */
  static get apiGroupName(): string | undefined {
    // Get any of the versions, group will be the same
    const apiVersion = typeof this.apiVersion === 'string' ? this.apiVersion : this.apiVersion[0];

    if (!apiVersion.includes('/')) return;

    return apiVersion.split('/')[0];
  }

  /**
   * Type guard to check if a KubeObject instance belongs to this class.
   * Compares API group name and kind to determine if the instance matches.
   * This works even if class definitions are duplicated and should be used
   * instead of `instanceof`.
   *
   * @param maybeInstance - The KubeObject instance to check.
   * @returns True if the instance is of this class type, with narrowed type.
   */
  static isClassOf<K extends KubeObjectClass>(
    this: K,
    maybeInstance: KubeObject
  ): maybeInstance is InstanceType<K> {
    return (
      maybeInstance._class().apiGroupName === this.apiGroupName && maybeInstance.kind === this.kind
    );
  }

  static get pluralName(): string {
    // This is a naive way to get the plural name of the object by default. It will
    // work in most cases, but for exceptions (like Ingress), we must override this.
    return this.apiName;
  }

  get pluralName(): string {
    // In case we need to override the plural name in instances.
    return this._class().pluralName;
  }

  get listRoute(): string {
    return this._class().listRoute;
  }

  static get listRoute(): string {
    return this.apiName;
  }

  get kind() {
    return this.jsonData.kind;
  }

  // getDetailsLink() {
  //   const params = {
  //     namespace: this.getNamespace(),
  //     name: this.getName(),
  //   };
  //   const link = createRouteURL(this.detailsRoute, params);
  //   return link;
  // }

  // getListLink() {
  //   return createRouteURL(this.listRoute);
  // }

  getName() {
    return this.metadata.name;
  }

  getNamespace() {
    return this.metadata.namespace;
  }

  getCreationTs() {
    return this.metadata.creationTimestamp;
  }

  getAge() {
    return timeAgo(this.getCreationTs());
  }

  getValue(prop: string) {
    return (this.jsonData as Record<string, any>)![prop];
  }

  get metadata() {
    return this.jsonData.metadata;
  }

  get isNamespaced() {
    return this._class().isNamespaced;
  }

  get isScalable() {
    return this._class().isScalable;
  }

  _class() {
    return this.constructor as KubeObjectClass;
  }

    // @todo: apiList has 'any' return type.
  /**
   * Returns the API endpoint for this object.
   *
   * @param onList - Callback function to be called when the list is retrieved.
   * @param onError - Callback function to be called when an error occurs.
   * @param opts - Options to be passed to the API endpoint.
   *
   * @returns The API endpoint for this object.
   */
  static apiList<K extends KubeObject>(
    this: (new (...args: any) => K) & typeof KubeObject<any>,
    onList: (arg: K[]) => void,
    onError?: (err: ApiError) => void,
    opts?: ApiListSingleNamespaceOptions
  ) {
    const createInstance = (item: any): any => this.create(item);

    const args: any[] = [(list: any[]) => onList(list.map((item: any) => createInstance(item)))];

    if (this.apiEndpoint.isNamespaced) {
      args.unshift(opts?.namespace || null);
    }

    args.push(onError);

    const queryParams: QueryParameters = {};
    if (opts?.queryParams?.labelSelector) {
      queryParams['labelSelector'] = opts.queryParams.labelSelector;
    }
    if (opts?.queryParams?.fieldSelector) {
      queryParams['fieldSelector'] = opts.queryParams.fieldSelector;
    }
    if (opts?.queryParams?.limit) {
      queryParams['limit'] = opts.queryParams.limit;
    }
    args.push(queryParams);

    return this.apiEndpoint.list.bind(null, ...args);
  }

  static useList<K extends KubeObject>(
    this: (new (...args: any) => K) & typeof KubeObject<any>,
    {
      namespace,
      refetchInterval,
      ...queryParams
    }: {
      namespace?: string;
      /** How often to refetch the list. Won't refetch by default. Disables watching if set. */
      refetchInterval?: number;
    } & QueryParameters = {}
  ) {
    // Create requests for each cluster and namespace
    const result = useKubeObjectList<K>({
      queryParams: queryParams,
      kubeObjectClass: this,
      namespace,
    });

    return result;
  }

  static create<Args extends any[], T extends KubeObject>(
    this: new (...args: Args) => T,
    ...item: Args
  ) {
    return new this(...item) as T;
  }
}


/**
 * This type refers to the *class* of a KubeObject.
 */
export type KubeObjectClass = typeof KubeObject<any>;

/**
 * This is the base interface for all Kubernetes resources, i.e. it contains fields
 * that all Kubernetes resources have.
 */
export interface KubeObjectInterface {
  /**
   * Kind is a string value representing the REST resource this object represents.
   * Servers may infer this from the endpoint the client submits requests to.
   *
   * In CamelCase.
   *
   * Cannot be updated.
   *
   * @see {@link https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds | more info}
   */
  kind: string;
  apiVersion?: string;
  metadata: KubeMetadata;
  spec?: any;
  status?: any;
  items?: any[];
  actionType?: any;
  lastTimestamp?: string;
  key?: any;
  [otherProps: string]: any;
}

export interface ApiListOptions extends QueryParameters {

  /** The namespace to list objects from. */
  namespace?: string | string[];
}
export interface ApiListSingleNamespaceOptions {
  /** The namespace to get the object from. */
  namespace?: string;
  /** The parameters to be passed to the API endpoint. */
  queryParams?: QueryParameters;
}

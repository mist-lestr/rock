

// @todo: in apiFactory, and multipleApiFactory use rather than 'args'...
//        `group: string, version: string, resource: string`

import type { KubeObjectInterface } from "../../KubeObject";
import type { QueryParameters } from "./queryParameters";
import { getApiRoot } from "./formatUrl";
import { streamResult, streamResultsForCluster, type StreamErrCb, type StreamResultsCb } from "./streamingApi";
import { isDebugVerbose } from "../../../helpers/debugVerbose";

export type CancelFunction = () => void;
export type SingleApiFactoryArguments = [group: string, version: string, resource: string];
export type MultipleApiFactoryArguments = SingleApiFactoryArguments[];
export type ApiFactoryArguments = SingleApiFactoryArguments | MultipleApiFactoryArguments;

export type SimpleApiFactoryWithNamespaceArguments = [
  group: string,
  version: string,
  resource: string,
  includeScale?: boolean
];
export type MultipleApiFactoryWithNamespaceArguments = SimpleApiFactoryWithNamespaceArguments[];
export type ApiFactoryWithNamespaceArguments =
  | SimpleApiFactoryWithNamespaceArguments
  | MultipleApiFactoryWithNamespaceArguments;

export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object | undefined
    ? RecursivePartial<T[P]>
    : T[P];
};

export interface ApiClient<ResourceType extends KubeObjectInterface> {
  list: (
    cb: StreamResultsCb<ResourceType>,
    errCb: StreamErrCb,
    queryParams?: QueryParameters,
  ) => Promise<CancelFunction>;
  get: (
    name: string,
    cb: StreamResultsCb<ResourceType>,
    errCb: StreamErrCb,
    queryParams?: QueryParameters,
    cluster?: string
  ) => Promise<CancelFunction>;

  isNamespaced: boolean;
  apiInfo: {
    group: string;
    version: string;
    resource: string;
  }[];
}

export interface ApiWithNamespaceClient<ResourceType extends KubeObjectInterface> {
  list: (
    namespace: string,
    cb: StreamResultsCb<ResourceType>,
    errCb: StreamErrCb,
    queryParams?: QueryParameters,
  ) => Promise<CancelFunction>;
  get: (
    namespace: string,
    name: string,
    cb: StreamResultsCb<ResourceType>,
    errCb: StreamErrCb,
    queryParams?: QueryParameters,
    cluster?: string
  ) => Promise<CancelFunction>;

  isNamespaced: boolean;
  apiInfo: {
    group: string;
    version: string;
    resource: string;
  }[];
}

/**
 * Returns list of object keys, where the value is a function.
 */
type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

/**
 * Repeats a streaming function call across multiple API endpoints until a
 * successful response is received or all endpoints have been exhausted.
 *
 * This is especially useful for Kubernetes beta APIs that then stabalize.
 * So the APIs are available at different endpoints on different versions of Kubernetes.
 *
 * @param apiEndpoints - An array of API endpoint objects returned by the `apiFactory` function.
 * @param funcName - The name of the streaming function to call on each endpoint.
 * @param errCb - A callback function to handle errors that occur during the streaming function call.
 * @param args - Additional arguments to pass to the streaming function.
 *
 * @returns A function that cancels the streaming function call.
 */
async function repeatStreamFunc<
  ResourceType extends KubeObjectInterface,
  FuncName extends FunctionKeys<ApiClient<ResourceType>>
>(
  apiEndpoints: (ApiClient<ResourceType> | ApiWithNamespaceClient<ResourceType>)[],
  funcName: FuncName,
  errCb: StreamErrCb,
  ...args: any[]
) {
  let isCancelled = false;
  let streamCancel = () => {};

  if (isDebugVerbose('k8s/apiProxy@repeatStreamFunc')) {
    console.debug('k8s/apiProxy@repeatStreamFunc', { apiEndpoints, funcName, args });
  }

  function runStreamFunc(
    endpointIndex: number,
    funcName: FuncName,
    errCb: StreamErrCb,
    ...args: any[]
  ) {
    const endpoint = apiEndpoints[endpointIndex];
    const fullArgs = [...args];
    let errCbIndex = funcName === 'get' ? 2 : 1;
    if (endpoint.isNamespaced) {
      ++errCbIndex;
    }
    fullArgs.splice(errCbIndex, 0, errCb);

    const func: any = endpoint[funcName];

    if (typeof func !== 'function') {
      throw new Error(`The function ${funcName} does not exist on the endpoint`);
    }

    return func(...fullArgs);
  }

  let endpointIndex = 0;
  const cancel: StreamErrCb = async (err, cancelStream) => {
    if (isCancelled) {
      return;
    }
    if (err.status === 404 && endpointIndex < apiEndpoints.length) {
      // Cancel current stream
      if (cancelStream) {
        cancelStream();
      }

      streamCancel = await runStreamFunc(endpointIndex++, funcName, cancel, ...args);
    } else if (!!errCb) {
      errCb(err, streamCancel);
    }
  };

  streamCancel = await runStreamFunc(endpointIndex++, funcName, cancel, ...args);

  return () => {
    isCancelled = true;
    streamCancel();
  };
}

/**
 * Creates an API client for a single or multiple Kubernetes resources.
 *
 * @param args - The arguments to pass to either `singleApiFactory` or `multipleApiFactory`.
 *
 * @returns An API client for the specified Kubernetes resource(s).
 */
export function apiFactory<ResourceType extends KubeObjectInterface = KubeObjectInterface>(
  ...args: ApiFactoryArguments
): ApiClient<ResourceType> {
  if (isDebugVerbose('k8s/apiProxy@apiFactory')) {
    console.debug('k8s/apiProxy@apiFactory', { args });
  }

  if (args[0] instanceof Array) {
    return multipleApiFactory(...(args as MultipleApiFactoryArguments));
  }

  return singleApiFactory(...(args as SingleApiFactoryArguments));
}

/**
 * Creates an API endpoint object for multiple API endpoints.
 * It first tries the first endpoint, then the second, and so on until it
 * gets a successful response.
 *
 * @param args - An array of arguments to pass to the `singleApiFactory` function.
 *
 * @returns An API endpoint object.
 */
export function multipleApiFactory<T extends KubeObjectInterface>(
  ...args: MultipleApiFactoryArguments
): ApiClient<T> {
  if (isDebugVerbose('k8s/apiProxy@multipleApiFactory')) {
    console.debug('k8s/apiProxy@multipleApiFactory', { args });
  }

  const apiEndpoints = args.map(apiArgs => singleApiFactory(...apiArgs));

  return {
    list: (cb, errCb, queryParams) => {
      return repeatStreamFunc(apiEndpoints, 'list', errCb, cb, queryParams);
    },
    get: (name, cb, errCb, queryParams, cluster) =>
      repeatStreamFunc(apiEndpoints, 'get', errCb, name, cb, queryParams, cluster),
    isNamespaced: false,
    apiInfo: args.map(apiArgs => ({
      group: apiArgs[0],
      version: apiArgs[1],
      resource: apiArgs[2],
    })),
  };
}
// @todo: singleApiFactory should have a return type rather than just what it returns.

/**
 * @returns An object with methods for interacting with a single API endpoint.
 *
 * @param group - The API group.
 * @param version - The API version.
 * @param resource - The API resource.
 */
export function singleApiFactory<T extends KubeObjectInterface>(
  ...[group, version, resource]: SingleApiFactoryArguments
): ApiClient<T> {
  if (isDebugVerbose('k8s/apiProxy@singleApiFactory')) {
    console.debug('k8s/apiProxy@singleApiFactory', { group, version, resource });
  }

  const apiRoot = getApiRoot(group, version);
  const url = `${apiRoot}/${resource}`;
  return {
    list: (cb, errCb, queryParams) => {
      if (isDebugVerbose('k8s/apiProxy@singleApiFactory list')) {
        console.debug('k8s/apiProxy@singleApiFactory list', { queryParams });
      }

      return streamResultsForCluster(url, { cb, errCb }, queryParams);
    },
    get: (name, cb, errCb, queryParams) =>
      streamResult(url, name, cb, errCb, queryParams),
    isNamespaced: false,
    apiInfo: [{ group, version, resource }],
  };
}

// @todo: just use args from simpleApiFactoryWithNamespace, rather than `args`?
//        group: string, version: string, resource: string, includeScale: boolean = false

export function apiFactoryWithNamespace<T extends KubeObjectInterface>(
  ...args: ApiFactoryWithNamespaceArguments
) {
  if (args[0] instanceof Array) {
    return multipleApiFactoryWithNamespace<T>(
      ...(args as MultipleApiFactoryWithNamespaceArguments)
    );
  }

  return simpleApiFactoryWithNamespace<T>(...(args as SimpleApiFactoryWithNamespaceArguments));
}

function multipleApiFactoryWithNamespace<T extends KubeObjectInterface>(
  ...args: MultipleApiFactoryWithNamespaceArguments
): ApiWithNamespaceClient<T> {
  const apiEndpoints = args.map(apiArgs => simpleApiFactoryWithNamespace(...apiArgs));

  return {
    list: (namespace, cb, errCb, queryParams) => {
      return repeatStreamFunc(apiEndpoints, 'list', errCb, namespace, cb, queryParams);
    },
    get: (namespace, name, cb, errCb, queryParams, cluster) =>
      repeatStreamFunc(apiEndpoints, 'get', errCb, namespace, name, cb, queryParams, cluster),
    isNamespaced: true,
    apiInfo: args.map(apiArgs => ({
      group: apiArgs[0],
      version: apiArgs[1],
      resource: apiArgs[2],
    })),
  };
}

function simpleApiFactoryWithNamespace<T extends KubeObjectInterface>(
  ...[group, version, resource, includeScale = false]: SimpleApiFactoryWithNamespaceArguments
): ApiWithNamespaceClient<T> {
  if (isDebugVerbose('k8s/apiProxy@simpleApiFactoryWithNamespace')) {
    console.debug('k8s/apiProxy@simpleApiFactoryWithNamespace', {
      group,
      version,
      resource,
      includeScale,
    });
  }

  const apiRoot = getApiRoot(group, version);
  const results: ApiWithNamespaceClient<T> = {
    list: (namespace, cb, errCb, queryParams) => {
      if (isDebugVerbose('k8s/apiProxy@simpleApiFactoryWithNamespace list')) {
        console.debug('k8s/apiProxy@simpleApiFactoryWithNamespace list', { queryParams });
      }

      return streamResultsForCluster(url(namespace), { cb, errCb }, queryParams);
    },
    get: (namespace, name, cb, errCb, queryParams) =>
      streamResult(url(namespace), name, cb, errCb, queryParams),
    isNamespaced: true,
    apiInfo: [{ group, version, resource }],
  };

  return results;

  function url(namespace: string) {
    return namespace ? `${apiRoot}/namespaces/${namespace}/${resource}` : `${apiRoot}/${resource}`;
  }
}

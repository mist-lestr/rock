import { getAppUrl } from "../../../helpers/getAppUrl";
import type { ApiError } from "../v2/ApiError";
import { DEFAULT_TIMEOUT } from "./constants";
import { asQuery, combinePath } from "./formatUrl";
import type { QueryParameters } from "./queryParameters";

/**
 * Options for the request.
 */
export interface RequestParams extends RequestInit {
  /** Number of milliseconds to wait for a response. */
  timeout?: number;
  /** Is the request expected to receive JSON data? */
  isJSON?: boolean;
}

export interface ClusterRequest {
  /** The name of the cluster (has to be unique, or it will override an existing cluster) */
  name?: string;
  /** The cluster URL */
  server?: string;
  /** Whether the server's certificate should not be checked for validity */
  insecureTLSVerify?: boolean;
  /** The certificate authority data */
  certificateAuthorityData?: string;
  /** KubeConfig (base64 encoded)*/
  kubeconfig?: string;
}

/**
 * The options for `clusterRequest`.
 */
export interface ClusterRequestParams extends RequestParams {
}

/**
 * Sends a request to the backend. If the cluster is required in the params parameter, it will
 * be used as a request to the respective Kubernetes server.
 *
 * @param path - The path to the API endpoint.
 * @param params - Optional parameters for the request.
 * @param queryParams - Optional query parameters for the k8s request.
 *
 * @returns A Promise that resolves to the JSON response from the API server.
 * @throws An ApiError if the response status is not ok.
 */
export async function clusterRequest(
  path: string,
  params: ClusterRequestParams = {},
  queryParams?: QueryParameters
): Promise<any> {
  interface RequestHeaders {
    Authorization?: string;
    autoLogoutOnAuthError?: boolean;
    [otherHeader: string]: any;
  }

  const {
    timeout = DEFAULT_TIMEOUT,
    isJSON = true,
    ...otherParams
  } = params;

  const opts: { headers: RequestHeaders } = Object.assign({ headers: {} }, otherParams);

  let fullPath = path;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  let url = combinePath(getAppUrl(), fullPath);
  url += asQuery(queryParams);
  const requestData = {
    signal: controller.signal,
    credentials: 'include' as RequestCredentials,
    ...opts,
  };
  let response: Response = new Response(undefined, { status: 502, statusText: 'Unreachable' });
  try {
    response = await fetch(url, requestData);
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        response = new Response(undefined, { status: 408, statusText: 'Request timed-out' });
      }
    }
  } finally {
    clearTimeout(id);
  }

  // The backend signals through this header that it wants a reload.
  // See plugins.go
  const headerVal = response.headers.get('X-Reload');
  if (headerVal && headerVal.indexOf('reload') !== -1) {
    window.location.reload();
  }

  if (!response.ok) {
    const { status, statusText } = response;

    let message = statusText;
    try {
      if (isJSON) {
        const json = await response.json();
        message += ` - ${json.message}`;
      }
    } catch (err) {
      console.error(
        'Unable to parse error json at url:',
        url,
        { err },
        'with request data:',
        requestData
      );
    }

    const error = new Error(message) as ApiError;
    error.status = status;
    return Promise.reject(error);
  }

  if (!isJSON) {
    return Promise.resolve(response);
  }

  return response.json();
}

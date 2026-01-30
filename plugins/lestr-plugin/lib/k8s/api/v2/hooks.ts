import { clusterFetch } from "./fetch";
import { KubeObjectEndpoint } from "./KubeObjectEndpoint";

/**
 * Test different endpoints to see which one is working.
 *
 * @params endpoints - List of possible endpoints
 * @returns Endpoint that works
 *
 * @throws Error
 * When no endpoints are working
 */
const getWorkingEndpoint = async (
  endpoints: KubeObjectEndpoint[],
  namespace?: string
) => {
  const promises = endpoints.map(endpoint => {
    return clusterFetch(KubeObjectEndpoint.toUrl(endpoint, namespace), {
      method: 'GET',
    }).then(() => endpoint);
  });
  return Promise.any(promises).catch((aggregateError: AggregateError) => {
    // when no endpoint is available, throw an error
    throw aggregateError.errors[0];
  });
};

/**
 * Checks and returns an endpoint that works from the list
 *
 * @params endpoints - List of possible endpoints
 */
export const useEndpoints = (
  endpoints: KubeObjectEndpoint[],
  namespace?: string
) => {

  var error = null

  if (endpoints.length === 1) return { endpoint: endpoints[0], error: null };

  getWorkingEndpoint(endpoints, namespace).then((endpoint) => {

    return { endpoint, error: null };
  }).catch((err) => {

    error = err
  })

  return { endpoint: null, error };
};

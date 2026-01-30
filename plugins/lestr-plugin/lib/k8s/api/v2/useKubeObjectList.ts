/*
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { KubeObject } from '../../KubeObject';
import type { QueryParameters } from '../v1/queryParameters';
import { ApiError } from './ApiError';
import { clusterFetch } from './fetch';
import { useEndpoints } from './hooks';
import { KubeList } from './KubeList';
import { KubeObjectEndpoint } from './KubeObjectEndpoint';
import { makeUrl } from './makeUrl';

/**
 * @returns true if the websocket multiplexer is enabled.
 * defaults to true. This is a feature flag to enable the websocket multiplexer.
 */
export function getWebsocketMultiplexerEnabled(): boolean {
  return import.meta.env.REACT_APP_ENABLE_WEBSOCKET_MULTIPLEXER === 'true';
}

/**
 * Object representing a List of Kube object
 * with information about which cluster and namespace it came from
 */
export interface ListResponse<K extends KubeObject> {
  /** KubeList with items */
  list: KubeList<K>;
  /** If the list only has items from one namespace */
  namespace?: string;
}

/**
 * Returns a combined list of Kubernetes objects and watches for changes from the clusters given.
 *
 * @param param - request paramaters
 * @returns Combined list of Kubernetes resources
 */
export async function useKubeObjectList<K extends KubeObject>({
  namespace,
  kubeObjectClass,
  queryParams,
}: {
  namespace?: string;
  /** Class to instantiate the object with */
  kubeObjectClass: (new (...args: any) => K) & typeof KubeObject<any>;
  queryParams?: QueryParameters;
}): Promise<ListResponse<K> | undefined | null> {

  // Get working endpoint from the first cluster
  // Now if clusters have different apiVersions for the same resource for example, this will not work
  const { endpoint, error: _endpointError } = useEndpoints(
    kubeObjectClass.apiEndpoint.apiInfo,
    namespace
  );

  if (!endpoint) return;

  try {
    const list: KubeList<any> = await clusterFetch(
      makeUrl([KubeObjectEndpoint.toUrl(endpoint!, namespace)], queryParams),
      {}
    ).then(it => it.json());
    list.items = list.items.map((item: any) => {
      const itm = new kubeObjectClass({
        ...item,
        kind: list.kind.replace('List', ''),
        apiVersion: list.apiVersion,
      });
      return itm;
    });

    const response: ListResponse<K> = {
      list: list as KubeList<K>,
      namespace,
    };

    return response;
  } catch (e) {
    // Rethrow error with cluster and namespace information
    if (e instanceof ApiError) {
      e.namespace = namespace;
    }
    throw e;
  }
}

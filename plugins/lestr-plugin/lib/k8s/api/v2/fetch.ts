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

import { useRegistry } from '../../../../src/main';
import { getAppUrl } from '../../../helpers/getAppUrl';
import { ApiError } from './ApiError';
import { makeUrl } from './makeUrl';

// @deprecated BASE_HTTP_URL is deprecated for Electron apps with custom ports.
// It's evaluated at module load time, before window.headlampBackendPort is set.
// Use getAppUrl() directly instead for runtime port configuration.
export const BASE_HTTP_URL = getAppUrl();

/**
 * Simple wrapper around Fetch function
 * Sends a request to the backend
 *
 * @param url - URL path
 * @param init - options parameter for the Fetch function
 *
 * @returns fetch Response
 */
export async function backendFetch(url: string | URL, init: RequestInit = {}) {
  // Always include credentials
  init.credentials = 'include';
  const response = await useRegistry()?.backendFetch(makeUrl([getAppUrl(), url]), init);

  if (!response) {
    throw new ApiError('Unreachable');
  }

  if (!response.ok) {
    // Try to parse error message from response
    let maybeErrorMessage: string | undefined;
    try {
      const body = await response.json();
      maybeErrorMessage = typeof body === 'string' ? body : body.message;
    } catch (e) {}

    throw new ApiError(maybeErrorMessage ?? 'Unreachable', { status: response.status });
  }

  return response;
}

/**
 * A wrapper around Fetch function
 * Allows sending requests to a particular cluster
 *
 * @param url - URL path
 * @param init - same as second parameter of the Fetch function
 *
 * @returns fetch Response
 */
export async function clusterFetch(url: string | URL, init: RequestInit) {
  init.headers = new Headers(init.headers);


  try {
    const response = await backendFetch(url, init);

    return response;
  } catch (e) {
    throw e;
  }
}


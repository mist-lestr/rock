import type { Service } from './services'
import type { Plugin } from '../plugins'
import { userManager } from '@/auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export interface ApiClientConfig {
  baseUrl?: string
}

export class ApiClient {
  private baseUrl: string

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || API_BASE_URL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const user = await userManager.getUser();
    if (!user) throw new Error('User not authenticated');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.id_token}`,
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getServices(): Promise<Service[]> {
    return this.request<Service[]>('/api/services')
  }

  async getService(name: string): Promise<Service> {
    return this.request<Service>(`/api/services/${name}`)
  }

  async getPlugins(): Promise<Plugin[]> {
    return this.request<Plugin[]>('/api/plugins')
  }

  async getPlugin(name: string): Promise<Plugin> {
    return this.request<Plugin>(`/api/plugins/${name}`)
  }

  async listResources(
    project: string,
    domain: string,
    version: string,
    service: string
  ): Promise<any[]> {
    return this.request<any[]>(`/${project}/${domain}/${version}/${service}`)
  }

  async getResource(
    project: string,
    domain: string,
    version: string,
    service: string,
    name: string
  ): Promise<any> {
    return this.request<any>(`/${project}/${domain}/${version}/${service}/${name}`)
  }

  async createResource(
    project: string,
    domain: string,
    version: string,
    service: string,
    data: any
  ): Promise<void> {
    await this.request(`/${project}/${domain}/${version}/${service}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteResource(
    project: string,
    domain: string,
    version: string,
    service: string,
    name: string
  ): Promise<void> {
    await this.request(`/${project}/${domain}/${version}/${service}/${name}`, {
      method: 'DELETE',
    })
  }
}

export const apiClient = new ApiClient()


import { type ReactNode } from 'react'
import { type Plugin } from '../../../plugins'
import React from 'react'
import { usePlugin } from '../../../plugins'

export interface PluginLoaderProps {
  plugin?: Plugin
  data?: any
  onError?: (error: Error) => void
  fallback?: ReactNode
}

export function PluginLoader({ plugin, fallback }: PluginLoaderProps) {

  const { isLoading, error, data } = ((plugin?: Plugin) => {
    if(plugin) {
      const result = usePlugin(plugin!)
      console.log(result)
      return result
    } else {
      return {isLoading: false, error: null, data: "fallback"}
    }
  })(plugin)
  
  if (error) {
    return (
      <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
        <p className="text-destructive font-semibold">Error loading plugin</p>
        <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Chargement du plugin... </div>
      </div>
    )
  }

  if (!plugin) {
    console.log("no plugin")
    return <>{fallback}</>
  }

  const component = React.createElement(data!)

  return (
    <div className="plugin-container">
      {component}
    </div>
  )
}




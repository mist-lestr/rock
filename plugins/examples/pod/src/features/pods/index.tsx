import { PodsProvider } from './components/pods-provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function PodsQueryProvider() {

}

export function Pods() {
  // const search = route.useSearch()
  // const navigate = route.useNavigate()

  const queryClient = new QueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <PodsProvider />
    </QueryClientProvider>
  )
}

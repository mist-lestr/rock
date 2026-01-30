import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { Pod } from '../data/schema'
import { useQuery } from '@tanstack/react-query'
import { useRegistry } from 'lestr-plugin'
import { loadFakeData } from '../data/pods'
import { PodsTable } from './pods-table'
import { Main } from '@/components/layout/main'
import { PodsPrimaryButtons } from './pods-primary-buttons'

type PodsDialogType = 'invite' | 'add' | 'edit' | 'delete'

type PodsContextType = {
  open: PodsDialogType | null
  setOpen: (str: PodsDialogType | null) => void
  currentRow: Pod | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Pod | null>>
}

const PodsContext = React.createContext<PodsContextType | null>(null)

const loadPods = async () => {
  const registry = useRegistry()
  if (registry) {
    const res = await Pod.useList({namespace: 'kube-system'})
    
    console.log("List pods", res);
    if (res?.list.items) {
      return res!.list.items
    } else {
      return []
    }

  } else {
      return loadFakeData()
  }
}

export function PodsProvider() {
  const [open, setOpen] = useDialogState<PodsDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Pod | null>(null)

  const { data, isPending, error } = useQuery({
    queryKey: ['pods'],
    queryFn: loadPods,
  })

  if (isPending || error) {
    return (<div>loading...</div>)
  }

  const pods = data!
  
  return (
    <PodsContext value={{ open, setOpen, currentRow, setCurrentRow }}>
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Pod List</h2>
            <p className='text-muted-foreground'>
              Manage your pods here.
            </p>
          </div>
          <PodsPrimaryButtons />
        </div>
        <PodsTable data={pods} />
      </Main>
    </PodsContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const usePods = () => {
  const podsContext = React.useContext(PodsContext)

  if (!podsContext) {
    throw new Error('usePods has to be used within <PodsContext>')
  }

  return podsContext
}

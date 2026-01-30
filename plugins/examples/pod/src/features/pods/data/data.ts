export const podPhases = new Map<string, string>([
  ['Running', 'bg-teal-100/30 text-teal-900 dark:text-teal-200 border-teal-200'],
  ['Succeeded', 'bg-teal-100/30 text-teal-900 dark:text-teal-200 border-teal-200'],
  ['CrashLoopBackOff', 'bg-neutral-300/40 border-neutral-300'],
  ['Pending', 'bg-sky-200/40 text-sky-900 dark:text-sky-100 border-sky-300'],
  [
    'Failed',
    'bg-destructive/10 dark:bg-destructive/50 text-destructive dark:text-primary border-destructive/10',
  ],
])

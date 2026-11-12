import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import type { Query } from '@tanstack/react-query'

import { CACHE_MAX_AGE } from '@/router'

/** Only the screens' data; search results and device state stay out of storage. */
const KEPT = new Set(['tasks', 'plants', 'rooms', 'profile', 'fertilizers', 'photo-url'])

export const persister = createSyncStoragePersister({
  // Private mode or full storage: the app still works, just without the offline copy.
  storage: (() => {
    try {
      return window.localStorage
    } catch {
      return undefined
    }
  })(),
  key: 'dewly-cache',
})

export const persistOptions = {
  persister,
  maxAge: CACHE_MAX_AGE,
  // Bump when cached shapes change, so an old copy isn't read into new code.
  buster: '1',
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Query) =>
      query.state.status === 'success' && KEPT.has(String(query.queryKey[0])),
  },
}

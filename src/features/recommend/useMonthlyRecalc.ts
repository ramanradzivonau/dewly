import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { tasksKey } from '@/features/care/keys'
import { plantsKey } from '@/features/plants/api'

import { aiSchedules, recalculate } from './api'

/** Once per app start: a new month brings new weather and day length. */
let started = false

/**
 * AI schedules computed before this month are recalculated in the background, so the season,
 * outdoor temperature and day length stay current without a server cron job.
 */
export function useMonthlyRecalc() {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (started) return
    started = true
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    void aiSchedules({ before: monthStart })
      .then(async (ids) => {
        if (ids.length === 0) return
        await recalculate(ids)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: tasksKey }),
          queryClient.invalidateQueries({ queryKey: plantsKey }),
        ])
      })
      .catch(() => {
        started = false
      })
  }, [queryClient])
}

import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { FormCard, FormError, FormScreen } from '@/components/FormScreen'
import { BellIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/ChoiceGroup'
import { profileQuery, useUpdateProfile } from '@/features/profile/api'
import {
  currentSubscription,
  pushBlocker,
  sendTestPush,
  subscribe,
  unsubscribe,
} from '@/features/reminders/push'

export const Route = createFileRoute('/_authed/reminders')({
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQuery(context.user.id)),
  component: RemindersScreen,
})

const MAX_TIMES = 5

const blockerText = {
  'not-configured': 'Reminders aren’t set up on the server yet.',
  'not-installed':
    'On iPhone, reminders work only in the installed app. In Safari tap Share → Add to Home Screen, then open Dewly from the Home Screen.',
  unsupported: 'This browser can’t receive push notifications.',
  denied:
    'Notifications are blocked for Dewly. Allow them in Settings → Notifications → Dewly, then come back.',
} as const

/** Reminders: turn push on for this device and pick 1–5 daily times. */
function RemindersScreen() {
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: profile } = useSuspenseQuery(profileQuery(user.id))
  const [times, setTimes] = useState(profile.reminder_times)
  const save = useUpdateProfile(user.id)
  const blocker = pushBlocker()

  const subscription = useQuery({
    queryKey: ['push-subscription'],
    queryFn: currentSubscription,
    enabled: !blocker,
  })
  const on = !!subscription.data
  const toggle = useMutation({
    mutationFn: (next: boolean) => (next ? subscribe() : unsubscribe()),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['push-subscription'] }),
  })
  const test = useMutation({ mutationFn: sendTestPush })

  const unique = [...new Set(times)].sort()
  const setAt = (i: number, value: string) =>
    setTimes((list) => list.map((t, j) => (j === i ? value : t)))

  return (
    <FormScreen
      back={{ to: '/profile', label: 'Back to Profile' }}
      title="Reminders"
      subtitle="Each reminder lists what’s still left for today. If everything is done, it’s skipped."
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate(
          { reminder_times: unique },
          { onSuccess: () => navigate({ to: '/profile', replace: true }) },
        )
      }}
      bottomBar={
        <Button type="submit" loading={save.isPending}>
          Save
        </Button>
      }
    >
      <FormCard>
        {blocker ? (
          <p className="text-field-label font-medium text-ink-muted">{blockerText[blocker]}</p>
        ) : (
          <>
            <Switch
              label="Send reminders to this device"
              checked={toggle.isPending ? !on : on}
              onChange={(next) => toggle.mutate(next)}
            />
            {toggle.isError && (
              <p role="alert" className="text-caption text-danger">
                {toggle.error.message === 'permission_denied'
                  ? 'Notifications weren’t allowed. Allow them in Settings to get reminders.'
                  : 'Couldn’t change reminders. Try again.'}
              </p>
            )}
            {on && (
              <button
                type="button"
                onClick={() => test.mutate()}
                disabled={test.isPending}
                className="min-h-11 self-start text-label font-bold text-primary-text disabled:opacity-60"
              >
                {test.isPending
                  ? 'Sending…'
                  : test.isSuccess
                    ? 'Sent. Check your notifications.'
                    : 'Send a test reminder'}
              </button>
            )}
            {test.isError && (
              <p role="alert" className="text-caption text-danger">
                Couldn’t send a test. Try again later.
              </p>
            )}
          </>
        )}
      </FormCard>

      <FormCard>
        <div className="flex items-baseline justify-between">
          <h2 className="text-body-strong font-extrabold text-primary">Times</h2>
          <span className="text-caption font-medium text-ink-subtle">
            {times.length} a day · up to {MAX_TIMES}
          </span>
        </div>
        <ul>
          {times.map((t, i) => (
            <li key={i} className="flex min-h-15 items-center gap-3 border-b border-divider">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-primary text-logo-light">
                <BellIcon width={20} height={20} />
              </span>
              <input
                type="time"
                value={t}
                required
                onChange={(e) => e.target.value && setAt(i, e.target.value)}
                aria-label={`Reminder ${i + 1} time`}
                className="min-h-11 flex-1 rounded-md bg-bg px-3 text-body-strong font-extrabold text-ink outline-none focus:ring-2 focus:ring-primary"
              />
              {times.length > 1 && (
                <button
                  type="button"
                  onClick={() => setTimes((list) => list.filter((_, j) => j !== i))}
                  aria-label={`Remove reminder at ${t}`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-pill text-danger"
                >
                  <TrashIcon width={20} height={20} />
                </button>
              )}
            </li>
          ))}
        </ul>
        {times.length < MAX_TIMES && (
          <button
            type="button"
            onClick={() => setTimes((list) => [...list, '12:00'])}
            className="mt-1.5 flex min-h-12 items-center gap-2 self-start rounded-pill border-[1.5px] border-primary px-4.5 text-body font-bold text-primary"
          >
            <PlusIcon width={18} height={18} />
            Add reminder
          </button>
        )}
        {unique.length < times.length && (
          <p className="text-caption text-ink-subtle">Repeated times are saved once.</p>
        )}
      </FormCard>

      <FormError message={save.error ? 'Couldn’t save the times. Try again.' : null} />
    </FormScreen>
  )
}

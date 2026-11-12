import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

import { FormCard, FormError, FormScreen } from '@/components/FormScreen'
import { TrashIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { roomsQuery } from '@/features/rooms/api'
import { plantCount } from '@/features/rooms/format'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/_authed/profile/delete')({
  component: DeleteAccountScreen,
})

const CONFIRM = 'DELETE'

/** Delete account: what goes, a typed confirmation, then sign-out on success. */
function DeleteAccountScreen() {
  const [typed, setTyped] = useState('')
  const rooms = useQuery(roomsQuery()).data ?? []
  const plants = rooms.reduce((n, r) => n + r.plants.length, 0)

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('delete-account', {
        body: { confirm: CONFIRM },
      })
      if (error) throw error
      // The user is gone; drop the session so the guard sends us to Log in.
      await supabase.auth.signOut({ scope: 'local' })
    },
  })

  const items = [
    `${plantCount(plants)} and their care schedules`,
    rooms.length === 1 ? '1 room' : `${rooms.length} rooms`,
    'All progress photos and notes',
    'Watering history, fertilizers and reminders',
  ]

  return (
    <FormScreen
      back={{ to: '/profile', label: 'Back to Profile' }}
      title="Delete account"
      subtitle="This can’t be undone. Everything below is deleted for good."
      onSubmit={(e) => {
        e.preventDefault()
        if (typed.trim() === CONFIRM) remove.mutate()
      }}
      bottomBar={
        <div className="flex flex-col gap-1.5">
          <Button
            type="submit"
            variant="danger"
            disabled={typed.trim() !== CONFIRM}
            loading={remove.isPending}
          >
            Delete my account
          </Button>
          <Link
            to="/profile"
            className="flex min-h-12 items-center justify-center text-label font-bold text-primary"
          >
            Cancel
          </Link>
        </div>
      }
    >
      <FormCard>
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item} className="flex min-h-12 items-center gap-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-danger-soft text-danger">
                <TrashIcon width={18} height={18} />
              </span>
              <span className="text-body font-semibold text-ink">{item}</span>
            </li>
          ))}
        </ul>
      </FormCard>

      <FormCard>
        <TextField
          label={`Type ${CONFIRM} to confirm`}
          autoComplete="off"
          autoCapitalize="characters"
          placeholder={CONFIRM}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
      </FormCard>

      <FormError message={remove.error ? 'Couldn’t delete the account. Try again.' : null} />
    </FormScreen>
  )
}

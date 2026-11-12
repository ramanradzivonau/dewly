import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'

import googleMark from '@/assets/google-g.svg'
import { authErrorMessage } from '@/auth/errors'
import { FormCard, FormError, FormScreen } from '@/components/FormScreen'
import { Button } from '@/components/ui/Button'
import { authUserQuery, googleIdentity, hasPassword } from '@/features/account/api'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/_authed/profile/google')({
  loader: ({ context }) => context.queryClient.ensureQueryData(authUserQuery()),
  component: GoogleScreen,
})

const linkedOn = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/**
 * Link, relink or unlink Google. Unlinking needs a password first, so the account can still be
 * reached with email. Linking needs "Manual linking" on in Supabase Auth settings.
 */
function GoogleScreen() {
  const queryClient = useQueryClient()
  const { data: user } = useSuspenseQuery(authUserQuery())
  const identity = googleIdentity(user)
  const canUnlink = hasPassword(user)
  const refresh = () => queryClient.invalidateQueries({ queryKey: authUserQuery().queryKey })

  // Leaves for Google and comes back here, linked.
  const link = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/profile/google` },
      })
      if (error) throw error
    },
  })

  const unlink = useMutation({
    mutationFn: async () => {
      if (!identity) return
      const { error } = await supabase.auth.unlinkIdentity(identity)
      if (error) throw error
    },
    onSuccess: refresh,
  })

  // A different Google account: drop this one, then link the new one.
  const relink = useMutation({
    mutationFn: async () => {
      if (identity) {
        const { error } = await supabase.auth.unlinkIdentity(identity)
        if (error) throw error
      }
      await link.mutateAsync()
    },
  })

  const email = identity?.identity_data?.email as string | undefined
  const error = link.error ?? unlink.error ?? relink.error

  return (
    <FormScreen
      back={{ to: '/profile', label: 'Back to Profile' }}
      title="Google account"
      subtitle="Link Google to sign in with one tap. Your plants stay with this account."
    >
      {identity ? (
        <FormCard>
          <div className="flex items-center gap-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-pill border border-border">
              <img src={googleMark} alt="" width={24} height={24} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-label text-ink">{email ?? 'Google account'}</span>
              {identity.created_at && (
                <span className="text-caption font-medium text-ink-subtle">
                  Linked on {linkedOn.format(new Date(identity.created_at))}
                </span>
              )}
            </span>
            <span className="rounded-sm bg-primary-soft px-2.5 py-1 text-caption font-extrabold text-primary">
              Linked
            </span>
          </div>
          {canUnlink && (
            <>
              <Button
                variant="secondary"
                loading={relink.isPending}
                onClick={() => relink.mutate()}
              >
                Link a different Google account
              </Button>
              <button
                type="button"
                onClick={() => unlink.mutate()}
                disabled={unlink.isPending}
                className="min-h-12 text-body font-bold text-danger disabled:opacity-60"
              >
                {unlink.isPending ? 'Unlinking…' : 'Unlink Google'}
              </button>
            </>
          )}
        </FormCard>
      ) : (
        <FormCard>
          <Button variant="secondary" loading={link.isPending} onClick={() => link.mutate()}>
            <img src={googleMark} alt="" width={22} height={22} />
            Link Google account
          </Button>
        </FormCard>
      )}

      {identity && !canUnlink && (
        <p className="px-1 text-caption font-medium text-ink-subtle">
          To unlink Google,{' '}
          <Link to="/profile/password" className="font-bold text-primary-text">
            set a password
          </Link>{' '}
          first so you can still log in with email.
        </p>
      )}

      <FormError message={error ? authErrorMessage(error) : null} />
    </FormScreen>
  )
}

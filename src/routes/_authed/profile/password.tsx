import { AuthError } from '@supabase/supabase-js'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'

import { CodeField } from '@/auth/CodeField'
import { authErrorMessage } from '@/auth/errors'
import { newPasswordField } from '@/auth/schemas'
import { FormCard, FormError, FormScreen } from '@/components/FormScreen'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { authUserQuery, hasPassword } from '@/features/account/api'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/_authed/profile/password')({
  loader: ({ context }) => context.queryClient.ensureQueryData(authUserQuery()),
  component: PasswordScreen,
})

/**
 * Change the password (with the current one, or a code by email if it's forgotten), or set
 * one for an account that only signs in with Google.
 */
function PasswordScreen() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: user } = useSuspenseQuery(authUserQuery())
  const existing = hasPassword(user)
  const email = user.email ?? ''

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  // A code by email stands in for the current password (or when Supabase asks to reauthenticate).
  const [useCode, setUseCode] = useState(false)
  const [code, setCode] = useState('')

  const sendCode = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.reauthenticate()
      if (error) throw error
    },
    onSuccess: () => setUseCode(true),
  })

  const save = useMutation({
    mutationFn: async () => {
      if (existing && !useCode) {
        // Checking the current password is signing in with it.
        const check = await supabase.auth.signInWithPassword({ email, password: current })
        if (check.error) throw new AuthError('Wrong password', 400, 'wrong_current_password')
      }
      const { error } = await supabase.auth.updateUser({
        password: next,
        ...(useCode ? { nonce: code } : {}),
        data: { password_set: true },
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authUserQuery().queryKey })
      await navigate({ to: '/profile', replace: true })
    },
    onError: (error) => {
      // "Secure password change" is on: confirm by a code instead.
      if (error instanceof AuthError && error.code === 'reauthentication_needed') sendCode.mutate()
    },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = newPasswordField.safeParse(next)
    if (!parsed.success) return setFieldError(parsed.error.issues[0]?.message ?? 'Too short')
    if (next !== repeat) return setFieldError('The passwords don’t match')
    if (existing && !useCode && !current) return setFieldError('Enter your current password')
    if (useCode && code.length !== 6) return setFieldError('Enter the 6-digit code')
    setFieldError(null)
    save.mutate()
  }

  const error = save.error ?? sendCode.error
  const errorText =
    error instanceof AuthError && error.code === 'wrong_current_password'
      ? 'The current password is wrong.'
      : error instanceof AuthError && error.code === 'reauthentication_needed'
        ? null
        : error
          ? authErrorMessage(error)
          : null

  return (
    <FormScreen
      back={{ to: '/profile', label: 'Back to Profile' }}
      title={existing ? 'Change password' : 'Set a password'}
      subtitle={
        existing
          ? 'Use at least 8 characters.'
          : 'You sign in with Google. Add a password to also log in with your email.'
      }
      onSubmit={onSubmit}
      bottomBar={
        <Button type="submit" loading={save.isPending}>
          {existing ? 'Change password' : 'Set password'}
        </Button>
      }
    >
      <FormCard>
        {existing && !useCode && (
          <TextField
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        )}
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <TextField
          label="Repeat new password"
          type="password"
          autoComplete="new-password"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          error={fieldError ?? undefined}
        />
        {existing && !useCode && (
          <button
            type="button"
            onClick={() => sendCode.mutate()}
            disabled={sendCode.isPending}
            className="flex min-h-8 items-center self-start text-field-label text-primary-text disabled:opacity-60"
          >
            {sendCode.isPending ? 'Sending…' : 'Forgot current password? Get a code by email'}
          </button>
        )}
      </FormCard>

      {useCode && (
        <>
          <p className="px-1 text-field-label font-medium text-ink-muted">
            Enter the 6-digit code sent to {email}.
          </p>
          <CodeField
            value={code}
            onChange={setCode}
            invalid={!!save.error}
            onResend={() => supabase.auth.reauthenticate()}
          />
        </>
      )}

      <FormError message={errorText} />
    </FormScreen>
  )
}

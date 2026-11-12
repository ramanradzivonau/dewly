import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'

import { authErrorMessage } from '@/auth/errors'
import { emailField } from '@/auth/schemas'
import { CodeField } from '@/auth/CodeField'
import { FormCard, FormError, FormScreen } from '@/components/FormScreen'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { authUserQuery } from '@/features/account/api'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/_authed/profile/email')({
  loader: ({ context }) => context.queryClient.ensureQueryData(authUserQuery()),
  component: EmailScreen,
})

/**
 * Change email: a code goes to the new address. If "Secure email change" is on in Supabase,
 * the current address gets a code too, and both are asked for in turn.
 */
function EmailScreen() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: user } = useSuspenseQuery(authUserQuery())
  const current = user.email ?? ''
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  // Which address the code being typed belongs to.
  const [codeFor, setCodeFor] = useState<'new' | 'current' | null>(null)
  const [code, setCode] = useState('')

  const send = useMutation({
    mutationFn: async (address: string) => {
      const { error } = await supabase.auth.updateUser({ email: address })
      if (error) throw error
    },
    onSuccess: () => setCodeFor('new'),
  })

  const verify = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.verifyOtp({
        email: codeFor === 'new' ? email : current,
        token: code,
        type: 'email_change',
      })
      if (error) throw error
      return data.user
    },
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: authUserQuery().queryKey })
      if (updated?.email === email) {
        await navigate({ to: '/profile', replace: true })
        return
      }
      // Secure email change: the current address has to confirm too.
      setCode('')
      setCodeFor('current')
    },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (codeFor) {
      if (code.length === 6) verify.mutate()
      return
    }
    const parsed = emailField.safeParse(email.trim())
    if (!parsed.success) return setEmailError('Enter a valid email')
    if (parsed.data.toLowerCase() === current.toLowerCase()) {
      return setEmailError('That’s your current email')
    }
    setEmailError(null)
    setEmail(parsed.data)
    send.mutate(parsed.data)
  }

  const error = send.error ?? verify.error

  return (
    <FormScreen
      back={{ to: '/profile', label: 'Back to Profile' }}
      title="Email"
      subtitle={
        codeFor === 'current'
          ? `One more: enter the code sent to ${current} to confirm the change.`
          : codeFor === 'new'
            ? `Enter the 6-digit code sent to ${email}.`
            : 'We’ll send a 6-digit code to the new address. The email changes once you enter it.'
      }
      onSubmit={onSubmit}
      bottomBar={
        <Button type="submit" loading={send.isPending || verify.isPending}>
          {codeFor ? 'Confirm' : 'Send code'}
        </Button>
      }
    >
      <FormCard>
        <div className="flex flex-col gap-1">
          <span className="text-caption text-ink-subtle">Current</span>
          <span className="text-label text-ink">{current}</span>
        </div>
        <TextField
          label="New email"
          type="email"
          autoComplete="email"
          placeholder="new@example.com"
          value={email}
          disabled={!!codeFor}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError ?? undefined}
        />
      </FormCard>

      {codeFor && (
        <CodeField
          key={codeFor}
          value={code}
          onChange={setCode}
          invalid={!!verify.error}
          onResend={() => supabase.auth.updateUser({ email })}
        />
      )}

      <FormError message={error ? authErrorMessage(error) : null} />
    </FormScreen>
  )
}

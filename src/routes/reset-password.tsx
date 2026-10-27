import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'

import { CodeField } from '@/auth/CodeField'
import { authErrorMessage } from '@/auth/errors'
import { CODE_LENGTH, emailSearchSchema, newPasswordSchema } from '@/auth/schemas'
import { FormScreen, FormCard, FormError } from '@/components/FormScreen'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { supabase } from '@/lib/supabase'

// Not under _guest: verifying the code signs the user in before the new password is saved.
export const Route = createFileRoute('/reset-password')({
  validateSearch: emailSearchSchema,
  beforeLoad: ({ search }) => {
    if (!search.email) throw redirect({ to: '/forgot-password', replace: true })
  },
  component: ResetPasswordScreen,
})

type NewPasswordValues = z.infer<typeof newPasswordSchema>

function ResetPasswordScreen() {
  const { email } = Route.useSearch()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  // A recovery code works once: after it signs the user in, retries only update the password.
  const [codeVerified, setCodeVerified] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewPasswordValues>({ resolver: zodResolver(newPasswordSchema) })

  const save = useMutation({
    mutationFn: async ({ password }: NewPasswordValues) => {
      if (!codeVerified) {
        const verified = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' })
        if (verified.error) throw verified.error
        setCodeVerified(true)
      }
      const updated = await supabase.auth.updateUser({ password })
      if (updated.error) throw updated.error
    },
    onSuccess: () => navigate({ to: '/today', replace: true }),
  })

  const onSubmit = handleSubmit((values) => {
    if (!codeVerified && code.length < CODE_LENGTH) {
      setCodeError(`Enter the ${CODE_LENGTH}-digit code from the email.`)
      return
    }
    save.mutate(values)
  })

  return (
    <FormScreen
      back={{ to: '/forgot-password', label: 'Back' }}
      title="Set a new password"
      subtitle={
        <>
          Enter the code we sent to <span className="font-bold text-ink">{email}</span> and choose a
          new password.
        </>
      }
      onSubmit={onSubmit}
      bottomBar={
        <Button type="submit" loading={save.isPending}>
          Save password
        </Button>
      }
    >
      <CodeField
        value={code}
        onChange={(next) => {
          setCode(next)
          setCodeError(null)
          if (save.isError) save.reset()
        }}
        invalid={Boolean(codeError)}
        confirmed={codeVerified}
        onResend={() => supabase.auth.resetPasswordForEmail(email)}
      />
      <FormCard>
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register('password')}
        />
      </FormCard>
      <FormError message={codeError ?? (save.error ? authErrorMessage(save.error) : null)} />
    </FormScreen>
  )
}

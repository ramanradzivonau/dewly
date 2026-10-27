import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'

import { authErrorMessage } from '@/auth/errors'
import { forgotPasswordSchema } from '@/auth/schemas'
import { FormScreen, FormCard, FormError } from '@/components/FormScreen'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/_guest/forgot-password')({
  component: ForgotPasswordScreen,
})

type ForgotValues = z.infer<typeof forgotPasswordSchema>

function ForgotPasswordScreen() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotPasswordSchema) })

  const sendCode = useMutation({
    mutationFn: async ({ email }: ForgotValues) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
    },
    onSuccess: (_data, { email }) => navigate({ to: '/reset-password', search: { email } }),
  })

  return (
    <FormScreen
      back={{ to: '/login', label: 'Back to log in' }}
      title="Reset password"
      subtitle="Enter the email you signed up with and we’ll send you a 6-digit code."
      onSubmit={handleSubmit((values) => sendCode.mutate(values))}
    >
      <FormCard>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
      </FormCard>

      <FormError message={sendCode.error ? authErrorMessage(sendCode.error) : null} />

      <Button type="submit" loading={sendCode.isPending}>
        Send code
      </Button>
    </FormScreen>
  )
}

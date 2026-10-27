import { zodResolver } from '@hookform/resolvers/zod'
import { AuthError } from '@supabase/supabase-js'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { authErrorMessage } from '@/auth/errors'
import { GoogleButton, OrWithEmail } from '@/auth/GoogleButton'
import { loginSchema } from '@/auth/schemas'
import { AuthScreen, FormCard, FormError } from '@/components/AuthScreen'
import { DewlyLogo } from '@/components/DewlyLogo'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/_guest/login')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: LoginScreen,
})

type LoginValues = z.infer<typeof loginSchema>

function LoginScreen() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  // On success the session changes and the _guest guard sends the user on.
  const login = useMutation({
    mutationFn: async (values: LoginValues) => {
      const { error } = await supabase.auth.signInWithPassword(values)
      if (error) throw error
    },
    onError: async (error, { email }) => {
      if (error instanceof AuthError && error.code === 'email_not_confirmed') {
        await supabase.auth.resend({ type: 'signup', email })
        await navigate({ to: '/verify', search: { email } })
      }
    },
  })

  const showError =
    login.error && !(login.error instanceof AuthError && login.error.code === 'email_not_confirmed')

  return (
    <AuthScreen
      top={<DewlyLogo />}
      title="Welcome back"
      subtitle="Log in to see what your plants need today."
      onSubmit={handleSubmit((values) => login.mutate(values))}
    >
      <GoogleButton label="Continue with Google" redirect={redirect} />
      <OrWithEmail />

      <FormCard>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Link
          to="/forgot-password"
          className="flex min-h-8 items-center self-end text-field-label text-primary-text"
        >
          Forgot password?
        </Link>
      </FormCard>

      <FormError message={showError ? authErrorMessage(login.error) : null} />

      <Button type="submit" loading={login.isPending}>
        Log in
      </Button>

      <p className="mt-auto text-center text-body text-ink-muted">
        No account yet?{' '}
        <Link to="/signup" className="font-extrabold text-primary-text">
          Sign up
        </Link>
      </p>
    </AuthScreen>
  )
}

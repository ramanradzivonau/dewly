import { zodResolver } from '@hookform/resolvers/zod'
import { AuthError } from '@supabase/supabase-js'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'

import { authErrorMessage } from '@/auth/errors'
import { GoogleButton, OrWithEmail } from '@/auth/GoogleButton'
import { signUpSchema } from '@/auth/schemas'
import { AuthScreen, FormCard, FormError } from '@/components/AuthScreen'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/_guest/signup')({
  component: SignUpScreen,
})

type SignUpValues = z.infer<typeof signUpSchema>

function SignUpScreen() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) })

  const signUp = useMutation({
    mutationFn: async ({ name, email, password }: SignUpValues) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name } },
      })
      if (error) throw error
      // With email confirmation on, Supabase hides existing accounts behind a user with no identities.
      if (data.user && data.user.identities?.length === 0) {
        throw new AuthError('Email already registered', 422, 'user_already_exists')
      }
      return data
    },
    onSuccess: async (data, { email }) => {
      // No session means the email still needs the code; with a session the _guest guard takes over.
      if (!data.session) await navigate({ to: '/verify', search: { email } })
    },
  })

  return (
    <AuthScreen
      back={{ to: '/login', label: 'Back to log in' }}
      step="Step 1 of 3"
      title="Create account"
      onSubmit={handleSubmit((values) => signUp.mutate(values))}
    >
      <GoogleButton label="Sign up with Google" />
      <OrWithEmail />

      <FormCard>
        <TextField
          label="Name"
          autoComplete="given-name"
          placeholder="What should we call you?"
          error={errors.name?.message}
          {...register('name')}
        />
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register('password')}
        />
      </FormCard>

      <FormError message={signUp.error ? authErrorMessage(signUp.error) : null} />

      <Button type="submit" loading={signUp.isPending}>
        Continue
      </Button>

      <p className="mt-auto text-center text-body text-ink-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-extrabold text-primary-text">
          Log in
        </Link>
      </p>
    </AuthScreen>
  )
}

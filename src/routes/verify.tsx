import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { CodeField } from '@/auth/CodeField'
import { authErrorMessage } from '@/auth/errors'
import { CODE_LENGTH, emailSearchSchema } from '@/auth/schemas'
import { FormScreen, FormError } from '@/components/FormScreen'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/verify')({
  validateSearch: emailSearchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.session) throw redirect({ to: '/today', replace: true })
    if (!search.email) throw redirect({ to: '/signup', replace: true })
  },
  component: VerifyScreen,
})

function VerifyScreen() {
  const { email } = Route.useSearch()
  const navigate = useNavigate()
  const [code, setCode] = useState('')

  const verify = useMutation({
    mutationFn: async (token: string) => {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
      if (error) throw error
    },
    onSuccess: () => navigate({ to: '/today', replace: true }),
  })

  const submit = (token: string) => {
    if (token.length === CODE_LENGTH && !verify.isPending) verify.mutate(token)
  }

  const handleChange = (next: string) => {
    setCode(next)
    if (verify.isError) verify.reset()
    submit(next)
  }

  return (
    <FormScreen
      back={{ to: '/signup', label: 'Back' }}
      step="Step 2 of 3"
      title="Check your email"
      subtitle={
        <>
          We sent a {CODE_LENGTH}-digit code to <span className="font-bold text-ink">{email}</span>.
          It’s valid for 10 minutes.
        </>
      }
      onSubmit={(e) => {
        e.preventDefault()
        submit(code)
      }}
      bottomBar={
        <Button type="submit" loading={verify.isPending} disabled={code.length < CODE_LENGTH}>
          Verify
        </Button>
      }
    >
      <CodeField
        value={code}
        onChange={handleChange}
        invalid={verify.isError}
        onResend={() => supabase.auth.resend({ type: 'signup', email })}
      />
      <FormError message={verify.error ? authErrorMessage(verify.error) : null} />
      <Link
        to="/signup"
        className="flex min-h-11 items-center self-center text-body-strong text-primary-text"
      >
        Change email
      </Link>
    </FormScreen>
  )
}

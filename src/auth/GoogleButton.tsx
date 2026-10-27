import { useMutation } from '@tanstack/react-query'

// Google's own "G" mark, kept as an asset: brand guidelines require its colors.
import googleMark from '@/assets/google-g.svg'
import { FormError } from '@/components/FormScreen'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

import { authErrorMessage, safeRedirect } from './errors'

type GoogleButtonProps = {
  label: string
  /** Where to land after Google sends the user back. */
  redirect?: string
}

/** "Continue with Google": leaves the app for Google and comes back signed in. */
export function GoogleButton({ label, redirect }: GoogleButtonProps) {
  const signIn = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}${safeRedirect(redirect)}` },
      })
      if (error) throw error
    },
  })

  return (
    <>
      <Button variant="secondary" loading={signIn.isPending} onClick={() => signIn.mutate()}>
        <img src={googleMark} alt="" width={22} height={22} />
        {label}
      </Button>
      <FormError message={signIn.error ? authErrorMessage(signIn.error) : null} />
    </>
  )
}

/** "or with email" divider under the Google button. */
export function OrWithEmail() {
  return (
    <div className="flex items-center gap-3 text-caption text-ink-subtle">
      <span className="h-px flex-1 bg-border" />
      or with email
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

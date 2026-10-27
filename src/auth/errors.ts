import { AuthError } from '@supabase/supabase-js'

/** Turns a Supabase auth error into a short message for the UI. */
export function authErrorMessage(error: unknown): string {
  if (error instanceof AuthError) {
    switch (error.code) {
      case 'invalid_credentials':
        return 'Wrong email or password.'
      case 'email_not_confirmed':
        return 'Confirm your email first.'
      case 'otp_expired':
        return 'This code is wrong or has expired. Request a new one.'
      case 'over_email_send_rate_limit':
      case 'over_request_rate_limit':
        return 'Too many attempts. Try again in a few minutes.'
      case 'weak_password':
        return 'Choose a stronger password (at least 8 characters).'
      case 'user_already_exists':
      case 'email_exists':
        return 'This email is already registered. Log in instead.'
      case 'same_password':
        return 'The new password must be different from the old one.'
    }
    return error.message
  }
  return 'Something went wrong. Check your connection and try again.'
}

/** Only same-origin paths are allowed as a post-login redirect. */
export function safeRedirect(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : '/today'
}

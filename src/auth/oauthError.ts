// When Google or Supabase turns down a sign-in, the error comes back in the URL of the page the
// user returns to, which then redirects to Log in and loses it. Keep it for Log in to show.

const KEY = 'dewly-oauth-error'
const PARAMS = ['error', 'error_code', 'error_description']

/** Runs once at startup: moves an OAuth error from the URL into session storage. */
export function captureOAuthError() {
  const search = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const description = search.get('error_description') ?? hash.get('error_description')
  if (!description) return
  try {
    sessionStorage.setItem(KEY, description)
  } catch {
    // Storage blocked: the message is lost, the sign-in screen still works.
  }
  for (const key of PARAMS) search.delete(key)
  const rest = search.toString()
  history.replaceState(null, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`)
}

/** The captured error, once. */
export function takeOAuthError() {
  try {
    const message = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    return message
  } catch {
    return null
  }
}

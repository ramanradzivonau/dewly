import { createRootRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 pt-7">
      <h1 className="text-title text-primary">Page not found</h1>
      <Link to="/today" className="text-label text-primary-text">
        Go to Today
      </Link>
    </main>
  )
}

import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { useCreateFertilizer } from '@/features/fertilizers/api'
import { FertilizerForm } from '@/features/fertilizers/FertilizerForm'

export const Route = createFileRoute('/_authed/fertilizers/new')({
  component: NewFertilizerScreen,
})

function NewFertilizerScreen() {
  const navigate = useNavigate()
  const create = useCreateFertilizer()

  return (
    <FertilizerForm
      title="New fertilizer"
      defaultValues={{ name: '', type: 'liquid' }}
      saving={create.isPending}
      error={create.error ? 'Couldn’t save the fertilizer. Try again.' : null}
      onSubmit={(values) =>
        create.mutate(values, { onSuccess: () => navigate({ to: '/profile', replace: true }) })
      }
    />
  )
}

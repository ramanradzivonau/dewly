import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { FormCard, FormError } from '@/components/FormScreen'
import { Button } from '@/components/ui/Button'
import {
  fertilizersQuery,
  useDeleteFertilizer,
  useUpdateFertilizer,
  type Fertilizer,
} from '@/features/fertilizers/api'
import { FertilizerForm } from '@/features/fertilizers/FertilizerForm'
import { PlantPhoto } from '@/features/plants/PlantPhoto'

export const Route = createFileRoute('/_authed/fertilizers/$fertilizerId')({
  loader: async ({ context, params }) => {
    const list = await context.queryClient.ensureQueryData(fertilizersQuery())
    if (!list.some((f) => f.id === params.fertilizerId)) throw notFound()
  },
  component: EditFertilizerScreen,
})

function EditFertilizerScreen() {
  const { fertilizerId } = Route.useParams()
  const navigate = useNavigate()
  const { data: list } = useSuspenseQuery(fertilizersQuery())
  const fertilizer = list.find((f) => f.id === fertilizerId)
  const update = useUpdateFertilizer(fertilizerId)
  if (!fertilizer) return null

  return (
    <FertilizerForm
      title={fertilizer.name}
      defaultValues={{ name: fertilizer.name, type: fertilizer.type, dose: fertilizer.dose }}
      saving={update.isPending}
      error={update.error ? 'Couldn’t save the fertilizer. Try again.' : null}
      onSubmit={(values) =>
        update.mutate(values, { onSuccess: () => navigate({ to: '/profile', replace: true }) })
      }
    >
      <UsedBy fertilizer={fertilizer} />
      <DeleteFertilizer fertilizer={fertilizer} />
    </FertilizerForm>
  )
}

const plantsOf = (f: Fertilizer) => f.plants.flatMap((p) => (p.plant ? [p.plant] : []))

function UsedBy({ fertilizer }: { fertilizer: Fertilizer }) {
  const plants = plantsOf(fertilizer)
  if (plants.length === 0) return null

  return (
    <FormCard>
      <h2 className="text-label text-primary">
        Used by {plants.length === 1 ? '1 plant' : `${plants.length} plants`}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {plants.map((plant) => (
          <li key={plant.id}>
            <Link
              to="/plants/$plantId"
              params={{ plantId: plant.id }}
              className="flex min-h-10 items-center gap-2 rounded-pill bg-bg py-1 pr-3.5 pl-1 text-field-label text-primary"
            >
              <PlantPhoto
                path={plant.cover_photo}
                alt=""
                iconSize={16}
                className="size-8 rounded-pill"
              />
              {plant.nickname}
            </Link>
          </li>
        ))}
      </ul>
    </FormCard>
  )
}

function DeleteFertilizer({ fertilizer }: { fertilizer: Fertilizer }) {
  const navigate = useNavigate()
  const remove = useDeleteFertilizer(fertilizer.id)
  const [confirming, setConfirming] = useState(false)
  const used = plantsOf(fertilizer).length

  return (
    <FormCard>
      {confirming && used > 0 && (
        <p className="text-caption text-ink-subtle">
          {used === 1 ? '1 plant' : `${used} plants`} will stop getting fertilizer reminders.
        </p>
      )}
      <FormError message={remove.error ? 'Couldn’t delete the fertilizer. Try again.' : null} />
      <Button
        variant="danger"
        loading={remove.isPending}
        onClick={() =>
          confirming
            ? remove.mutate(undefined, {
                onSuccess: () => navigate({ to: '/profile', replace: true }),
              })
            : setConfirming(true)
        }
      >
        {confirming ? 'Tap again to delete' : 'Delete fertilizer'}
      </Button>
    </FormCard>
  )
}

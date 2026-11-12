import { zodResolver } from '@hookform/resolvers/zod'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { FormCard, FormError, FormScreen } from '@/components/FormScreen'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { profileQuery, useUpdateProfile } from '@/features/profile/api'

export const Route = createFileRoute('/_authed/profile/name')({
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQuery(context.user.id)),
  component: NameScreen,
})

const schema = z.object({
  name: z.string().trim().min(1, 'What should we call you?').max(60, 'Keep it under 60 characters'),
})

function NameScreen() {
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  const { data: profile } = useSuspenseQuery(profileQuery(user.id))
  const save = useUpdateProfile(user.id)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: profile.display_name ?? '' },
  })

  return (
    <FormScreen
      back={{ to: '/profile', label: 'Back to Profile' }}
      title="Display name"
      subtitle="Used in the greeting on the Today screen."
      onSubmit={handleSubmit(({ name }) =>
        save.mutate(
          { display_name: name },
          { onSuccess: () => navigate({ to: '/profile', replace: true }) },
        ),
      )}
      bottomBar={
        <Button type="submit" loading={save.isPending}>
          Save
        </Button>
      }
    >
      <FormCard>
        <TextField
          label="Name"
          autoComplete="given-name"
          error={errors.name?.message}
          {...register('name')}
        />
      </FormCard>
      <FormError message={save.error ? 'Couldn’t save your name. Try again.' : null} />
    </FormScreen>
  )
}

import { useState } from 'react'

import { FormCard } from '@/components/FormScreen'

import type { SpeciesPick } from './api'
import { IdentifyStep } from './IdentifyStep'

type SpeciesFieldProps = {
  current: { scientific_name: string; common_name: string | null } | null
  picked: SpeciesPick | null
  onPick: (pick: SpeciesPick | null) => void
}

/** Edit plant: shows the species and opens the same identify-or-search picker as Add plant. */
export function SpeciesField({ current, picked, onPick }: SpeciesFieldProps) {
  const [open, setOpen] = useState(false)

  if (open || picked) {
    return (
      <>
        <IdentifyStep picked={picked} onPick={onPick} />
        {!picked && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-11 self-center text-label font-bold text-primary-text"
          >
            Keep {current ? 'the current species' : 'it unset'}
          </button>
        )}
      </>
    )
  }

  return (
    <FormCard>
      <h2 className="text-label text-primary">Species</h2>
      <p className="text-body text-ink">
        {current ? (
          <>
            <i>{current.scientific_name}</i>
            {current.common_name ? ` · ${current.common_name}` : null}
          </>
        ) : (
          <span className="text-ink-subtle">Not set yet</span>
        )}
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-9 self-start rounded-pill border-[1.5px] border-primary bg-surface px-3.5 text-caption font-bold text-primary"
      >
        {current ? 'Change species' : 'Add species'}
      </button>
    </FormCard>
  )
}

import { useMutation, useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'

import { FormCard } from '@/components/FormScreen'
import { CameraIcon, CheckIcon, ChevronRightIcon, LeafIcon } from '@/components/icons'
import { TextField } from '@/components/ui/TextField'
import { resizePhoto } from '@/features/plants/photos'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

import { identifyByPhoto, MIN_SPECIES_QUERY, speciesSearchQuery, type SpeciesPick } from './api'

type IdentifyStepProps = {
  picked: SpeciesPick | null
  onPick: (pick: SpeciesPick | null) => void
  /** The photo sent to Pl@ntNet; it becomes the cover unless the user replaces it. */
  onPhoto?: (photo: Blob) => void
}

/** "What plant is it?": identify by photo (Pl@ntNet) or search by name (iNaturalist). */
export function IdentifyStep({ picked, onPick, onPhoto }: IdentifyStepProps) {
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const term = useDebouncedValue(query.trim(), 300)
  const search = useQuery({
    ...speciesSearchQuery(term),
    enabled: !picked && term.length >= MIN_SPECIES_QUERY,
  })
  const identify = useMutation({
    mutationFn: async (file: File) => {
      const photo = await resizePhoto(file)
      onPhoto?.(photo)
      return identifyByPhoto(photo)
    },
  })

  if (picked) {
    return (
      <FormCard>
        <h2 className="text-label text-primary">Species</h2>
        <SpeciesRow pick={picked} selected />
        <button
          type="button"
          onClick={() => onPick(null)}
          className="min-h-11 self-start text-label font-bold text-primary-text"
        >
          Choose another
        </button>
      </FormCard>
    )
  }

  const candidates = identify.data
  const results = search.data ?? []

  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={identify.isPending}
        className="flex min-h-18 items-center gap-3.5 rounded-pill bg-primary px-4.5 text-left text-on-primary disabled:opacity-60"
      >
        <CameraIcon width={28} height={28} />
        <span className="flex flex-col gap-0.5">
          <span className="text-label font-bold">
            {identify.isPending ? 'Identifying…' : 'Identify by photo'}
          </span>
          <span className="text-caption font-medium text-primary-soft">
            Take a photo of the leaves
          </span>
        </span>
      </button>
      {/* iOS offers the camera or the photo library for image inputs. */}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) identify.mutate(file)
          e.target.value = ''
        }}
      />

      {identify.isError && (
        <p
          role="alert"
          className="rounded-md bg-danger-soft px-4 py-3 text-caption text-danger-strong"
        >
          Couldn’t identify the photo. Try again, or search by name.
        </p>
      )}
      {candidates && (
        <section aria-live="polite" className="flex flex-col gap-1">
          {candidates.length === 0 ? (
            <p className="rounded-md bg-surface p-4 text-body text-ink-subtle">
              No match. Try a closer photo of a leaf, or search by name.
            </p>
          ) : (
            <ul className="flex flex-col rounded-md border border-border bg-surface px-4 py-1">
              {candidates.map((c) => (
                <li key={c.scientific_name} className="border-b border-divider last:border-b-0">
                  <button type="button" onClick={() => onPick(c)} className="w-full text-left">
                    <SpeciesRow pick={c} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <span className="px-1 text-nav font-medium text-ink-subtle">
            Identified with Pl@ntNet
          </span>
        </section>
      )}

      <div className="flex items-center gap-3 text-caption text-ink-subtle">
        <span className="h-px flex-1 bg-border" />
        or search by name
        <span className="h-px flex-1 bg-border" />
      </div>

      <TextField
        label="Plant name"
        type="search"
        autoComplete="off"
        enterKeyHint="search"
        placeholder="e.g. monstera"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="bg-surface"
      />

      {term.length >= MIN_SPECIES_QUERY && (
        <section aria-live="polite" className="flex flex-col gap-1">
          {search.isPending && <p className="px-1 text-caption text-ink-subtle">Searching…</p>}
          {search.isError && (
            <p className="px-1 text-caption text-danger">
              Couldn’t search right now. Check your connection.
            </p>
          )}
          {search.isSuccess && results.length === 0 && (
            <p className="px-1 text-caption text-ink-subtle">Nothing found. Check the spelling.</p>
          )}
          {results.length > 0 && (
            <ul className="flex flex-col rounded-md border border-border bg-surface px-4 py-1">
              {results.map((r) => (
                <li
                  key={r.external_id ?? r.scientific_name}
                  className="border-b border-divider last:border-b-0"
                >
                  <button type="button" onClick={() => onPick(r)} className="w-full text-left">
                    <SpeciesRow pick={r} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <span className="px-1 text-nav font-medium text-ink-subtle">
            Photos and names from iNaturalist
          </span>
        </section>
      )}

      <p className="text-center text-caption font-medium text-ink-subtle">
        Not sure? You can add the species later in Edit plant.
      </p>
    </>
  )
}

function SpeciesRow({ pick, selected = false }: { pick: SpeciesPick; selected?: boolean }) {
  return (
    <span className="flex items-center gap-3 py-2.5">
      <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-leaf-tile text-primary-text">
        {pick.image_url ? (
          <img src={pick.image_url} alt="" className="size-full object-cover" />
        ) : (
          <LeafIcon />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-label font-bold text-ink italic">
          {pick.scientific_name}
        </span>
        {(pick.common_name || pick.score != null) && (
          <span className="truncate text-caption font-medium text-ink-subtle">
            {[
              pick.common_name,
              pick.score != null ? `${Math.round(pick.score * 100)}% match` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        )}
      </span>
      {selected ? (
        <CheckIcon width={20} height={20} className="text-primary" />
      ) : (
        <ChevronRightIcon width={18} height={18} className="text-ink-subtle" />
      )}
    </span>
  )
}

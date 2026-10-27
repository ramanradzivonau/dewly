import { useQuery } from '@tanstack/react-query'

import { LeafIcon } from '@/components/icons'

import { photoUrlQuery } from './photos'

type PlantPhotoProps = {
  /** Storage path of the photo; the leaf placeholder shows while there's none. */
  path: string | null
  /** A local preview (object URL) wins over the stored photo. */
  src?: string | null
  alt: string
  className?: string
  iconSize?: number
}

/** Plant cover from private storage via a signed URL, on the leaf-tile placeholder. */
export function PlantPhoto({ path, src, alt, className = '', iconSize = 24 }: PlantPhotoProps) {
  const url = useQuery({ ...photoUrlQuery(path ?? ''), enabled: !!path && !src }).data
  const shown = src ?? (path ? url : null)

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-leaf-tile text-primary-text ${className}`}
    >
      {shown ? (
        <img src={shown} alt={alt} className="size-full object-cover" />
      ) : (
        <LeafIcon
          width={iconSize}
          height={iconSize}
          role={alt ? 'img' : undefined}
          aria-label={alt || undefined}
          aria-hidden={alt ? undefined : true}
        />
      )}
    </span>
  )
}

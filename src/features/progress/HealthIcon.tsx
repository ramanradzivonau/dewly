import type { SVGProps } from 'react'

import type { Health } from './api'

const pot = 'M7 15h10l-1.2 6H8.2zM6 15h12'
const leaves =
  'M12 11c0-2 2-3.5 4.5-3.5 0 2-2 3.5-4.5 3.5zM12 12.5c0-2-2-3.5-4.5-3.5 0 2 2 3.5 4.5 3.5'

const paths: Record<Health, string> = {
  sick: 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM12 8v8M8 12h8',
  struggling: `${pot}M12 15v-4c0-2-1-3.5-4-4`,
  good: `${pot}M12 15V8${leaves}`,
  thriving: `${pot}M12 15V7${leaves}M14 4.5a2 2 0 1 1-4 0a2 2 0 1 1 4 0`,
}

/** Pot-and-plant pictogram for each health level, from the design canvas. */
export function HealthIcon({ health, ...props }: { health: Health } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={30}
      height={30}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d={paths[health]} />
    </svg>
  )
}

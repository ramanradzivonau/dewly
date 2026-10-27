import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

// 24px outline icons, round caps, currentColor: see Iconography in the design system.
const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </svg>
  )
}

export function LeafIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z" />
      <path d="M5 19l8-8" />
    </svg>
  )
}

export function PersonIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base} strokeWidth={2.2} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function EyeOffIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.7 8.5 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
    </svg>
  )
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} strokeWidth={2.2} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} strokeWidth={2.6} {...props}>
      <path d="M5 12l5 5 9-10" />
    </svg>
  )
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
    </svg>
  )
}

export function DropIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />
    </svg>
  )
}

export function CameraIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8h3l2-2h6l2 2h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 11l8-7 8 7v9H4z" />
    </svg>
  )
}

/** Two drops: soil still wet. */
export function WetIcon(props: IconProps) {
  return (
    <svg {...base} strokeWidth={1.7} {...props}>
      <path d="M8 4s4 4.5 4 7.5a4 4 0 0 1-8 0C4 8.5 8 4 8 4zM16 10s4 4.5 4 7.5a4 4 0 0 1-8 0c0-3 4-7.5 4-7.5z" />
    </svg>
  )
}

/** Crossed-out drop: soil very dry. */
export function DryIcon(props: IconProps) {
  return (
    <svg {...base} strokeWidth={1.7} {...props}>
      <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11zM4 4l16 16" />
    </svg>
  )
}

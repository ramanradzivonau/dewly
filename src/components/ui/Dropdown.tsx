import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

import { CheckIcon, ChevronDownIcon } from '../icons'

type Option = { value: string; label: string }

type DropdownProps = {
  label: string
  options: Option[]
  value: string
  onChange: (value: string) => void
  error?: string
}

/**
 * Labelled single-choice dropdown drawn with Dewly tokens instead of the system picker.
 * A button opens a listbox; arrows, Home/End, Enter/Space and Escape work from the keyboard.
 */
export function Dropdown({ label, options, value, onChange, error }: DropdownProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const selected = options.find((o) => o.value === value)
  const optionId = (i: number) => `${id}-option-${i}`

  // Close on a tap or click anywhere outside.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  useEffect(() => {
    if (open) list.current?.focus()
  }, [open])

  const show = () => {
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    )
    setOpen(true)
  }

  const pick = (i: number) => {
    const option = options[i]
    if (option) onChange(option.value)
    setOpen(false)
    button.current?.focus()
  }

  const onButtonKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      show()
    }
  }

  const onListKey = (e: KeyboardEvent) => {
    const last = options.length - 1
    const moves: Record<string, () => void> = {
      ArrowDown: () => setActive((i) => Math.min(last, i + 1)),
      ArrowUp: () => setActive((i) => Math.max(0, i - 1)),
      Home: () => setActive(0),
      End: () => setActive(last),
      Enter: () => pick(active),
      ' ': () => pick(active),
      Escape: () => {
        setOpen(false)
        button.current?.focus()
      },
      Tab: () => setOpen(false),
    }
    const move = moves[e.key]
    if (!move) return
    if (e.key !== 'Tab') e.preventDefault()
    move()
  }

  return (
    <div ref={root} className="relative flex flex-col gap-1.5">
      <span id={`${id}-label`} className="text-field-label text-ink">
        {label}
      </span>
      <button
        ref={button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-invalid={error ? true : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onButtonKey}
        className={`flex min-h-13 w-full items-center justify-between gap-3 rounded-md bg-bg pr-4 pl-4 text-left text-input text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary aria-invalid:ring-2 aria-invalid:ring-danger ${open ? 'ring-2 ring-primary' : ''}`}
      >
        <span id={`${id}-value`} className="truncate">
          {selected?.label ?? 'Choose…'}
        </span>
        <ChevronDownIcon
          width={20}
          height={20}
          className={`shrink-0 text-primary transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          ref={list}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={`${id}-label`}
          aria-activedescendant={optionId(active)}
          onKeyDown={onListKey}
          className="absolute inset-x-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-md border border-border bg-surface p-1.5 shadow-float outline-none"
        >
          {options.map((option, i) => {
            const isSelected = option.value === value
            return (
              <li
                key={option.value}
                id={optionId(i)}
                role="option"
                aria-selected={isSelected}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(i)}
                className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-sm px-3.5 text-input ${
                  isSelected ? 'bg-primary-soft font-bold text-primary' : 'text-ink'
                } ${i === active && !isSelected ? 'bg-bg' : ''}`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <CheckIcon width={18} height={18} className="shrink-0" />}
              </li>
            )
          })}
        </ul>
      )}

      {error && <p className="text-caption text-danger">{error}</p>}
    </div>
  )
}

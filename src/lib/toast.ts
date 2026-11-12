// A tiny toast store outside React, so any code (a mutation's onError) can raise one.

export type Toast = { id: number; message: string; tone: 'error' | 'info' }

const DURATION_MS = 4_000

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function toast(message: string, tone: Toast['tone'] = 'info') {
  const id = nextId++
  // The same message twice in a row shows once.
  toasts = [...toasts.filter((t) => t.message !== message), { id, message, tone }]
  emit()
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  }, DURATION_MS)
}

export const subscribeToasts = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const currentToasts = () => toasts

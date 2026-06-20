import type { PetMood } from './data'

export type PiCoreSignalKind = 'interaction' | 'work' | 'delegate' | 'confirm'

export type PiCoreSignalPayload = {
  kind: PiCoreSignalKind
  mood?: PetMood
  duration?: number
}

export function emitPiCoreSignal(kind: PiCoreSignalKind, detail: Omit<PiCoreSignalPayload, 'kind'> = {}) {
  window.dispatchEvent(new CustomEvent<PiCoreSignalPayload>('evopi:picore-signal', { detail: { kind, ...detail } }))
}

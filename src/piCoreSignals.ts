export type PiCoreSignalKind = 'interaction' | 'work' | 'delegate' | 'confirm'

export function emitPiCoreSignal(kind: PiCoreSignalKind) {
  window.dispatchEvent(new CustomEvent('evopi:picore-signal', { detail: { kind } }))
}

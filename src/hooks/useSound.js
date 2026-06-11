import { useSyncExternalStore } from 'react'
import { isMuted, subscribe, toggleMuted } from '../lib/sound'

// React binding for the shared sound engine's mute flag.
export function useMuted() {
  const muted = useSyncExternalStore(subscribe, isMuted, isMuted)
  return [muted, toggleMuted]
}

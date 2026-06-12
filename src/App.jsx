import MapVisualiser from './components/map/MapVisualiser'
import { useMuted } from './hooks/useSound'

export default function App() {
  const [muted, toggleMuted] = useMuted()

  return (
    <div className="flex h-full flex-col">
      <nav className="flex items-center justify-between gap-2 border-b border-edge bg-panel px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-lg font-bold">
            <span className="text-orange">Route</span>
            <span className="text-white">Vis</span>
          </span>
          <span className="hidden rounded-md border border-edge px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 md:inline">
            pathfinding on real roads · client-side only
          </span>
        </div>
        <button
          onClick={toggleMuted}
          title={muted ? 'Unmute sound' : 'Mute sound'}
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          className={`rounded-lg border px-2 py-1.5 font-mono text-sm transition-colors ${
            muted
              ? 'border-edge text-neutral-500 hover:text-neutral-300'
              : 'border-orange/50 bg-orange/10 text-orange'
          }`}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </nav>

      <main className="min-h-0 flex-1 p-3">
        <MapVisualiser />
      </main>
    </div>
  )
}

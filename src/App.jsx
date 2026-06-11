import { useState, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SortingVisualiser from './components/sorting/SortingVisualiser'
import GridVisualiser from './components/grid/GridVisualiser'
import { useMuted } from './hooks/useSound'

const MapVisualiser = lazy(() => import('./components/map/MapVisualiser'))

const MODULES = [
  { key: 'sorting', label: 'Sorting' },
  { key: 'grid', label: 'Pathfinding' },
  { key: 'map', label: 'Map' },
]

export default function App() {
  const [module, setModule] = useState('sorting')
  const [muted, toggleMuted] = useMuted()

  return (
    <div className="flex h-full flex-col">
      <nav className="flex items-center justify-between gap-2 border-b border-edge bg-panel px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-lg font-bold">
            <span className="text-orange">Algo</span>
            <span className="text-white">Vis</span>
          </span>
          <span className="hidden rounded-md border border-edge px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 md:inline">
            v0.1 · client-side only
          </span>
        </div>
        <div className="flex items-center gap-2">
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
          <div className="flex gap-1 rounded-lg border border-edge bg-bg p-1">
            {MODULES.map((m) => (
              <button
                key={m.key}
                onClick={() => setModule(m.key)}
                className="relative rounded-md px-2.5 py-1.5 font-mono text-xs transition-colors sm:px-3"
              >
                {module === m.key && (
                  <motion.span
                    layoutId="module-pill"
                    className="absolute inset-0 rounded-md bg-orange/15 ring-1 ring-orange/60"
                    transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                  />
                )}
                <span className={module === m.key ? 'relative text-orange' : 'relative text-neutral-400'}>
                  {m.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="min-h-0 flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={module}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            className="h-full"
          >
            {module === 'sorting' && <SortingVisualiser />}
            {module === 'grid' && <GridVisualiser />}
            {module === 'map' && (
              <Suspense
                fallback={
                  <div className="grid h-full place-items-center font-mono text-sm text-neutral-500">
                    loading map module…
                  </div>
                }
              >
                <MapVisualiser />
              </Suspense>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

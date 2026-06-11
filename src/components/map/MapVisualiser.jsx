import { useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMapEvents } from 'react-leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import { MAP_ALGORITHMS } from '../../algorithms/graphSearch'
import { useMapGraph } from '../../hooks/useMapGraph'
import ExplorationLayer from './ExplorationLayer'
import CompareMode from './CompareMode'

const KL_CENTER = [3.139, 101.6869]

function ClickHandler({ mode, onSet }) {
  useMapEvents({
    click(e) {
      onSet(mode, e.latlng)
    },
  })
  return null
}

export default function MapVisualiser() {
  const { start, setStart, end, setEnd, graph, setGraph, loading, error, loadGraph, reset } =
    useMapGraph()
  const [mode, setMode] = useState('start') // which marker next click sets
  const [algoKey, setAlgoKey] = useState('astar')
  const [speed, setSpeed] = useState(60)
  const [result, setResult] = useState(null)
  const [compare, setCompare] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(true)

  const [geoMsg, setGeoMsg] = useState(null)

  const handleSet = (m, latlng) => {
    if (m === 'start') {
      setStart(latlng)
      setMode('end')
    } else {
      setEnd(latlng)
      setMode('start')
    }
    setGraph(null) // markers moved — old road graph no longer matches
    setResult(null)
    setCompare(false)
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoMsg('Geolocation not supported by this browser.')
      return
    }
    setGeoMsg('Locating…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoMsg(null)
        handleSet('start', { lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      (err) => setGeoMsg(err.code === 1 ? 'Location permission denied.' : 'Could not get location.'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const algo = MAP_ALGORITHMS[algoKey]

  return (
    <div className="relative h-full overflow-hidden rounded-xl border border-edge">
      {compare && graph && start && end ? (
        <div className="h-full p-3">
          <CompareMode graph={graph} start={start} end={end} speed={speed} />
        </div>
      ) : (
        <MapContainer center={KL_CENTER} zoom={13} preferCanvas className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="dark-tiles"
          />
          <ClickHandler mode={mode} onSet={handleSet} />
          {start && (
            <CircleMarker
              center={[start.lat, start.lng]}
              radius={8}
              pathOptions={{ color: '#4ade80', fillColor: '#4ade80', fillOpacity: 0.9 }}
            >
              <Tooltip permanent direction="top" offset={[0, -8]}>
                START
              </Tooltip>
            </CircleMarker>
          )}
          {end && (
            <CircleMarker
              center={[end.lat, end.lng]}
              radius={8}
              pathOptions={{ color: '#f87171', fillColor: '#f87171', fillOpacity: 0.9 }}
            >
              <Tooltip permanent direction="top" offset={[0, -8]}>
                END
              </Tooltip>
            </CircleMarker>
          )}
          {graph && result && (
            <ExplorationLayer graph={graph} result={result} speed={speed} />
          )}
        </MapContainer>
      )}

      {/* floating control panel */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute left-3 top-3 z-[1000] w-[min(16rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] space-y-3 rounded-xl border border-edge bg-black/85 p-3 backdrop-blur"
      >
        <div className="flex gap-2">
          <button
            onClick={() => setMode('start')}
            className={`flex-1 rounded-lg border px-2 py-1.5 font-mono text-xs transition ${
              mode === 'start'
                ? 'border-neon-green bg-neon-green/10 text-neon-green'
                : 'border-edge text-neutral-400'
            }`}
          >
            ◉ Set Start
          </button>
          <button
            onClick={() => setMode('end')}
            className={`flex-1 rounded-lg border px-2 py-1.5 font-mono text-xs transition ${
              mode === 'end'
                ? 'border-neon-red bg-neon-red/10 text-neon-red'
                : 'border-edge text-neutral-400'
            }`}
          >
            ◉ Set End
          </button>
        </div>

        <button
          onClick={useMyLocation}
          className="w-full rounded-lg border border-orange/50 px-2 py-1.5 font-mono text-xs text-orange transition hover:bg-orange/10"
        >
          📍 Use My Location
        </button>
        {geoMsg && <p className="font-mono text-[10px] text-neutral-400">{geoMsg}</p>}

        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(MAP_ALGORITHMS).map(([k, a]) => (
            <button
              key={k}
              onClick={() => {
                setAlgoKey(k)
                setResult(null)
              }}
              className={`rounded-md border px-2 py-1.5 font-mono text-[11px] transition ${
                k === algoKey && !compare
                  ? 'border-orange bg-orange/10 text-orange'
                  : 'border-edge text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {a.name}
            </button>
          ))}
        </div>

        <div>
          <label className="flex justify-between font-mono text-[10px] text-neutral-400">
            <span>ANIM SPEED</span>
            <span className="text-orange">{speed}</span>
          </label>
          <input
            type="range"
            min="10"
            max="200"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <button
          onClick={async () => {
            if (!start || !end) return
            setResult(null)
            const g = graph ?? (await loadGraph(start, end))
            if (!g) return
            if (!compare) {
              setResult(MAP_ALGORITHMS[algoKey].fn(g, g.startId, g.endId))
            }
          }}
          disabled={!start || !end || loading}
          className="w-full rounded-lg bg-orange px-3 py-2 font-mono text-sm font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? '⟳ Fetching OSM roads…' : compare ? '▶ Run Compare' : '▶ Visualise Route'}
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setCompare((c) => !c)
              setResult(null)
            }}
            disabled={!graph}
            className={`flex-1 rounded-lg border px-2 py-1.5 font-mono text-xs transition disabled:opacity-40 ${
              compare
                ? 'border-orange bg-orange/10 text-orange'
                : 'border-edge text-neutral-300 hover:border-neutral-500'
            }`}
            title={graph ? '' : 'Fetch a route first'}
          >
            ⊞ Compare Mode
          </button>
          <button
            onClick={() => {
              reset()
              setResult(null)
              setCompare(false)
              setMode('start')
            }}
            className="rounded-lg border border-edge px-2 py-1.5 font-mono text-xs text-neutral-300 hover:border-neutral-500"
          >
            Reset
          </button>
        </div>

        {!start && (
          <p className="font-mono text-[10px] leading-relaxed text-neutral-500">
            Click the map to drop the START point, then the END point. Keep them under ~10 km
            apart — Overpass fetch stays fast.
          </p>
        )}
        {error && <p className="font-mono text-[10px] text-neon-red">⚠ {error}</p>}
      </motion.div>

      {/* stats drawer */}
      <AnimatePresence>
        {result && !compare && (
          <motion.div
            initial={{ x: 280, opacity: 0 }}
            animate={{ x: drawerOpen ? 0 : 240, opacity: 1 }}
            exit={{ x: 280, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 220 }}
            className="absolute right-0 top-3 z-[1000] flex"
          >
            <button
              onClick={() => setDrawerOpen((o) => !o)}
              className="h-10 self-start rounded-l-lg border border-r-0 border-edge bg-black/85 px-1.5 font-mono text-xs text-orange backdrop-blur"
            >
              {drawerOpen ? '›' : '‹'}
            </button>
            <div className="w-[min(15rem,calc(100vw-2rem))] space-y-2 rounded-bl-xl border border-edge bg-black/85 p-3 backdrop-blur">
              <div className="font-mono text-sm font-bold text-orange">{algo.name}</div>
              <p className="text-[11px] leading-relaxed text-neutral-400">{algo.description}</p>
              <div className="space-y-1 border-t border-edge pt-2 font-mono text-xs">
                <Stat label="nodes visited" value={result.nodesVisited} color="text-neon-amber" />
                <Stat
                  label="path length"
                  value={result.path.length ? `${(result.pathDist / 1000).toFixed(2)} km` : '—'}
                  color="text-orange"
                />
                <Stat label="time taken" value={`${result.timeMs.toFixed(2)} ms`} color="text-neon-green" />
                <Stat label="graph nodes" value={graph?.nodes.size ?? 0} color="text-neutral-400" />
              </div>
              {result.path.length === 0 && (
                <p className="font-mono text-[10px] text-neon-red">
                  ✗ No path found between snapped road nodes.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className={color}>{value}</span>
    </div>
  )
}

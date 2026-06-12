import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import { MAP_ALGORITHMS } from '../../algorithms/graphSearch'
import { useMapGraph } from '../../hooks/useMapGraph'
import ExplorationLayer from './ExplorationLayer'
import RaceLayer from './RaceLayer'
import SearchPanel from './SearchPanel'

const KL_CENTER = [3.139, 101.6869]

const dotIcon = (color) =>
  L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid #0f0f0f;box-shadow:0 0 8px ${color};cursor:grab"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
const START_ICON = dotIcon('#4ade80')
const END_ICON = dotIcon('#f87171')

function ClickHandler({ mode, onSet }) {
  useMapEvents({
    click(e) {
      onSet(mode, e.latlng)
    },
  })
  return null
}

// Flies to a point (geolocation / single search pick) or fits route bounds.
function Recenter({ fly, fit }) {
  const map = useMap()
  useEffect(() => {
    if (fly) map.flyTo([fly.lat, fly.lng], 15, { duration: 1.5 })
  }, [fly, map])
  useEffect(() => {
    if (fit) map.fitBounds(fit, { padding: [60, 60] })
  }, [fit, map])
  return null
}

function formatEta(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m ? `${m} min ${s}s` : `${s}s`
}

export default function MapVisualiser() {
  const { start, setStart, end, setEnd, graph, setGraph, loading, error, loadGraph, reset } =
    useMapGraph()
  const [mode, setMode] = useState('start') // which marker next click sets
  const [algoKey, setAlgoKey] = useState('astar')
  const [weight, setWeight] = useState('dist') // 'dist' = shortest, 'time' = fastest
  const [speed, setSpeed] = useState(60)
  const [result, setResult] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)
  const [geoMsg, setGeoMsg] = useState(null)
  const [flyTarget, setFlyTarget] = useState(null)
  const [fitTarget, setFitTarget] = useState(null)

  // race mode
  const [raceResults, setRaceResults] = useState(null)
  const [raceProg, setRaceProg] = useState(null)
  const [raceFinish, setRaceFinish] = useState([])
  // hover = transient (mouse over a line / panel name); pin = tap/click toggle.
  const [raceHover, setRaceHover] = useState(null)
  const [racePin, setRacePin] = useState(null)
  const raceFocus = raceHover ?? racePin

  const clearRuns = () => {
    setResult(null)
    setRaceResults(null)
    setRaceProg(null)
    setRaceFinish([])
    setRaceHover(null)
    setRacePin(null)
  }

  // Run the current algorithm between two explicit points (state may not have
  // committed yet, so they're passed in). Fetches the road graph if needed.
  const routeWith = async (s, e, key = algoKey, w = weight) => {
    clearRuns()
    const g = await loadGraph(s, e)
    if (!g) {
      setPanelOpen(true) // surface the error message even if the panel was folded
      return
    }
    setResult(MAP_ALGORITHMS[key].fn(g, g.startId, g.endId, { weight: w }))
    setPanelOpen(false) // auto-fold so the animation has the stage
    setFitTarget([
      [s.lat, s.lng],
      [e.lat, e.lng],
    ])
  }

  // Place a marker. autoroute=true (drag / search) re-routes immediately when
  // both points exist; plain map clicks stay manual via the ▶ button.
  const setPoint = (which, latlng, { autoroute = false, fly = false } = {}) => {
    const s = which === 'start' ? latlng : start
    const e = which === 'end' ? latlng : end
    if (which === 'start') {
      setStart(latlng)
      setMode('end')
    } else {
      setEnd(latlng)
      setMode('start')
    }
    setGraph(null) // markers moved — old road graph no longer matches
    clearRuns()
    if (fly && !(s && e)) setFlyTarget(latlng)
    if (autoroute && s && e) routeWith(s, e)
  }

  // Drop the START marker on the user's GPS position and recenter there.
  // `silent` (auto-detect on load) suppresses status/error chrome.
  const locate = (silent = false) => {
    if (!navigator.geolocation) {
      if (!silent) setGeoMsg('Geolocation not supported by this browser.')
      return
    }
    if (!silent) setGeoMsg('Locating…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoMsg(null)
        setPoint('start', { lat: pos.coords.latitude, lng: pos.coords.longitude }, { fly: true })
      },
      (err) => {
        if (!silent) setGeoMsg(err.code === 1 ? 'Location permission denied.' : 'Could not get location.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Auto-detect location on first open so the user lands at their position.
  useEffect(() => {
    locate(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runRace = async () => {
    if (!start || !end) return
    clearRuns()
    const g = graph ?? (await loadGraph(start, end))
    if (!g) {
      setPanelOpen(true)
      return
    }
    const res = {}
    for (const [k, a] of Object.entries(MAP_ALGORITHMS)) {
      res[k] = a.fn(g, g.startId, g.endId, { weight })
    }
    setRaceFinish([])
    setRaceProg(null)
    setRaceResults(res)
    setPanelOpen(false)
    setFitTarget([
      [start.lat, start.lng],
      [end.lat, end.lng],
    ])
  }

  // Switching metric reruns instantly — results are synchronous on a loaded graph.
  const switchWeight = (w) => {
    setWeight(w)
    if (graph && result) {
      setResult(MAP_ALGORITHMS[algoKey].fn(graph, graph.startId, graph.endId, { weight: w }))
    } else if (graph && raceResults) {
      const res = {}
      for (const [k, a] of Object.entries(MAP_ALGORITHMS)) {
        res[k] = a.fn(graph, graph.startId, graph.endId, { weight: w })
      }
      setRaceFinish([])
      setRaceProg(null)
      setRaceResults(res)
    }
  }

  const algo = MAP_ALGORITHMS[algoKey]
  const raceColors = Object.fromEntries(Object.entries(MAP_ALGORITHMS).map(([k, a]) => [k, a.color]))
  const raceDone = raceResults && raceFinish.length === Object.keys(raceResults).length

  const raceBadges = raceDone
    ? (() => {
        const entries = Object.entries(raceResults).filter(([, r]) => r.path.length > 0)
        if (!entries.length) return null
        const by = (sel) => entries.reduce((a, b) => (sel(a[1]) <= sel(b[1]) ? a : b))[0]
        return {
          winner: raceFinish[0],
          shortest: by((r) => r.pathDist),
          fastest: by((r) => r.pathTime),
          fewest: by((r) => r.nodesVisited),
        }
      })()
    : null

  return (
    <div className="relative h-full overflow-hidden rounded-xl border border-edge">
      <MapContainer center={KL_CENTER} zoom={13} preferCanvas className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
        />
        <ClickHandler mode={mode} onSet={(m, ll) => setPoint(m, ll)} />
        <Recenter fly={flyTarget} fit={fitTarget} />
        {start && (
          <Marker
            position={[start.lat, start.lng]}
            icon={START_ICON}
            draggable
            eventHandlers={{
              dragend: (e) => setPoint('start', e.target.getLatLng(), { autoroute: true }),
            }}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              START — drag me
            </Tooltip>
          </Marker>
        )}
        {end && (
          <Marker
            position={[end.lat, end.lng]}
            icon={END_ICON}
            draggable
            eventHandlers={{
              dragend: (e) => setPoint('end', e.target.getLatLng(), { autoroute: true }),
            }}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              END — drag me
            </Tooltip>
          </Marker>
        )}
        {graph && result && !raceResults && (
          <ExplorationLayer
            graph={graph}
            result={result}
            speed={speed}
            exploreColor={algo.color}
            pathColor="#fb923c"
          />
        )}
        {graph && raceResults && (
          <RaceLayer
            graph={graph}
            results={raceResults}
            colors={raceColors}
            speed={speed}
            focus={raceFocus}
            onHover={setRaceHover}
            onProgress={(p, fin) => {
              setRaceProg(p)
              setRaceFinish(fin)
            }}
            onDone={(fin) => setRaceFinish(fin)}
          />
        )}
      </MapContainer>

      {/* floating control panel — minimisable; auto-folds when a run starts */}
      <AnimatePresence>
        {!panelOpen && (
          <motion.button
            key="panel-pill"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPanelOpen(true)}
            title="Open controls"
            className="absolute left-3 top-3 z-[1000] rounded-xl border border-edge bg-black/85 px-3 py-2 font-mono text-sm text-orange backdrop-blur transition hover:bg-orange/10"
          >
            🧭 ☰
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
      {panelOpen && (
      <motion.div
        key="panel"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        className="absolute left-3 top-3 z-[1000] w-[min(17rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] space-y-3 rounded-xl border border-edge bg-black/85 p-3 backdrop-blur"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            route controls
          </span>
          <button
            onClick={() => setPanelOpen(false)}
            title="Minimise panel"
            className="rounded-md border border-edge px-1.5 font-mono text-xs leading-5 text-neutral-400 transition hover:border-orange/60 hover:text-orange"
          >
            —
          </button>
        </div>

        <SearchPanel
          onPickStart={(r) => setPoint('start', r, { autoroute: true, fly: true })}
          onPickEnd={(r) => setPoint('end', r, { autoroute: true, fly: true })}
        />

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
          onClick={() => locate(false)}
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
                k === algoKey && !raceResults
                  ? 'border-orange bg-orange/10 text-orange'
                  : 'border-edge text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ background: a.color }} />
              {a.name}
            </button>
          ))}
        </div>

        <div className="flex overflow-hidden rounded-lg border border-edge font-mono text-[11px]">
          <button
            onClick={() => switchWeight('dist')}
            className={`flex-1 px-2 py-1.5 transition ${
              weight === 'dist' ? 'bg-orange/15 text-orange' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            📏 Shortest
          </button>
          <button
            onClick={() => switchWeight('time')}
            className={`flex-1 border-l border-edge px-2 py-1.5 transition ${
              weight === 'time' ? 'bg-orange/15 text-orange' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            ⚡ Fastest
          </button>
        </div>
        {weight === 'time' && !algo.weighted && !raceResults && (
          <p className="font-mono text-[10px] text-neon-amber">
            ⚠ {algo.name} ignores road weights — pick Dijkstra or A* to see the fastest route.
          </p>
        )}

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
          onClick={() => start && end && routeWith(start, end)}
          disabled={!start || !end || loading}
          className="w-full rounded-lg bg-orange px-3 py-2 font-mono text-sm font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? '⟳ Fetching OSM roads…' : '▶ Visualise Route'}
        </button>

        <div className="flex gap-2">
          <button
            onClick={runRace}
            disabled={!start || !end || loading}
            className={`flex-1 rounded-lg border px-2 py-1.5 font-mono text-xs transition disabled:opacity-40 ${
              raceResults
                ? 'border-orange bg-orange/10 text-orange'
                : 'border-edge text-neutral-300 hover:border-neutral-500'
            }`}
          >
            🏁 Race All
          </button>
          <button
            onClick={() => {
              reset()
              clearRuns()
              setMode('start')
              setFitTarget(null)
            }}
            className="rounded-lg border border-edge px-2 py-1.5 font-mono text-xs text-neutral-300 hover:border-neutral-500"
          >
            Reset
          </button>
        </div>

        {!start && (
          <p className="font-mono text-[10px] leading-relaxed text-neutral-500">
            Search a place above, click the map, or hit 📍 — then set the END point. Keep them
            under ~10 km apart — Overpass fetch stays fast.
          </p>
        )}
        {error && <p className="font-mono text-[10px] text-neon-red">⚠ {error}</p>}
      </motion.div>
      )}
      </AnimatePresence>

      {/* race panel */}
      <AnimatePresence>
        {raceResults && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="absolute bottom-3 left-1/2 z-[1000] w-[min(34rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-xl border border-edge bg-black/85 p-3 backdrop-blur"
          >
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 sm:grid-cols-4">
              {Object.entries(raceResults).map(([k, r]) => {
                const prog = raceProg?.[k]
                const place = raceFinish.indexOf(k)
                const medal = ['🥇', '🥈', '🥉', '4️⃣'][place] ?? ''
                return (
                  <button
                    key={k}
                    onMouseEnter={() => setRaceHover(k)}
                    onMouseLeave={() => setRaceHover(null)}
                    onClick={() => setRacePin((p) => (p === k ? null : k))}
                    className={`rounded-md px-1.5 py-1 text-left font-mono text-[11px] transition ${
                      racePin === k
                        ? 'bg-white/10 ring-1 ring-orange/60'
                        : raceFocus === k
                          ? 'bg-white/5'
                          : ''
                    } ${raceFocus && raceFocus !== k ? 'opacity-40' : ''}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: raceColors[k] }} />
                      <span className="font-bold text-neutral-200">{MAP_ALGORITHMS[k].name}</span>
                      <span>{medal}</span>
                    </div>
                    <div className="text-neutral-500">
                      {prog ? `${prog.e}/${r.exploredEdges.length} edges` : 'starting…'}
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="mt-1.5 text-center font-mono text-[9px] text-neutral-600">
              hover / tap an algorithm to isolate its route
            </div>
            {raceBadges && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-edge pt-2 font-mono text-[10px]">
                <span className="text-orange">
                  🏁 {MAP_ALGORITHMS[raceBadges.winner].name} finished first
                </span>
                <span className="text-neon-green">
                  📏 shortest: {MAP_ALGORITHMS[raceBadges.shortest].name}
                </span>
                <span className="text-neon-amber">
                  ⚡ fastest ETA: {MAP_ALGORITHMS[raceBadges.fastest].name}
                </span>
                <span className="text-neon-purple">
                  🧠 fewest nodes: {MAP_ALGORITHMS[raceBadges.fewest].name}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* stats drawer (single run) */}
      <AnimatePresence>
        {result && !raceResults && (
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
              <div className="font-mono text-sm font-bold text-orange">
                {algo.name}
                <span className="ml-2 text-[10px] font-normal text-neutral-500">
                  {weight === 'time' ? 'fastest' : 'shortest'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-neutral-400">{algo.description}</p>
              <div className="space-y-1 border-t border-edge pt-2 font-mono text-xs">
                <Stat label="nodes visited" value={result.nodesVisited} color="text-neon-amber" />
                <Stat
                  label="distance"
                  value={result.path.length ? `${(result.pathDist / 1000).toFixed(2)} km` : '—'}
                  color="text-orange"
                />
                <Stat label="est. drive" value={formatEta(result.pathTime)} color="text-neon-green" />
                <Stat label="compute" value={`${result.timeMs.toFixed(2)} ms`} color="text-neutral-400" />
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

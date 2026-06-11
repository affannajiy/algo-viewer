import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet'
import { motion } from 'framer-motion'
import { MAP_ALGORITHMS } from '../../algorithms/graphSearch'
import ExplorationLayer from './ExplorationLayer'

const COLORS = {
  bfs: '#22d3ee',
  dfs: '#f472b6',
  dijkstra: '#a78bfa',
  astar: '#4ade80',
}

// Runs all 4 algorithms on the same graph, animates 4 mini maps side by side.
export default function CompareMode({ graph, start, end, speed }) {
  const [doneCount, setDoneCount] = useState(0)

  const results = useMemo(() => {
    if (!graph) return null
    const out = {}
    for (const [k, a] of Object.entries(MAP_ALGORITHMS)) {
      out[k] = a.fn(graph, graph.startId, graph.endId)
    }
    return out
  }, [graph])

  if (!graph || !results) return null

  const allDone = doneCount >= 4
  const withPath = Object.entries(results).filter(([, r]) => r.path.length > 0)
  const shortest = withPath.length
    ? withPath.reduce((a, b) => (a[1].pathDist <= b[1].pathDist ? a : b))[0]
    : null
  const fastest = Object.entries(results).reduce((a, b) => (a[1].timeMs <= b[1].timeMs ? a : b))[0]
  const fewest = Object.entries(results).reduce((a, b) =>
    a[1].nodesVisited <= b[1].nodesVisited ? a : b
  )[0]

  const center = [(start.lat + end.lat) / 2, (start.lng + end.lng) / 2]

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
        {Object.entries(MAP_ALGORITHMS).map(([k, a]) => {
          const r = results[k]
          return (
            <motion.div
              key={k}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative min-h-[200px] overflow-hidden rounded-xl border border-edge"
            >
              <MapContainer
                center={center}
                zoom={14}
                preferCanvas
                zoomControl={false}
                attributionControl={false}
                className="h-full w-full"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  className="dark-tiles"
                />
                <CircleMarker center={[start.lat, start.lng]} radius={6} pathOptions={{ color: '#4ade80', fillColor: '#4ade80', fillOpacity: 1 }} />
                <CircleMarker center={[end.lat, end.lng]} radius={6} pathOptions={{ color: '#f87171', fillColor: '#f87171', fillOpacity: 1 }} />
                <ExplorationLayer
                  graph={graph}
                  result={r}
                  speed={speed}
                  exploreColor={COLORS[k] + '66'}
                  pathColor={COLORS[k]}
                  onDone={() => setDoneCount((c) => c + 1)}
                />
              </MapContainer>
              <div className="absolute left-2 top-2 z-[1000] rounded-md bg-black/80 px-2 py-1 font-mono text-xs" style={{ color: COLORS[k] }}>
                {a.name}
                {allDone && (
                  <span className="ml-2 text-neutral-400">
                    {r.path.length ? `${(r.pathDist / 1000).toFixed(2)} km` : 'no path'} ·{' '}
                    {r.nodesVisited} nodes · {r.timeMs.toFixed(1)} ms
                  </span>
                )}
              </div>
              {allDone && (
                <div className="absolute bottom-2 left-2 z-[1000] flex gap-1.5 font-mono text-[10px]">
                  {k === shortest && <Badge color="#4ade80">🏆 shortest path</Badge>}
                  {k === fastest && <Badge color="#22d3ee">⚡ fastest run</Badge>}
                  {k === fewest && <Badge color="#fbbf24">🎯 fewest nodes</Badge>}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function Badge({ color, children }) {
  return (
    <span className="rounded-md bg-black/80 px-2 py-1" style={{ color }}>
      {children}
    </span>
  )
}

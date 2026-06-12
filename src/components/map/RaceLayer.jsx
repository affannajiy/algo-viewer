import { useEffect, useMemo, useRef, useState } from 'react'
import { Polyline } from 'react-leaflet'

// Race mode: animates several algorithms' explorations on the SAME map at the
// same reveal rate, so the one that explored fewer edges visibly finishes first.
// results: { algoKey: searchResult }, colors: { algoKey: cssColor }.
// onProgress (throttled) feeds the live counter panel; onDone gets finish order.
// focus: algoKey to isolate (others fade); onHover reports line mouseover/out.
export default function RaceLayer({
  graph,
  results,
  colors,
  speed = 60,
  focus = null,
  onHover,
  onProgress,
  onDone,
}) {
  const [progress, setProgress] = useState({}) // key -> { e, p }
  const timerRef = useRef(null)
  const onProgressRef = useRef(onProgress)
  const onDoneRef = useRef(onDone)
  onProgressRef.current = onProgress
  onDoneRef.current = onDone

  useEffect(() => {
    if (!results) return
    const keys = Object.keys(results)
    const state = Object.fromEntries(keys.map((k) => [k, { e: 0, p: 0 }]))
    const finished = []
    let tick = 0
    setProgress({ ...state })
    timerRef.current = setInterval(() => {
      let allDone = true
      for (const k of keys) {
        const r = results[k]
        const s = state[k]
        if (s.e < r.exploredEdges.length) {
          s.e = Math.min(s.e + Math.max(2, Math.round(speed / 2)), r.exploredEdges.length)
          allDone = false
        } else if (s.p < r.path.length) {
          s.p = Math.min(s.p + Math.max(1, Math.round(speed / 10)), r.path.length)
          allDone = false
        } else if (!finished.includes(k)) {
          finished.push(k)
        }
      }
      setProgress({ ...state })
      if (tick++ % 6 === 0) onProgressRef.current?.(structuredClone(state), [...finished])
      if (allDone) {
        clearInterval(timerRef.current)
        onProgressRef.current?.(structuredClone(state), [...finished])
        onDoneRef.current?.(finished)
      }
    }, 16)
    return () => clearInterval(timerRef.current)
  }, [results, speed])

  const layers = useMemo(() => {
    if (!results || !graph) return []
    return Object.entries(results).map(([k, r]) => {
      const s = progress[k] ?? { e: 0, p: 0 }
      const explored = r.exploredEdges.slice(0, s.e).map(([a, b]) => {
        const na = graph.nodes.get(a)
        const nb = graph.nodes.get(b)
        return [
          [na.lat, na.lon],
          [nb.lat, nb.lon],
        ]
      })
      const path = r.path.slice(0, s.p).map((id) => {
        const n = graph.nodes.get(id)
        return [n.lat, n.lon]
      })
      return { k, explored, path, color: colors[k] }
    })
  }, [results, graph, progress, colors])

  const hoverHandlers = (k) => ({
    mouseover: () => onHover?.(k),
    mouseout: () => onHover?.(null),
  })

  return (
    <>
      {layers.map(
        ({ k, explored, color }) =>
          explored.length > 0 && (
            <Polyline
              key={`e-${k}`}
              positions={explored}
              pathOptions={{
                color,
                weight: 2,
                opacity: focus ? (focus === k ? 0.55 : 0.05) : 0.3,
              }}
              eventHandlers={hoverHandlers(k)}
            />
          )
      )}
      {layers.map(
        ({ k, path, color }) =>
          path.length > 1 && (
            <Polyline
              key={`p-${k}`}
              positions={path}
              pathOptions={{
                color,
                weight: focus === k ? 7 : 5,
                opacity: focus ? (focus === k ? 1 : 0.12) : 0.95,
              }}
              eventHandlers={hoverHandlers(k)}
            />
          )
      )}
    </>
  )
}

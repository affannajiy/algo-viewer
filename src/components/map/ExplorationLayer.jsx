import { useEffect, useMemo, useRef, useState } from 'react'
import { Polyline } from 'react-leaflet'

// Animates explored edges then the final path on a Leaflet map.
// One multi-polyline for explored edges (cheap), one for the path.
export default function ExplorationLayer({ graph, result, speed = 60, exploreColor = '#a78bfa', pathColor = '#22d3ee', onDone }) {
  const [exploredCount, setExploredCount] = useState(0)
  const [pathProgress, setPathProgress] = useState(0)
  const timerRef = useRef(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    setExploredCount(0)
    setPathProgress(0)
    if (!result) return
    const total = result.exploredEdges.length
    const pathTotal = result.path.length
    let e = 0
    let p = 0
    timerRef.current = setInterval(() => {
      if (e < total) {
        e = Math.min(e + Math.max(2, Math.round(speed / 2)), total)
        setExploredCount(e)
      } else if (p < pathTotal) {
        p = Math.min(p + Math.max(1, Math.round(speed / 10)), pathTotal)
        setPathProgress(p)
      } else {
        clearInterval(timerRef.current)
        onDoneRef.current?.()
      }
    }, 16)
    return () => clearInterval(timerRef.current)
  }, [result, speed])

  const exploredSegments = useMemo(() => {
    if (!result || !graph) return []
    return result.exploredEdges.slice(0, exploredCount).map(([a, b]) => {
      const na = graph.nodes.get(a)
      const nb = graph.nodes.get(b)
      return [
        [na.lat, na.lon],
        [nb.lat, nb.lon],
      ]
    })
  }, [result, graph, exploredCount])

  const pathPositions = useMemo(() => {
    if (!result || !graph) return []
    return result.path.slice(0, pathProgress).map((id) => {
      const n = graph.nodes.get(id)
      return [n.lat, n.lon]
    })
  }, [result, graph, pathProgress])

  return (
    <>
      {exploredSegments.length > 0 && (
        <Polyline positions={exploredSegments} pathOptions={{ color: exploreColor, weight: 2, opacity: 0.45 }} />
      )}
      {pathPositions.length > 1 && (
        <Polyline positions={pathPositions} pathOptions={{ color: pathColor, weight: 5, opacity: 0.95 }} />
      )}
    </>
  )
}

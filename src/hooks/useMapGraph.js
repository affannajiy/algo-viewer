import { useCallback, useRef, useState } from 'react'
import { fetchRoadGraph, nearestNode } from '../lib/overpass'

// Owns start/end markers and the OSM road graph for their bounding box.
export function useMapGraph() {
  const [start, setStart] = useState(null) // {lat, lng}
  const [end, setEnd] = useState(null)
  const [graph, setGraph] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const loadGraph = useCallback(async (s, e) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)
    setGraph(null)
    try {
      const g = await fetchRoadGraph(s, e, controller.signal)
      if (g.nodes.size === 0) throw new Error('No roads found in this area.')
      const startId = nearestNode(g, s)
      const endId = nearestNode(g, e)
      const enriched = { ...g, startId, endId }
      setGraph(enriched)
      return enriched
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setStart(null)
    setEnd(null)
    setGraph(null)
    setError(null)
    setLoading(false)
  }, [])

  return { start, setStart, end, setEnd, graph, setGraph, loading, error, loadGraph, reset }
}

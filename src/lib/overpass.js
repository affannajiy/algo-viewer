// Fetch real road network from OpenStreetMap via Overpass API and build a graph.
// No API key, public endpoints, client-side only.

import { haversine } from '../algorithms/graphSearch'

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

// Roads only — skip footpaths/service alleys to keep graph small and routable.
const HIGHWAY_FILTER =
  'motorway|trunk|primary|secondary|tertiary|unclassified|residential|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link|living_street'

// Typical urban speeds (km/h) per highway type — powers "Fastest" routing.
const SPEED_KMH = {
  motorway: 100,
  motorway_link: 60,
  trunk: 80,
  trunk_link: 50,
  primary: 60,
  primary_link: 40,
  secondary: 50,
  secondary_link: 40,
  tertiary: 40,
  tertiary_link: 35,
  unclassified: 40,
  residential: 30,
  living_street: 15,
}
const DEFAULT_KMH = 40

export function boundingBox(a, b, padDeg = 0.005) {
  return {
    south: Math.min(a.lat, b.lat) - padDeg,
    west: Math.min(a.lng, b.lng) - padDeg,
    north: Math.max(a.lat, b.lat) + padDeg,
    east: Math.max(a.lng, b.lng) + padDeg,
  }
}

export async function fetchRoadGraph(start, end, signal) {
  const bbox = boundingBox(start, end)
  const area = (bbox.north - bbox.south) * (bbox.east - bbox.west)
  if (area > 0.02) {
    throw new Error('Area too large — pick points closer together (under ~10 km apart).')
  }
  const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`
  const query = `
    [out:json][timeout:30];
    way["highway"~"^(${HIGHWAY_FILTER})$"](${bboxStr});
    (._;>;);
    out body;
  `
  let lastErr
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        signal,
      })
      if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)
      const data = await res.json()
      return buildGraph(data.elements)
    } catch (e) {
      if (e.name === 'AbortError') throw e
      lastErr = e
    }
  }
  throw lastErr ?? new Error('Overpass fetch failed')
}

function buildGraph(elements) {
  const nodes = new Map()
  const adj = new Map()
  for (const el of elements) {
    if (el.type === 'node') nodes.set(el.id, { lat: el.lat, lon: el.lon })
  }
  const addEdge = (a, b, kmh) => {
    const d = haversine(nodes.get(a), nodes.get(b))
    const t = d / (kmh / 3.6) // seconds at this road's typical speed
    if (!adj.has(a)) adj.set(a, [])
    if (!adj.has(b)) adj.set(b, [])
    adj.get(a).push({ to: b, dist: d, time: t })
    adj.get(b).push({ to: a, dist: d, time: t }) // treat all roads as bidirectional for visualisation
  }
  for (const el of elements) {
    if (el.type !== 'way' || !el.nodes) continue
    const kmh = SPEED_KMH[el.tags?.highway] ?? DEFAULT_KMH
    for (let i = 1; i < el.nodes.length; i++) {
      const a = el.nodes[i - 1]
      const b = el.nodes[i]
      if (nodes.has(a) && nodes.has(b)) addEdge(a, b, kmh)
    }
  }
  // keep only largest connected component so start/end snap to routable nodes
  const component = largestComponent(adj)
  const prunedNodes = new Map()
  const prunedAdj = new Map()
  for (const id of component) {
    prunedNodes.set(id, nodes.get(id))
    prunedAdj.set(id, adj.get(id))
  }
  return { nodes: prunedNodes, adj: prunedAdj }
}

function largestComponent(adj) {
  const seen = new Set()
  let best = []
  for (const startId of adj.keys()) {
    if (seen.has(startId)) continue
    const comp = []
    const stack = [startId]
    seen.add(startId)
    while (stack.length) {
      const cur = stack.pop()
      comp.push(cur)
      for (const { to } of adj.get(cur) ?? []) {
        if (!seen.has(to)) {
          seen.add(to)
          stack.push(to)
        }
      }
    }
    if (comp.length > best.length) best = comp
  }
  return best
}

export function nearestNode(graph, latlng) {
  let bestId = null
  let bestDist = Infinity
  for (const [id, n] of graph.nodes) {
    const d = haversine({ lat: latlng.lat, lon: latlng.lng }, n)
    if (d < bestDist) {
      bestDist = d
      bestId = id
    }
  }
  return bestId
}

// Pure graph search over an OSM road graph.
// Graph shape: { nodes: Map<id, {lat, lon}>, adj: Map<id, Array<{to, dist, time}>> }
// dist in metres, time in seconds (road-type speed). Each algorithm returns:
// { exploredEdges: [[fromId, toId]], path: [nodeId], pathDist: metres, pathTime: seconds, nodesVisited, timeMs }
// Weighted algorithms (Dijkstra, A*) take opts.weight: 'dist' (shortest) | 'time' (fastest).

export function haversine(a, b) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

class MinHeap {
  constructor() {
    this.h = []
  }
  push(p, v) {
    this.h.push([p, v])
    let i = this.h.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.h[parent][0] <= this.h[i][0]) break
      ;[this.h[parent], this.h[i]] = [this.h[i], this.h[parent]]
      i = parent
    }
  }
  pop() {
    const top = this.h[0]
    const last = this.h.pop()
    if (this.h.length) {
      this.h[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = 2 * i + 2
        let m = i
        if (l < this.h.length && this.h[l][0] < this.h[m][0]) m = l
        if (r < this.h.length && this.h[r][0] < this.h[m][0]) m = r
        if (m === i) break
        ;[this.h[m], this.h[i]] = [this.h[i], this.h[m]]
        i = m
      }
    }
    return top
  }
  get size() {
    return this.h.length
  }
}

function reconstruct(cameFrom, graph, endId) {
  const path = []
  let cur = endId
  while (cur !== undefined) {
    path.unshift(cur)
    cur = cameFrom.get(cur)
  }
  let dist = 0
  let time = 0
  for (let i = 1; i < path.length; i++) {
    const edge = (graph.adj.get(path[i - 1]) ?? []).find((e) => e.to === path[i])
    dist += edge ? edge.dist : haversine(graph.nodes.get(path[i - 1]), graph.nodes.get(path[i]))
    time += edge?.time ?? 0
  }
  return { path, dist, time }
}

function result(exploredEdges, cameFrom, graph, endId, found, t0) {
  const timeMs = performance.now() - t0
  if (!found)
    return { exploredEdges, path: [], pathDist: 0, pathTime: 0, nodesVisited: exploredEdges.length, timeMs }
  const { path, dist, time } = reconstruct(cameFrom, graph, endId)
  return { exploredEdges, path, pathDist: dist, pathTime: time, nodesVisited: exploredEdges.length, timeMs }
}

export function graphBfs(graph, startId, endId) {
  const t0 = performance.now()
  const exploredEdges = []
  const visited = new Set([startId])
  const cameFrom = new Map()
  const queue = [startId]
  while (queue.length) {
    const cur = queue.shift()
    if (cur === endId) return result(exploredEdges, cameFrom, graph, endId, true, t0)
    for (const { to } of graph.adj.get(cur) ?? []) {
      if (!visited.has(to)) {
        visited.add(to)
        cameFrom.set(to, cur)
        exploredEdges.push([cur, to])
        queue.push(to)
      }
    }
  }
  return result(exploredEdges, cameFrom, graph, endId, false, t0)
}

export function graphDfs(graph, startId, endId) {
  const t0 = performance.now()
  const exploredEdges = []
  const visited = new Set()
  const cameFrom = new Map()
  const stack = [startId]
  while (stack.length) {
    const cur = stack.pop()
    if (visited.has(cur)) continue
    visited.add(cur)
    if (cameFrom.has(cur)) exploredEdges.push([cameFrom.get(cur), cur])
    if (cur === endId) return result(exploredEdges, cameFrom, graph, endId, true, t0)
    for (const { to } of graph.adj.get(cur) ?? []) {
      if (!visited.has(to)) {
        cameFrom.set(to, cur)
        stack.push(to)
      }
    }
  }
  return result(exploredEdges, cameFrom, graph, endId, false, t0)
}

export function graphDijkstra(graph, startId, endId, { weight = 'dist' } = {}) {
  const t0 = performance.now()
  const exploredEdges = []
  const dist = new Map([[startId, 0]])
  const cameFrom = new Map()
  const done = new Set()
  const heap = new MinHeap()
  heap.push(0, startId)
  while (heap.size) {
    const [d, cur] = heap.pop()
    if (done.has(cur)) continue
    done.add(cur)
    if (cameFrom.has(cur)) exploredEdges.push([cameFrom.get(cur), cur])
    if (cur === endId) return result(exploredEdges, cameFrom, graph, endId, true, t0)
    for (const e of graph.adj.get(cur) ?? []) {
      const nd = d + e[weight]
      if (nd < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, nd)
        cameFrom.set(e.to, cur)
        heap.push(nd, e.to)
      }
    }
  }
  return result(exploredEdges, cameFrom, graph, endId, false, t0)
}

// Fastest legal speed in the network (m/s) — keeps the time heuristic admissible.
const MAX_SPEED_MS = 100 / 3.6

export function graphAstar(graph, startId, endId, { weight = 'dist' } = {}) {
  const t0 = performance.now()
  const endNode = graph.nodes.get(endId)
  const h =
    weight === 'time'
      ? (id) => haversine(graph.nodes.get(id), endNode) / MAX_SPEED_MS
      : (id) => haversine(graph.nodes.get(id), endNode)
  const exploredEdges = []
  const g = new Map([[startId, 0]])
  const cameFrom = new Map()
  const done = new Set()
  const heap = new MinHeap()
  heap.push(h(startId), startId)
  while (heap.size) {
    const [, cur] = heap.pop()
    if (done.has(cur)) continue
    done.add(cur)
    if (cameFrom.has(cur)) exploredEdges.push([cameFrom.get(cur), cur])
    if (cur === endId) return result(exploredEdges, cameFrom, graph, endId, true, t0)
    for (const e of graph.adj.get(cur) ?? []) {
      const ng = g.get(cur) + e[weight]
      if (ng < (g.get(e.to) ?? Infinity)) {
        g.set(e.to, ng)
        cameFrom.set(e.to, cur)
        heap.push(ng + h(e.to), e.to)
      }
    }
  }
  return result(exploredEdges, cameFrom, graph, endId, false, t0)
}

export const MAP_ALGORITHMS = {
  bfs: {
    name: 'BFS',
    fn: graphBfs,
    weighted: false,
    color: '#22d3ee',
    description:
      'Breadth-first search. Ignores road lengths — finds fewest intersections, not shortest distance.',
  },
  dfs: {
    name: 'DFS',
    fn: graphDfs,
    weighted: false,
    color: '#f472b6',
    description:
      'Depth-first search. Wanders deep along roads before backtracking. Path usually far from optimal.',
  },
  dijkstra: {
    name: 'Dijkstra',
    fn: graphDijkstra,
    weighted: true,
    color: '#a78bfa',
    description:
      'Expands by true road cost. Guaranteed optimal route, but explores in all directions.',
  },
  astar: {
    name: 'A*',
    fn: graphAstar,
    weighted: true,
    color: '#fbbf24',
    description:
      'Dijkstra guided by straight-line distance to the goal. Optimal route with far less exploration.',
  },
}

// Pure graph search over an OSM road graph.
// Graph shape: { nodes: Map<id, {lat, lon}>, adj: Map<id, Array<{to, dist}>> }
// dist in metres. Each algorithm returns:
// { exploredEdges: [[fromId, toId]], path: [nodeId], pathDist: metres, nodesVisited, timeMs }

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
  for (let i = 1; i < path.length; i++) {
    dist += haversine(graph.nodes.get(path[i - 1]), graph.nodes.get(path[i]))
  }
  return { path, dist }
}

function result(exploredEdges, cameFrom, graph, endId, found, t0) {
  const timeMs = performance.now() - t0
  if (!found) return { exploredEdges, path: [], pathDist: 0, nodesVisited: exploredEdges.length, timeMs }
  const { path, dist } = reconstruct(cameFrom, graph, endId)
  return { exploredEdges, path, pathDist: dist, nodesVisited: exploredEdges.length, timeMs }
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

export function graphDijkstra(graph, startId, endId) {
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
    for (const { to, dist: w } of graph.adj.get(cur) ?? []) {
      const nd = d + w
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd)
        cameFrom.set(to, cur)
        heap.push(nd, to)
      }
    }
  }
  return result(exploredEdges, cameFrom, graph, endId, false, t0)
}

export function graphAstar(graph, startId, endId) {
  const t0 = performance.now()
  const endNode = graph.nodes.get(endId)
  const h = (id) => haversine(graph.nodes.get(id), endNode)
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
    for (const { to, dist: w } of graph.adj.get(cur) ?? []) {
      const ng = g.get(cur) + w
      if (ng < (g.get(to) ?? Infinity)) {
        g.set(to, ng)
        cameFrom.set(to, cur)
        heap.push(ng + h(to), to)
      }
    }
  }
  return result(exploredEdges, cameFrom, graph, endId, false, t0)
}

export const MAP_ALGORITHMS = {
  bfs: {
    name: 'BFS',
    fn: graphBfs,
    description:
      'Breadth-first search. Ignores road lengths — finds fewest intersections, not shortest distance.',
  },
  dfs: {
    name: 'DFS',
    fn: graphDfs,
    description:
      'Depth-first search. Wanders deep along roads before backtracking. Path usually far from optimal.',
  },
  dijkstra: {
    name: 'Dijkstra',
    fn: graphDijkstra,
    description:
      'Expands by true road distance. Guaranteed shortest route, but explores in all directions.',
  },
  astar: {
    name: 'A*',
    fn: graphAstar,
    description:
      'Dijkstra guided by straight-line distance to the goal. Shortest route with far less exploration.',
  },
}

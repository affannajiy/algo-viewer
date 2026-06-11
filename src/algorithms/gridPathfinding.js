// Pure grid pathfinding. Grid = 2D array of cells { row, col, isWall }.
// Each algorithm returns { visitedOrder: [{row,col}], path: [{row,col}] }.
// Animation replays visitedOrder then path — no live mutation.

const key = (r, c) => `${r},${c}`

function neighbors(grid, r, c) {
  const out = []
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]
  for (const [dr, dc] of dirs) {
    const nr = r + dr
    const nc = c + dc
    if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length && !grid[nr][nc].isWall) {
      out.push([nr, nc])
    }
  }
  return out
}

function buildPath(cameFrom, end) {
  const path = []
  let cur = key(end.row, end.col)
  while (cur) {
    const [r, c] = cur.split(',').map(Number)
    path.unshift({ row: r, col: c })
    cur = cameFrom.get(cur)
  }
  return path
}

export function bfs(grid, start, end) {
  const visitedOrder = []
  const visited = new Set([key(start.row, start.col)])
  const cameFrom = new Map()
  const queue = [[start.row, start.col]]
  while (queue.length) {
    const [r, c] = queue.shift()
    visitedOrder.push({ row: r, col: c })
    if (r === end.row && c === end.col) return { visitedOrder, path: buildPath(cameFrom, end) }
    for (const [nr, nc] of neighbors(grid, r, c)) {
      const k = key(nr, nc)
      if (!visited.has(k)) {
        visited.add(k)
        cameFrom.set(k, key(r, c))
        queue.push([nr, nc])
      }
    }
  }
  return { visitedOrder, path: [] }
}

export function dfs(grid, start, end) {
  const visitedOrder = []
  const visited = new Set()
  const cameFrom = new Map()
  const stack = [[start.row, start.col]]
  while (stack.length) {
    const [r, c] = stack.pop()
    const k = key(r, c)
    if (visited.has(k)) continue
    visited.add(k)
    visitedOrder.push({ row: r, col: c })
    if (r === end.row && c === end.col) return { visitedOrder, path: buildPath(cameFrom, end) }
    for (const [nr, nc] of neighbors(grid, r, c)) {
      const nk = key(nr, nc)
      if (!visited.has(nk)) {
        cameFrom.set(nk, k)
        stack.push([nr, nc])
      }
    }
  }
  return { visitedOrder, path: [] }
}

// Simple binary min-heap on [priority, payload]
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

export function dijkstra(grid, start, end) {
  const visitedOrder = []
  const dist = new Map([[key(start.row, start.col), 0]])
  const cameFrom = new Map()
  const done = new Set()
  const heap = new MinHeap()
  heap.push(0, [start.row, start.col])
  while (heap.size) {
    const [d, [r, c]] = heap.pop()
    const k = key(r, c)
    if (done.has(k)) continue
    done.add(k)
    visitedOrder.push({ row: r, col: c })
    if (r === end.row && c === end.col) return { visitedOrder, path: buildPath(cameFrom, end) }
    for (const [nr, nc] of neighbors(grid, r, c)) {
      const nk = key(nr, nc)
      const nd = d + 1
      if (nd < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, nd)
        cameFrom.set(nk, k)
        heap.push(nd, [nr, nc])
      }
    }
  }
  return { visitedOrder, path: [] }
}

export function astar(grid, start, end) {
  const manhattan = (r, c) => Math.abs(r - end.row) + Math.abs(c - end.col)
  const visitedOrder = []
  const g = new Map([[key(start.row, start.col), 0]])
  const cameFrom = new Map()
  const done = new Set()
  const heap = new MinHeap()
  heap.push(manhattan(start.row, start.col), [start.row, start.col])
  while (heap.size) {
    const [, [r, c]] = heap.pop()
    const k = key(r, c)
    if (done.has(k)) continue
    done.add(k)
    visitedOrder.push({ row: r, col: c })
    if (r === end.row && c === end.col) return { visitedOrder, path: buildPath(cameFrom, end) }
    for (const [nr, nc] of neighbors(grid, r, c)) {
      const nk = key(nr, nc)
      const ng = g.get(k) + 1
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng)
        cameFrom.set(nk, k)
        heap.push(ng + manhattan(nr, nc), [nr, nc])
      }
    }
  }
  return { visitedOrder, path: [] }
}

export const GRID_ALGORITHMS = {
  bfs: {
    name: 'BFS',
    fn: bfs,
    weighted: false,
    guaranteesShortest: true,
    description: 'Breadth-first search. Explores level by level — guarantees shortest path on unweighted grids.',
  },
  dfs: {
    name: 'DFS',
    fn: dfs,
    weighted: false,
    guaranteesShortest: false,
    description: 'Depth-first search. Dives deep before backtracking — does NOT guarantee shortest path.',
  },
  dijkstra: {
    name: 'Dijkstra',
    fn: dijkstra,
    weighted: true,
    guaranteesShortest: true,
    description: 'Expands the node with smallest known distance. Optimal for weighted graphs; equals BFS on uniform grids.',
  },
  astar: {
    name: 'A*',
    fn: astar,
    weighted: true,
    guaranteesShortest: true,
    description: 'Dijkstra + Manhattan-distance heuristic. Steers the search toward the goal — usually visits far fewer nodes.',
  },
}

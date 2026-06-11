// Recursive-backtracking maze generator.
// Returns a Set of "r,c" wall keys for a grid of given size.
// Carves passages on odd cells; everything else starts as wall.

export function generateMaze(rows, cols, start, end) {
  const walls = new Set()
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) walls.add(`${r},${c}`)
  }

  const carve = (r, c) => walls.delete(`${r},${c}`)
  const inBounds = (r, c) => r > 0 && r < rows - 1 && c > 0 && c < cols - 1

  // start carving from an odd cell
  const sr = 1
  const sc = 1
  carve(sr, sc)
  const stack = [[sr, sc]]
  const visited = new Set([`${sr},${sc}`])

  while (stack.length) {
    const [r, c] = stack[stack.length - 1]
    const dirs = [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ].sort(() => Math.random() - 0.5)
    let moved = false
    for (const [dr, dc] of dirs) {
      const nr = r + dr
      const nc = c + dc
      if (inBounds(nr, nc) && !visited.has(`${nr},${nc}`)) {
        visited.add(`${nr},${nc}`)
        carve(r + dr / 2, c + dc / 2)
        carve(nr, nc)
        stack.push([nr, nc])
        moved = true
        break
      }
    }
    if (!moved) stack.pop()
  }

  // keep start/end and their immediate surroundings open
  for (const p of [start, end]) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        walls.delete(`${p.row + dr},${p.col + dc}`)
      }
    }
  }
  return walls
}

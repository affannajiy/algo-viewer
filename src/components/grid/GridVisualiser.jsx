import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GRID_ALGORITHMS } from '../../algorithms/gridPathfinding'
import { generateMaze } from '../../algorithms/maze'
import { blip, noteFromRatio } from '../../lib/sound'

const ROWS = 25
const COLS = 45

export default function GridVisualiser() {
  const [walls, setWalls] = useState(() => new Set())
  const [start, setStart] = useState({ row: 12, col: 8 })
  const [end, setEnd] = useState({ row: 12, col: 36 })
  const [algoKey, setAlgoKey] = useState('bfs')
  const [speed, setSpeed] = useState(60)
  const [cellStates, setCellStates] = useState(() => new Map()) // "r,c" -> visited|frontier|path
  const [running, setRunning] = useState(false)
  const [stats, setStats] = useState(null)
  const [tool, setTool] = useState('wall') // wall | start | end
  const dragRef = useRef(null) // null | 'add' | 'remove'
  const timerRef = useRef(null)
  const speedRef = useRef(speed)
  speedRef.current = speed

  useEffect(() => () => clearInterval(timerRef.current), [])

  const grid = useMemo(() => {
    const g = []
    for (let r = 0; r < ROWS; r++) {
      const row = []
      for (let c = 0; c < COLS; c++) {
        row.push({ row: r, col: c, isWall: walls.has(`${r},${c}`) })
      }
      g.push(row)
    }
    return g
  }, [walls])

  const clearPath = useCallback(() => {
    clearInterval(timerRef.current)
    setRunning(false)
    setCellStates(new Map())
    setStats(null)
  }, [])

  const clearAll = useCallback(() => {
    clearPath()
    setWalls(new Set())
  }, [clearPath])

  const run = useCallback(() => {
    clearInterval(timerRef.current)
    setCellStates(new Map())
    setStats(null)
    const { visitedOrder, path } = GRID_ALGORITHMS[algoKey].fn(grid, start, end)
    setRunning(true)

    let vi = 0
    let pi = 0
    let soundTick = 0
    const animate = () => {
      // batch size scales with speed slider; tail of visitedOrder shown as frontier
      const batch = Math.max(1, Math.round(speedRef.current / 15))
      setCellStates((prev) => {
        const next = new Map(prev)
        if (vi < visitedOrder.length) {
          // single solid colour sweeps outward from start — no scattered frontier band
          for (let b = 0; b < batch && vi < visitedOrder.length; b++, vi++) {
            const { row, col } = visitedOrder[vi]
            next.set(`${row},${col}`, 'visited')
          }
          // low exploration tick, throttled so it doesn't machine-gun
          if (soundTick++ % 2 === 0) {
            blip(noteFromRatio(vi / visitedOrder.length, 150, 480), {
              duration: 0.025,
              type: 'sine',
              gain: 0.02,
            })
          }
        } else if (pi < path.length) {
          for (let b = 0; b < Math.max(1, Math.round(batch / 2)) && pi < path.length; b++, pi++) {
            const { row, col } = path[pi]
            next.set(`${row},${col}`, 'path')
          }
          // rising tone traces the path flowing from start to end
          blip(noteFromRatio(pi / path.length, 320, 1040), {
            duration: 0.06,
            type: 'triangle',
            gain: 0.05,
          })
        } else {
          clearInterval(timerRef.current)
          setRunning(false)
          setStats({
            visited: visitedOrder.length,
            pathLength: path.length,
            found: path.length > 0,
          })
        }
        return next
      })
    }
    timerRef.current = setInterval(animate, 16)
  }, [algoKey, grid, start, end])

  const maze = useCallback(() => {
    clearPath()
    setWalls(generateMaze(ROWS, COLS, start, end))
  }, [clearPath, start, end])

  const handleCellDown = (r, c) => {
    if (running) return
    const k = `${r},${c}`
    const isStart = start.row === r && start.col === c
    const isEnd = end.row === r && end.col === c
    if (tool === 'start') {
      if (!isEnd) setStart({ row: r, col: c })
      return
    }
    if (tool === 'end') {
      if (!isStart) setEnd({ row: r, col: c })
      return
    }
    if (isStart || isEnd) return
    dragRef.current = walls.has(k) ? 'remove' : 'add'
    toggleWall(r, c, dragRef.current)
  }

  const handleCellEnter = (r, c) => {
    if (running || dragRef.current === null || tool !== 'wall') return
    toggleWall(r, c, dragRef.current)
  }

  const toggleWall = (r, c, mode) => {
    if ((start.row === r && start.col === c) || (end.row === r && end.col === c)) return
    setWalls((prev) => {
      const next = new Set(prev)
      const k = `${r},${c}`
      if (mode === 'add') next.add(k)
      else next.delete(k)
      return next
    })
  }

  const algo = GRID_ALGORITHMS[algoKey]

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:flex-row" onMouseUp={() => (dragRef.current = null)}>
      <motion.aside
        initial={{ x: -24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-full shrink-0 space-y-5 rounded-xl border border-edge bg-panel p-4 lg:w-72"
      >
        <div>
          <label className="font-mono text-xs uppercase tracking-wider text-neutral-400">
            Algorithm
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {Object.entries(GRID_ALGORITHMS).map(([k, a]) => (
              <button
                key={k}
                onClick={() => setAlgoKey(k)}
                className={`rounded-lg border px-2 py-1.5 font-mono text-xs transition-colors ${
                  k === algoKey
                    ? 'border-orange bg-orange/10 text-orange'
                    : 'border-edge text-neutral-400 hover:border-neutral-500 hover:text-neutral-200'
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={algoKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="rounded-lg border border-edge bg-bg p-3 text-xs leading-relaxed text-neutral-400"
          >
            {algo.description}
          </motion.p>
        </AnimatePresence>

        <div>
          <label className="font-mono text-xs uppercase tracking-wider text-neutral-400">Tool</label>
          <div className="mt-2 flex gap-2">
            {[
              ['wall', '🧱 Wall'],
              ['start', '🟢 Start'],
              ['end', '🔴 End'],
            ].map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTool(t)}
                className={`flex-1 rounded-lg border px-2 py-1.5 font-mono text-xs transition-colors ${
                  tool === t
                    ? 'border-orange bg-orange/10 text-orange'
                    : 'border-edge text-neutral-400 hover:border-neutral-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex justify-between font-mono text-xs text-neutral-400">
            <span>SPEED</span>
            <span className="text-orange">{speed}</span>
          </label>
          <input
            type="range"
            min="5"
            max="300"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </div>

        <div className="space-y-2">
          <button
            onClick={run}
            disabled={running}
            className="w-full rounded-lg bg-orange px-3 py-2 font-mono text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {running ? 'Running…' : '▶ Visualise'}
          </button>
          <button
            onClick={maze}
            className="w-full rounded-lg border border-orange/50 px-3 py-2 font-mono text-sm text-orange transition hover:bg-orange/10"
          >
            ⌗ Random Maze
          </button>
          <div className="flex gap-2">
            <button
              onClick={clearPath}
              className="flex-1 rounded-lg border border-edge px-3 py-2 font-mono text-xs text-neutral-300 hover:border-neutral-500"
            >
              Clear Path
            </button>
            <button
              onClick={clearAll}
              className="flex-1 rounded-lg border border-edge px-3 py-2 font-mono text-xs text-neutral-300 hover:border-neutral-500"
            >
              Clear Grid
            </button>
          </div>
        </div>

        <AnimatePresence>
          {stats && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-lg border border-edge bg-bg p-3 font-mono text-xs"
            >
              <div className="mb-1 font-bold text-neon-green">
                {stats.found ? '✓ PATH FOUND' : '✗ NO PATH'}
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>nodes visited</span>
                <span className="text-neon-amber">{stats.visited}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>path length</span>
                <span className="text-orange">{stats.pathLength}</span>
              </div>
              {!algo.guaranteesShortest && stats.found && (
                <div className="mt-1 text-[10px] text-neon-red">⚠ not guaranteed shortest</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-1 font-mono text-[11px] text-neutral-500">
          <Legend className="bg-neon-green" label="start" />
          <Legend className="bg-neon-red" label="end" />
          <Legend className="bg-neutral-700" label="wall" />
          <Legend className="bg-neon-purple/60" label="searched" />
          <Legend className="bg-neon-amber" label="path" />
        </div>
      </motion.aside>

      <div className="flex min-h-[300px] flex-1 items-center justify-center overflow-auto rounded-xl border border-edge bg-panel p-3">
        <div
          className="grid aspect-[45/25] h-full max-h-full w-auto max-w-full select-none gap-px"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          }}
          onMouseLeave={() => (dragRef.current = null)}
        >
          {grid.flat().map((cell) => {
            const k = `${cell.row},${cell.col}`
            const isStart = start.row === cell.row && start.col === cell.col
            const isEnd = end.row === cell.row && end.col === cell.col
            const state = cellStates.get(k)
            let cls = 'bg-bg'
            let shape = 'rounded-[2px] transition-colors duration-150'
            if (cell.isWall) cls = 'bg-neutral-700'
            if (state === 'visited') cls = 'bg-neon-purple/60'
            if (state === 'path') {
              // square + a ring that bleeds into the 1px grid gap, so adjacent
              // path cells merge into one solid continuous yellow line
              cls = 'bg-neon-amber'
              shape = 'rounded-none shadow-[0_0_0_1.5px_var(--color-neon-amber)] z-10'
            }
            if (isStart) {
              cls = 'bg-neon-green shadow-[0_0_8px_#4ade80]'
              shape = 'rounded-[2px] z-10'
            }
            if (isEnd) {
              cls = 'bg-neon-red shadow-[0_0_8px_#f87171]'
              shape = 'rounded-[2px] z-10'
            }
            return (
              <div
                key={k}
                onMouseDown={() => handleCellDown(cell.row, cell.col)}
                onMouseEnter={() => handleCellEnter(cell.row, cell.col)}
                className={`${shape} ${cls}`}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Legend({ className, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded-sm ${className}`} /> {label}
    </div>
  )
}

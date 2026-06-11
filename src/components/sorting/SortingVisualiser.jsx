import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SORTING_ALGORITHMS } from '../../algorithms/sorting'
import { usePlayback } from '../../hooks/usePlayback'
import { blip, noteFromRatio } from '../../lib/sound'

function randomArray(n) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 95) + 5)
}

const BAR_COLORS = {
  default: 'bg-neutral-600',
  comparing: 'bg-neon-amber',
  swapped: 'bg-neon-pink',
  sorted: 'bg-neon-green',
}

export default function SortingVisualiser() {
  const [algoKey, setAlgoKey] = useState('bubble')
  const [size, setSize] = useState(40)
  const [speed, setSpeed] = useState(60)
  const [baseArray, setBaseArray] = useState(() => randomArray(40))

  const algo = SORTING_ALGORITHMS[algoKey]
  const frames = useMemo(() => algo.fn(baseArray), [algo, baseArray])
  const { index, playing, play, pause, step, stepBack, reset } = usePlayback(frames.length, speed)

  const current = frames[Math.min(index, frames.length - 1)] ?? {
    array: baseArray,
    comparing: [],
    swapped: [],
    sorted: [],
  }

  // sound: blip pitched to the bar under comparison, each step while playing
  const lastSoundIndex = useRef(-1)
  useEffect(() => {
    if (!playing || index === lastSoundIndex.current) return
    lastSoundIndex.current = index
    const c = current.comparing
    if (c && c.length) {
      const v = current.array[c[c.length - 1]] ?? 50
      blip(noteFromRatio(v / 100, 180, 920), { duration: 0.045, type: 'triangle', gain: 0.03 })
    }
  }, [index, playing, current])

  const randomise = (n = size) => {
    reset()
    setBaseArray(randomArray(n))
  }

  const barState = (i) => {
    if (current.sorted.includes(i)) return 'sorted'
    if (current.swapped.includes(i)) return 'swapped'
    if (current.comparing.includes(i)) return 'comparing'
    return 'default'
  }

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:flex-row">
      {/* sidebar */}
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
            {Object.entries(SORTING_ALGORITHMS).map(([k, a]) => (
              <button
                key={k}
                onClick={() => {
                  reset()
                  setAlgoKey(k)
                }}
                className={`rounded-lg border px-2 py-1.5 font-mono text-xs transition-colors ${
                  k === algoKey
                    ? 'border-orange bg-orange/10 text-orange'
                    : 'border-edge text-neutral-400 hover:border-neutral-500 hover:text-neutral-200'
                }`}
              >
                {a.name.replace(' Sort', '')}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={algoKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="rounded-lg border border-edge bg-bg p-3"
          >
            <div className="font-mono text-sm font-bold text-orange">{algo.name}</div>
            <p className="mt-1 break-words text-xs leading-relaxed text-neutral-400">{algo.description}</p>
            <div className="mt-3 grid grid-cols-2 gap-1.5 font-mono text-[11px]">
              <span className="text-neutral-500">best</span>
              <span className="text-neon-green">{algo.complexity.best}</span>
              <span className="text-neutral-500">avg</span>
              <span className="text-neon-amber">{algo.complexity.avg}</span>
              <span className="text-neutral-500">worst</span>
              <span className="text-neon-red">{algo.complexity.worst}</span>
              <span className="text-neutral-500">space</span>
              <span className="text-orange">{algo.complexity.space}</span>
            </div>
          </motion.div>
        </AnimatePresence>

        <div>
          <label className="flex justify-between font-mono text-xs text-neutral-400">
            <span>ARRAY SIZE</span>
            <span className="text-orange">{size}</span>
          </label>
          <input
            type="range"
            min="8"
            max="120"
            value={size}
            disabled={playing}
            onChange={(e) => {
              const n = Number(e.target.value)
              setSize(n)
              randomise(n)
            }}
            className="mt-1 w-full"
          />
        </div>

        <div>
          <label className="flex justify-between font-mono text-xs text-neutral-400">
            <span>SPEED</span>
            <span className="text-orange">{speed} fps</span>
          </label>
          <input
            type="range"
            min="2"
            max="240"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={playing ? pause : play}
            className="flex-1 rounded-lg bg-orange px-3 py-2 font-mono text-sm font-bold text-black transition hover:brightness-110"
          >
            {playing ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onClick={stepBack}
            className="rounded-lg border border-edge px-3 py-2 font-mono text-sm text-neutral-300 hover:border-neutral-500"
            title="Step back"
          >
            ⏮
          </button>
          <button
            onClick={step}
            className="rounded-lg border border-edge px-3 py-2 font-mono text-sm text-neutral-300 hover:border-neutral-500"
            title="Step forward"
          >
            ⏭
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => randomise()}
            className="flex-1 rounded-lg border border-orange/50 px-3 py-2 font-mono text-sm text-orange transition hover:bg-orange/10"
          >
            ⟳ Randomise
          </button>
          <button
            onClick={reset}
            className="flex-1 rounded-lg border border-edge px-3 py-2 font-mono text-sm text-neutral-300 hover:border-neutral-500"
          >
            Reset
          </button>
        </div>

        <div className="font-mono text-[11px] text-neutral-500">
          frame {index + 1} / {frames.length}
        </div>
      </motion.aside>

      {/* bars */}
      <div className="flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-xl border border-edge bg-panel p-4">
        <div className="mb-3 flex flex-wrap gap-4 font-mono text-[11px] text-neutral-400">
          <Legend color="bg-neutral-600" label="unsorted" />
          <Legend color="bg-neon-amber" label="comparing" />
          <Legend color="bg-neon-pink" label="swapped" />
          <Legend color="bg-neon-green" label="sorted" />
        </div>
        <div className="mx-auto flex w-full max-w-5xl flex-1 items-end justify-center gap-[2px]">
          {current.array.map((v, i) => (
            <div
              key={i}
              className={`min-w-0 flex-1 self-end rounded-t-sm transition-[height] duration-75 ${BAR_COLORS[barState(i)]}`}
              style={{ height: `${v}%`, maxWidth: '44px' }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded-sm ${color}`} /> {label}
    </span>
  )
}

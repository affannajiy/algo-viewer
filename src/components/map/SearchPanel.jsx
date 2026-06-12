import { useEffect, useRef, useState } from 'react'
import { searchPlaces } from '../../lib/geocode'

// From / To geocoding boxes. Debounced Nominatim lookups (usage policy: ≥1s
// between requests), dropdown of results, onPick('start'|'end', {lat,lng,label}).
function SearchBox({ placeholder, accent, onPick }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const abortRef = useRef(null)
  const debounceRef = useRef(null)
  const pickedRef = useRef(false) // suppress re-search after a pick fills the input

  useEffect(() => {
    if (pickedRef.current) {
      pickedRef.current = false
      return
    }
    clearTimeout(debounceRef.current)
    if (query.trim().length < 3) {
      setResults([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setBusy(true)
      try {
        const r = await searchPlaces(query, controller.signal)
        setResults(r)
        setOpen(r.length > 0)
      } catch (e) {
        if (e.name !== 'AbortError') {
          setResults([])
          setOpen(false)
        }
      } finally {
        setBusy(false)
      }
    }, 600)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const pick = (r) => {
    pickedRef.current = true
    setQuery(r.label.split(',').slice(0, 2).join(','))
    setOpen(false)
    onPick(r)
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${accent}`} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-edge bg-bg px-2 py-1.5 font-mono text-xs text-neutral-200 placeholder:text-neutral-600 focus:border-orange/60 focus:outline-none"
        />
        {busy && <span className="absolute right-2 font-mono text-[10px] text-neutral-500">…</span>}
      </div>
      {open && (
        <ul className="absolute z-[1100] mt-1 max-h-44 w-full overflow-y-auto rounded-lg border border-edge bg-black/95 backdrop-blur">
          {results.map((r, i) => (
            <li key={i}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r)}
                className="block w-full px-2 py-1.5 text-left font-mono text-[10px] leading-snug text-neutral-300 hover:bg-orange/10 hover:text-orange"
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function SearchPanel({ onPickStart, onPickEnd }) {
  return (
    <div className="space-y-1.5">
      <SearchBox placeholder="From — search a place…" accent="bg-neon-green" onPick={onPickStart} />
      <SearchBox placeholder="To — search a place…" accent="bg-neon-red" onPick={onPickEnd} />
    </div>
  )
}

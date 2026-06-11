# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server on :5173
npm run build    # production build to dist/
npm run preview  # serve the built dist/
```

No test runner, linter, or typechecker is configured. Verify changes by running `npm run build` (catches import/syntax errors) and exercising the UI in the dev server.

## Architecture

Client-only React (Vite) + Tailwind CSS v4 + Framer Motion + Leaflet/react-leaflet. No backend. The only network call is to the public **Overpass API** (OpenStreetMap), keyless, from the browser.

### The core invariant: algorithms are pure, the UI replays their output

Everything in `src/algorithms/` and `src/lib/overpass.js` is pure JS with **no React imports**. Algorithms never touch the DOM or component state — they compute a complete record of what to draw, and components step through that record. Two record shapes exist:

- **Sorting** (`algorithms/sorting.js`) returns an array of *frames*: `{ array, comparing, swapped, sorted }`. Each frame is a full snapshot. `SortingVisualiser` renders `frames[index]`; `usePlayback` advances `index` on a timer.
- **Pathfinding / graph search** (`algorithms/gridPathfinding.js`, `algorithms/graphSearch.js`) return `{ visitedOrder, path }` (grid) or `{ exploredEdges, path, pathDist, nodesVisited, timeMs }` (map). Components animate by revealing a growing slice of these arrays — explored region first, then the final path.

When adding an algorithm, add it to the `*_ALGORITHMS` registry object exported at the bottom of its file (name, fn, complexity/description metadata). The UI is data-driven off these registries — buttons, badges, and descriptions all iterate the registry, so a new entry appears in the UI automatically. Do **not** wire algorithms into components individually.

### Sound (also pure, also no React)

`lib/sound.js` is a tiny Web Audio synth — same no-React rule as the algorithms. One lazily-created `AudioContext` (unlocked on the first user gesture / unmute), `blip(freq, opts)` plays a short oscillator note, `noteFromRatio(0..1, lo, hi)` maps a value to an exponential pitch. A module-level mute flag is exposed via `subscribe`/`isMuted`/`toggleMuted`; React binds to it through `hooks/useSound.js` with `useSyncExternalStore` (the navbar 🔊/🔇 button). Everything is wrapped in try/catch so audio can never break a visualiser. Components call `blip` straight from their animation loop (sorting: per compared bar; grid: low ticks while searching, a rising tone along the path) — they do **not** thread audio through state.

### Three modules, switched in `App.jsx`

`App.jsx` holds a single `module` state (`sorting | grid | map`) and renders one of three top-level components. `MapVisualiser` is `lazy()`-loaded so Leaflet ships in a separate chunk.

1. **Sorting** — `components/sorting/SortingVisualiser.jsx`. Recomputes all frames with `useMemo` whenever the array or algorithm changes.
2. **Grid** — `components/grid/GridVisualiser.jsx`. Walls live in a `Set` of `"row,col"` keys; the `grid` 2D array is derived via `useMemo`. Animation runs on a `setInterval` whose batch size scales with the speed slider (via a `speedRef` so the running loop reads live speed without restarting). Cell states are `visited | path` only — a single solid colour sweeps outward (no separate "frontier" band, which read as visual noise). The path renders as a **continuous solid line**: `path` cells are square (`rounded-none`) with a `shadow-[0_0_0_1.5px_var(--color-neon-amber)]` ring that bleeds into the `gap-px` grid gutter so adjacent cells merge — don't reintroduce per-cell rounding/glow or it goes back to looking dashed/beaded. Maze generation is recursive backtracking in `algorithms/maze.js`.
3. **Map** — `components/map/MapVisualiser.jsx` + `CompareMode.jsx` + `ExplorationLayer.jsx`. "Use My Location" sets the start marker from `navigator.geolocation`.

### Map data flow (the subtle part)

`useMapGraph` owns start/end latlngs, the fetched graph, loading/error. `loadGraph(start, end)`:

1. `lib/overpass.js#fetchRoadGraph` builds a bbox between the two points (**capped at ~0.02 deg² area** — refuses larger to keep Overpass fast/polite), queries drivable `highway` ways, and builds `{ nodes: Map<id,{lat,lon}>, adj: Map<id,[{to,dist}]> }`. Edges are bidirectional; distances are haversine metres.
2. It then **prunes to the largest connected component** so `nearestNode` always snaps start/end onto routable nodes (otherwise an isolated road fragment could trap the search).
3. Returns an *enriched* graph `{ ...g, startId, endId }`. `loadGraph` must return this enriched object (not the raw `g`) because callers run the algorithm synchronously on the return value before state has committed.

Moving a marker invalidates the graph (`setGraph(null)`) — the old road network no longer matches the new bbox.

`ExplorationLayer` draws explored edges as one cheap multi-segment `Polyline` (low opacity) and the final path as a second bright `Polyline`, growing both via a timer. `CompareMode` runs all four registry algorithms on the *same* graph in four mini maps and labels shortest path / fastest run / fewest nodes.

### Styling

Tailwind v4 configured entirely in `src/index.css` via `@theme` (no `tailwind.config.js`). Custom tokens: `--color-bg/panel/edge`, the site-accent `--color-orange*`, and `--color-neon-*` (cyan/purple/green/pink/amber/red), used as `bg-orange`, `text-neon-purple`, etc. Dark mode only.

The theme is **black / white / orange**, but this is a *chrome-only* convention: navbar, buttons, active states, borders, sliders, and value text use `orange`; the meaning-bearing data colours (sorting bar states, grid searched/path, map route lines, start green / end red) are kept distinct on purpose and must **not** be collapsed to orange. Leaflet tiles are darkened with the `.dark-tiles` CSS invert/hue filter rather than a dark tile provider. Stat/code text uses the JetBrains Mono `font-mono`.

### Responsive layout

Module roots are `flex flex-col gap-4 lg:h-full lg:flex-row` — they only lock to viewport height on `lg+`. On smaller screens the layout stacks and `App.jsx`'s `<main>` (`overflow-y-auto`) scrolls; do not put `h-full` back on the module roots unconditionally or the stacked content gets clipped with no scroll.

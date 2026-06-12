# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server on :5173
npm run build    # production build to dist/
npm run preview  # serve the built dist/
```

No test runner, linter, or typechecker is configured. Verify changes by running `npm run build` (catches import/syntax errors) and exercising the UI in the dev server.

## What this app is

**RouteVis** — a single-page map pathfinding visualiser. Client-only React (Vite) + Tailwind CSS v4 + Framer Motion + Leaflet/react-leaflet. No backend. The only network calls are to two public, keyless OSM services from the browser: the **Overpass API** (road data) and **Nominatim** (place search). The app used to have sorting and grid-pathfinding modules; they were deliberately removed (git history has them) — do not reintroduce a module switcher.

### The core invariant: algorithms are pure, the UI replays their output

Everything in `src/algorithms/` and `src/lib/` is pure JS with **no React imports**. Algorithms never touch the DOM or component state — they compute a complete record of the search, and components animate by revealing a growing slice of that record.

`algorithms/graphSearch.js` exports BFS/DFS/Dijkstra/A* returning
`{ exploredEdges: [[fromId,toId]], path: [nodeId], pathDist (m), pathTime (s), nodesVisited, timeMs }`.
Weighted algorithms (Dijkstra, A*) take `opts.weight: 'dist' | 'time'`; A* switches to an admissible time heuristic (straight line at the network's max speed) in time mode. BFS/DFS ignore weights — the registry marks them `weighted: false` and the UI shows a hint.

The `MAP_ALGORITHMS` registry at the bottom of the file carries `{ name, fn, weighted, color, description }`. The UI is data-driven off this registry — algorithm buttons, race colours/counters, and badges all iterate it. Add new algorithms to the registry only; never wire them into components individually.

### Map data flow (the subtle part)

`hooks/useMapGraph.js` owns start/end latlngs, the fetched graph, loading/error. `loadGraph(start, end)`:

1. `lib/overpass.js#fetchRoadGraph` builds a bbox between the two points (**capped at ~0.02 deg² area** — refuses larger with a friendly error to keep Overpass fast/polite), queries drivable `highway` ways, and builds `{ nodes: Map<id,{lat,lon}>, adj: Map<id,[{to,dist,time}]> }`. Edges are bidirectional; `dist` is haversine metres, `time` is seconds at the road type's speed (`SPEED_KMH` table — motorway 100 … living_street 15, default 40).
2. It then **prunes to the largest connected component** so `nearestNode` always snaps start/end onto routable nodes.
3. Returns an *enriched* graph `{ ...g, startId, endId }`. `loadGraph` must return this enriched object (not the raw `g`) because callers run algorithms synchronously on the return value before state has committed.

Moving a marker invalidates the graph (`setGraph(null)`) — the old road network no longer matches the new bbox.

There are two Overpass endpoints with failover (the primary 504s under load regularly — that's expected, not a bug).

### MapVisualiser interaction model

`components/map/MapVisualiser.jsx` is the whole app surface. Conventions:

- **Placing points**: map click = manual (user then hits ▶ Visualise). Marker **drag-end** and **search picks** auto-route immediately (`setPoint(..., { autoroute: true })` → `routeWith`), because moving an existing route is explicit intent. Keep this split.
- **Control panel folds**: manual minimise (— button → 🧭 pill) and auto-fold when a run starts *successfully*, so the animation owns the screen. On a load error the panel force-reopens (`setPanelOpen(true)`) — error text must never be hidden behind the pill.
- **Auto-locate**: on mount, `locate(true)` (silent — no error chrome if denied) drops the start marker at the GPS position; the `Recenter` child handles both `flyTo` (single point) and `fitBounds` (route).
- **Markers** are draggable Leaflet `Marker`s with `divIcon` coloured dots (green start / red end) — not CircleMarkers (those can't drag).
- **Weight toggle** (`'dist'` | `'time'`): switching reruns the current result/race **synchronously** on the already-loaded graph — no refetch.
- **Race mode** (`RaceLayer.jsx`): all registry algorithms run on the *same* graph, then one shared timer reveals every exploration at the same edges-per-tick rate, so fewer-explored algorithms visibly finish first. `onProgress` is throttled (~every 6 ticks) to feed the counter panel without re-rendering the map at 60 fps. Race replaces the old mini-map CompareMode — don't bring back per-algorithm mini maps. **Focus/isolate**: `raceHover` (transient, from line `mouseover` or panel-name hover) takes priority over `racePin` (click/tap toggle, the touch-screen path); the combined `raceFocus` is passed to `RaceLayer`, which fades non-focused algorithms to near-invisible instead of unmounting them.
- **Search** (`SearchPanel.jsx` → `lib/geocode.js`): debounced ≥600 ms per Nominatim's 1 req/s usage policy. Keep the debounce.

### Sound (also pure, also no React)

`lib/sound.js` is a tiny Web Audio synth — same no-React rule as the algorithms. One lazily-created `AudioContext` (unlocked on first user gesture / unmute), `blip(freq, opts)` plays a short oscillator note, `noteFromRatio(0..1, lo, hi)` maps a value to an exponential pitch. Module-level mute flag exposed via `subscribe`/`isMuted`/`toggleMuted`; React binds through `hooks/useSound.js` (`useSyncExternalStore`, navbar 🔊/🔇). Everything is wrapped in try/catch so audio can never break the visualiser. `ExplorationLayer` calls `blip` from its animation loop (low ticks exploring, rising tone on the path) and takes `sound={false}` in race mode — four synths at once is noise, keep race silent.

### Styling

Tailwind v4 configured entirely in `src/index.css` via `@theme` (no `tailwind.config.js`). Custom tokens: `--color-bg/panel/edge`, the site-accent `--color-orange*`, and `--color-neon-*` (cyan/purple/green/pink/amber/red). Dark mode only.

The theme is **black / white / orange**, but this is a *chrome-only* convention: navbar, buttons, active states, borders, sliders, and value text use `orange`; the meaning-bearing data colours (per-algorithm explore colours from the registry, start green / end red, the orange final path) stay distinct and must **not** be collapsed to one colour. Base tiles are **CARTO Dark Matter** (`dark_all`, keyless, subdomains a–d, `{r}` retina) — a purpose-built minimal dark basemap so the algorithm colours pop; the old OSM-tiles + `.dark-tiles` CSS-invert hack is gone, don't bring it back. Stat/code text uses JetBrains Mono `font-mono`.

Floating panels over the map need `z-[1000]`+ (Leaflet panes own lower z-indices); the search dropdown uses `z-[1100]`.

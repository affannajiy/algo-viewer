# AlgoVis — Algorithm Visualiser

Interactive algorithm visualiser. Fully client-side: React (Vite) + Tailwind CSS v4 + Framer Motion + Leaflet.

Black / white / orange theme, optional Web Audio sound effects (toggle in the navbar), and a responsive layout that scrolls cleanly on phones.

## Modules

### 1. Sorting
Bubble, Selection, Insertion, Merge, Quick, Heap — animated bar chart driven by precomputed frame snapshots. Speed/size sliders, play/pause/step, complexity badges. Each compared bar plays a pitch-mapped blip.

### 2. Grid Pathfinding
BFS, DFS, Dijkstra, A* on an interactive grid. Draw walls by dragging, move start/end with the tool picker, generate a recursive-backtracking maze. A single solid colour sweeps outward as the search explores, then the shortest path draws as one continuous line. Stats after each run.

### 3. Real Map
Click two points on an OpenStreetMap view of KL — or hit **Use My Location** to drop the start on your GPS position. The road network for the bounding box is fetched live from the Overpass API (no key), built into a graph, and the chosen algorithm's exploration is animated with Leaflet polylines. Compare Mode runs all four algorithms in four mini maps and crowns the shortest / fastest / most efficient.

Keep map points under ~10 km apart — the app caps the Overpass bounding box to stay fast and polite to the public API.

## Run

```bash
npm install
npm run dev
```

## Structure

```
src/
  algorithms/        pure functions, no React
    sorting.js       frame-snapshot sorting algorithms
    gridPathfinding.js
    maze.js          recursive backtracking generator
    graphSearch.js   BFS/DFS/Dijkstra/A* over OSM graph
  lib/
    overpass.js      Overpass fetch + graph builder
    sound.js         Web Audio synth (blips), shared mute state — no React
  hooks/             usePlayback, useMapGraph, useSound
  components/
    sorting/  grid/  map/
```

All algorithm logic is pure and separated from the UI; visualisation replays snapshots/step lists, never mutates live state.

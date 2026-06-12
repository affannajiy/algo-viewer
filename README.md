# RouteVis — Pathfinding on Real Roads

Watch BFS, DFS, Dijkstra and A* explore a real road network, live on an OpenStreetMap view. Fully client-side: React (Vite) + Tailwind CSS v4 + Framer Motion + Leaflet. Black / white / orange theme with Web Audio sound feedback (toggle in the navbar).

## Features

- **Auto-locate** — opens on your GPS position (with permission) and drops the start marker there.
- **From / To search** — free-text place search via Nominatim (keyless). Pick a result and the route re-runs automatically.
- **Draggable markers** — drag the start or end pin; the road graph refetches and the route re-runs on drop.
- **Live road data** — the drivable network for your bounding box is fetched from the Overpass API (no key) and built into a weighted graph. Keep points under ~10 km apart; the app caps the bbox to stay fast and polite to the public API.
- **Shortest vs Fastest** — toggle between pure distance and travel-time weighting (edges weighted by road-type speed: motorway 100 km/h … living street 15 km/h). Stats show distance, estimated drive time, nodes visited, and compute time. BFS/DFS ignore weights — the UI tells you.
- **Race mode** — all four algorithms explore the same map simultaneously, each in its own colour, at the same reveal rate. Medals for finish order, plus badges for shortest route, fastest ETA, and fewest nodes. Hover (or tap) an algorithm name — or its line on the map — to isolate that route and fade the rest.
- **Minimisable controls** — the control panel folds to a 🧭 pill (manually, or automatically when a run starts) so the map gets the whole stage. Dark minimal basemap by CARTO keeps the focus on the algorithms.
- **Sound** — low ticks while exploring, a rising tone as the route draws. Muted in race mode (four synths is noise). Navbar toggle.

## Run

```bash
npm install
npm run dev
```

## Structure

```
src/
  algorithms/
    graphSearch.js   BFS/DFS/Dijkstra/A* over the OSM graph — pure, no React
  lib/
    overpass.js      Overpass fetch + weighted graph builder (dist + time per edge)
    geocode.js       Nominatim place search
    sound.js         Web Audio synth (blips), shared mute state — no React
  hooks/             useMapGraph, useSound
  components/map/    MapVisualiser, ExplorationLayer, RaceLayer, SearchPanel
```

All algorithm logic is pure and separated from the UI; visualisation replays each algorithm's recorded exploration, never mutates live state.

// Free-text place search via Nominatim (OpenStreetMap). Keyless, client-side.
// Usage policy: max 1 req/sec — callers must debounce; we also send no burst retries.

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

// Returns [{ label, lat, lng }]. Empty array on no results.
export async function searchPlaces(query, signal) {
  const q = query.trim()
  if (q.length < 3) return []
  const url = `${NOMINATIM}?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Geocoding failed (HTTP ${res.status})`)
  const data = await res.json()
  return data.map((r) => ({
    label: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }))
}

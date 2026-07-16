import { useEffect, useState } from 'react'
import { LoaderCircle, MapPin, Search } from 'lucide-react'
import type { PlaceResult, Plant } from '../models'

export function MapPlaceSearch({ plants, onSelect }: { plants: Plant[], onSelect: (place: PlaceResult) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    const search = async () => {
      const value = query.trim()
      if (value.length < 2) { setResults([]); return }
      const normalized = value.toLowerCase()
      const registered = plants.filter((plant) => [plant.name, plant.nodeName, plant.region, plant.country].join(' ').toLowerCase().includes(normalized)).slice(0, 5).map((plant) => ({ name: plant.name, description: `Registered plant · ${plant.nodeName || plant.region}`, latitude: plant.latitude, longitude: plant.longitude, registeredPlant: plant }))
      setResults(registered)
      setIsSearching(true)
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`)
        const places = response.ok ? await response.json() as Array<{ display_name: string, lat: string, lon: string }> : []
        const mapPlaces = places.map((place) => ({ name: place.display_name.split(',')[0], description: place.display_name, latitude: Number(place.lat), longitude: Number(place.lon) }))
        setResults([...registered, ...mapPlaces.filter((place) => !registered.some((registeredPlace) => registeredPlace.latitude === place.latitude && registeredPlace.longitude === place.longitude))])
      } finally { setIsSearching(false) }
    }
    const timer = window.setTimeout(() => void search(), 300)
    return () => window.clearTimeout(timer)
  }, [plants, query])

  return <div className="map-place-search"><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search any place or power station" /></label>{isSearching && <LoaderCircle className="spinning" size={15} />}{results.length > 0 && <div className="place-results">{results.map((result) => <button key={`${result.name}-${result.latitude}-${result.longitude}`} type="button" onClick={() => { onSelect(result); setQuery(result.name); setResults([]) }}><MapPin size={15} /><span><strong>{result.name}</strong><small>{result.description}</small></span>{result.registeredPlant && <b>In register</b>}</button>)}</div>}</div>
}
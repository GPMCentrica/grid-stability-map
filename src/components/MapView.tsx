import { divIcon } from 'leaflet'
import L from 'leaflet'
import { useEffect, useState } from 'react'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, ZoomControl } from 'react-leaflet'
import 'leaflet.vectorgrid'
import { getLocationNeeds, needColour, needLabel } from '../lib/need'
import type { Coordinates, HorizonYear, NeedLayer, NetworkLayerOptions, Plant, RetiredAssetMode } from '../models'
import { effectiveRetirementYear, formatMw, retirementLabel, technologyColour } from '../lib/risk'

interface MapViewProps {
  plants: Plant[]
  year: HorizonYear
  retiredMode: RetiredAssetMode
  needLayer: NeedLayer
  networkLayer: boolean
  networkOptions: NetworkLayerOptions
  focusedPlant?: Plant
  focusedPlace?: Coordinates
  onPlantSelect: (plant: Plant) => void
}

function PlantFocus({ plant, place }: { plant?: Plant, place?: Coordinates }) {
  const map = useMap()
  useEffect(() => {
    if (plant) map.flyTo([plant.latitude, plant.longitude], 8, { duration: 0.8 })
    else if (place) map.flyTo([place.latitude, place.longitude], 9, { duration: 0.8 })
  }, [map, plant, place])
  return null
}

function NetworkOverlay({ enabled, options }: { enabled: boolean, options: NetworkLayerOptions }) {
  const map = useMap()
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!enabled) { setMessage(''); return }
    const vectorGrid = (L as unknown as { vectorGrid?: { protobuf: (url: string, settings: object) => { addTo: (target: typeof map) => void, remove: () => void } } }).vectorGrid
    if (!vectorGrid) { setMessage('Vector network tiles are unavailable in this browser.'); return }
    const isFuture = (properties: Record<string, unknown>) => Boolean(properties.construction || properties.proposed || properties.power === 'construction' || properties.power === 'proposed')
    const voltage = (properties: Record<string, unknown>) => Number(String(properties.voltage ?? '').split(';')[0])
    const layer = vectorGrid.protobuf('https://openinframap.org/tiles/{z}/{x}/{y}.pbf', {
      interactive: false,
      maxNativeZoom: 17,
      vectorTileLayerStyles: {
        power_line: (properties: Record<string, unknown>) => {
          const future = isFuture(properties)
          const level = voltage(properties)
          if (future && !options.future) return { opacity: 0, weight: 0 }
          if (level >= 275000 && options.transmission) return { color: future ? '#825bb0' : '#285a86', weight: level >= 400000 ? 3.5 : 2.8, opacity: .9, dashArray: future ? '7 7' : undefined }
          if (level >= 110000 && options.lowerVoltage) return { color: future ? '#825bb0' : '#5f8aa7', weight: 1.6, opacity: .75, dashArray: future ? '6 6' : undefined }
          return { opacity: 0, weight: 0 }
        },
        power_substation: (properties: Record<string, unknown>) => {
          if (!options.substations) return { opacity: 0, fillOpacity: 0, radius: 0 }
          const future = isFuture(properties)
          return { color: future ? '#825bb0' : '#285a86', fillColor: future ? '#825bb0' : '#285a86', weight: 1.5, fillOpacity: .5, radius: 4 }
        },
      },
    })
    layer.addTo(map)
    setMessage('OpenInfraMap network data · © OpenStreetMap contributors')
    return () => { layer.remove() }
  }, [enabled, map, options])

  return message ? <div className="network-status">{message}</div> : null
}

function plantIcon(plant: Plant) {
  const diameter = Math.max(18, Math.min(44, 14 + Math.sqrt(Math.max(plant.netMw, 1)) * 0.55))
  const colour = technologyColour(plant.technology)
  return divIcon({
    className: 'plant-marker-shell',
    html: `<span class="plant-marker" style="width:${diameter}px;height:${diameter}px;background:${colour}"></span>`,
    iconSize: [diameter, diameter],
    iconAnchor: [diameter / 2, diameter / 2],
  })
}

function lifespanOpacity(plant: Plant, year: HorizonYear) {
  const retirementYear = effectiveRetirementYear(plant)
  if (!retirementYear) return 1
  if (!Number.isFinite(retirementYear)) return 1
  if (year >= retirementYear) return 0.14
  const originalLifespan = Math.max(1, retirementYear - 2026)
  return Math.max(0.35, 0.35 + 0.65 * (retirementYear - year) / originalLifespan)
}

function PlantPopup({ plant }: { plant: Plant }) {
  return (
    <div className="popup-content">
      <p className="popup-kicker">Generation asset</p>
      <h3>{plant.name}</h3>
      <dl>
        <div><dt>Technology Type</dt><dd>{plant.technology}</dd></div>
        <div><dt>Net MW</dt><dd>{formatMw(plant.netMw)}</dd></div>
        <div><dt>Region</dt><dd>{plant.region || 'Not recorded'}</dd></div>
        <div><dt>Node / Substation</dt><dd>{plant.nodeName || plant.nodeId}</dd></div>
        <div><dt>Retirement outlook</dt><dd>{retirementLabel(plant)}</dd></div>
        <div><dt>Confidence Score</dt><dd>{plant.confidenceScore ?? 'Not recorded'}</dd></div>
      </dl>
    </div>
  )
}

export function MapView({ plants, year, retiredMode: _retiredMode, needLayer, networkLayer, networkOptions, focusedPlant, focusedPlace, onPlantSelect }: MapViewProps) {
  const visiblePlants = plants
  const activeNeedLayer = needLayer === 'none' ? undefined : needLayer
  const locationNeeds = activeNeedLayer ? getLocationNeeds(plants, year, activeNeedLayer) : []
  const layerLabel = activeNeedLayer === 'scl' ? 'Short-circuit level' : activeNeedLayer === 'voltage' ? 'Voltage support' : 'Inertia'

  return (
    <MapContainer center={[55.4, -3.2]} zoom={5.7} minZoom={5} zoomControl={false} className="map-canvas">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="topright" />
      <PlantFocus plant={focusedPlant} place={focusedPlace} />
      <NetworkOverlay enabled={networkLayer} options={networkOptions} />
      {locationNeeds.map((location) => <Circle key={`${activeNeedLayer}-${location.nodeId}`} center={[location.latitude, location.longitude]} radius={16000 + location.need * 76000} pathOptions={{ color: needColour(location.need), weight: 1.5, fillColor: needColour(location.need), fillOpacity: 0.08 + location.need * 0.2 }}>
        <Popup><div className="popup-content"><p className="popup-kicker">{layerLabel} screening</p><h3>{location.nodeName}</h3><dl><div><dt>Screening need</dt><dd>{needLabel(location.need)}</dd></div><div><dt>Retiring by {year}</dt><dd>{formatMw(location.retiringMw)}</dd></div><div><dt>Total local capacity</dt><dd>{formatMw(location.totalMw)}</dd></div></dl></div></Popup>
      </Circle>)}
      {visiblePlants.map((plant) => <Marker key={plant.assetId} position={[plant.latitude, plant.longitude]} icon={plantIcon(plant)} opacity={lifespanOpacity(plant, year)} eventHandlers={{ click: () => onPlantSelect(plant) }}><Popup><PlantPopup plant={plant} /></Popup></Marker>)}
    </MapContainer>
  )
}
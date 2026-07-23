import { divIcon } from 'leaflet'
import L from 'leaflet'
import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents, ZoomControl } from 'react-leaflet'
import 'leaflet.vectorgrid'
import { getLocationNeeds, needColour, needLabel } from '../lib/need'
import type { Coordinates, HorizonYear, NeedLayer, NetworkLayerOptions, Plant, PortfolioId, RetiredAssetMode } from '../models'
import { commissioningLabel, effectiveCommissioningYear, effectiveRetirementYear, formatMw, retirementLabel, technologyColour } from '../lib/risk'

interface MapViewProps {
  plants: Plant[]
  year: HorizonYear
  retiredMode: RetiredAssetMode
  needLayer: NeedLayer
  heatOpacity: number
  networkLayer: boolean
  networkOptions: NetworkLayerOptions
  portfolio: PortfolioId
  focusedPlant?: Plant
  focusedPlace?: Coordinates
  onPlantSelect: (plant?: Plant) => void
}

interface HeatPoint {
  latitude: number
  longitude: number
  intensity: number
}

const heatProfiles = {
  scl: { radiusKm: 30, colour: [222, 69, 42] },
  voltage: { radiusKm: 60, colour: [20, 133, 196] },
  inertia: { radiusKm: 100, colour: [20, 137, 117] },
} as const

function NeedHeatmap({ layer, points, opacity }: { layer: Exclude<NeedLayer, 'none'>, points: HeatPoint[], opacity: number }) {
  const map = useMap()

  useEffect(() => {
    if (!points.length) return
    const profile = heatProfiles[layer]
    const canvas = document.createElement('canvas')
    canvas.className = 'need-heatmap'
    canvas.style.pointerEvents = 'none'
    const pane = map.getPanes().overlayPane
    pane.insertBefore(canvas, pane.firstChild)

    const draw = () => {
      const size = map.getSize()
      const pixelRatio = window.devicePixelRatio || 1
      const origin = map.containerPointToLayerPoint([0, 0])
      L.DomUtil.setPosition(canvas, origin)
      canvas.width = size.x * pixelRatio
      canvas.height = size.y * pixelRatio
      canvas.style.width = `${size.x}px`
      canvas.style.height = `${size.y}px`
      const context = canvas.getContext('2d')
      if (!context) return
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context.clearRect(0, 0, size.x, size.y)
      context.globalCompositeOperation = 'source-over'

      points.forEach((point) => {
        const centre = map.latLngToLayerPoint([point.latitude, point.longitude]).subtract(origin)
        const metresPerPixel = 40075016.686 * Math.cos(point.latitude * Math.PI / 180) / (2 ** (map.getZoom() + 8))
        const radius = Math.max(18, profile.radiusKm * 1000 / metresPerPixel)
        const alpha = (0.14 + point.intensity * 0.41) * opacity
        const gradient = context.createRadialGradient(centre.x, centre.y, 0, centre.x, centre.y, radius)
        gradient.addColorStop(0, `rgba(${profile.colour.join(', ')}, ${alpha})`)
        gradient.addColorStop(0.28, `rgba(${profile.colour.join(', ')}, ${alpha * 0.55})`)
        gradient.addColorStop(0.65, `rgba(${profile.colour.join(', ')}, ${alpha * 0.12})`)
        gradient.addColorStop(1, `rgba(${profile.colour.join(', ')}, 0)`)
        context.fillStyle = gradient
        context.beginPath()
        context.arc(centre.x, centre.y, radius, 0, Math.PI * 2)
        context.fill()
      })
    }

    draw()
    map.on('moveend zoomend resize viewreset', draw)
    return () => {
      map.off('moveend zoomend resize viewreset', draw)
      canvas.remove()
    }
  }, [layer, map, opacity, points])

  return null
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
    const substationStyle = (properties: Record<string, unknown>) => {
      if (!options.substations) return []
      const future = isFuture(properties)
      if (future && !options.future) return []
      return { color: future ? '#825bb0' : '#285a86', fillColor: future ? '#825bb0' : '#285a86', weight: 1.5, fillOpacity: .5, radius: 4 }
    }
    const layer = vectorGrid.protobuf('https://openinframap.org/tiles/{z}/{x}/{y}.pbf', {
      interactive: false,
      maxNativeZoom: 17,
      vectorTileLayerStyles: {
        power_line: (properties: Record<string, unknown>) => {
          const future = isFuture(properties)
          const level = voltage(properties)
          if (future && !options.future) return []
          if (level >= 220 && options.transmission) return { color: future ? '#825bb0' : '#285a86', weight: level >= 400 ? 3.5 : 2.8, opacity: .9, dashArray: future ? '7 7' : undefined }
          if (level >= 110 && level < 220 && options.lowerVoltage) return { color: future ? '#825bb0' : '#5f8aa7', weight: 1.6, opacity: .75, dashArray: future ? '6 6' : undefined }
          return []
        },
        power_substation: substationStyle,
        power_substation_point: substationStyle,
        power_tower: () => [],
        power_plant: () => [],
        power_plant_point: () => [],
        power_generator: () => [],
        power_generator_area: () => [],
        power_heatmap_solar: () => [],
        power_transformer: () => [],
        power_compensator: () => [],
        power_switch: () => [],
        telecoms_communication_line: () => [],
        telecoms_data_center: () => [],
        telecoms_mast: () => [],
        petroleum_pipeline: () => [],
        petroleum_well: () => [],
        petroleum_site: () => [],
        water_pipeline: () => [],
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

function lifespanOpacity(plant: Plant, year: HorizonYear, portfolio: PortfolioId) {
  if (portfolio === 'future-generation') {
    const commissioningYear = effectiveCommissioningYear(plant)
    return commissioningYear && commissioningYear > year ? 0.45 : 1
  }
  const retirementYear = effectiveRetirementYear(plant)
  if (!retirementYear) return 1
  if (!Number.isFinite(retirementYear)) return 1
  if (year >= retirementYear) return 0.14
  const originalLifespan = Math.max(1, retirementYear - 2026)
  return Math.max(0.35, 0.35 + 0.65 * (retirementYear - year) / originalLifespan)
}

function MapClickDeselect({ onDeselect }: { onDeselect: () => void }) {
  useMapEvents({ click: onDeselect })
  return null
}

function PlantPopup({ plant, portfolio }: { plant: Plant, portfolio: PortfolioId }) {
  return (
    <div className="popup-content">
      <p className="popup-kicker">Generation asset</p>
      <h3>{plant.name}</h3>
      <dl>
        <div><dt>Technology Type</dt><dd>{plant.technology}</dd></div>
        <div><dt>Net MW</dt><dd>{formatMw(plant.netMw)}</dd></div>
        <div><dt>Region</dt><dd>{plant.region || 'Not recorded'}</dd></div>
        <div><dt>Node / Substation</dt><dd>{plant.nodeName || plant.nodeId}</dd></div>
        <div><dt>{portfolio === 'future-generation' ? 'Commissioning outlook' : 'Retirement outlook'}</dt><dd>{portfolio === 'future-generation' ? commissioningLabel(plant) : retirementLabel(plant)}</dd></div>
        <div><dt>Confidence Score</dt><dd>{plant.confidenceScore ?? 'Not recorded'}</dd></div>
      </dl>
    </div>
  )
}

export function MapView({ plants, year, retiredMode: _retiredMode, needLayer, heatOpacity, networkLayer, networkOptions, portfolio, focusedPlant, focusedPlace, onPlantSelect }: MapViewProps) {
  const visiblePlants = plants
  const activeNeedLayer = needLayer === 'none' ? undefined : needLayer
  const locationNeeds = activeNeedLayer ? getLocationNeeds(plants, year, activeNeedLayer) : []
  const layerLabel = activeNeedLayer === 'scl' ? 'Short-circuit level' : activeNeedLayer === 'voltage' ? 'Voltage support' : 'Inertia'
  const serviceUnit = activeNeedLayer === 'inertia' ? 'MWs proxy' : activeNeedLayer === 'scl' ? 'SCL proxy' : 'MVAr proxy'
  const largestServiceLoss = Math.max(1, ...locationNeeds.map((location) => location.retiringService))
  const largestLocationalImportance = Math.max(0.001, ...locationNeeds.map((location) => Math.sqrt(location.need * location.retiringService / largestServiceLoss)))
  const localityVisual = activeNeedLayer === 'scl'
    ? { markerWeight: 22, bandKm: 30 }
    : activeNeedLayer === 'voltage'
      ? { markerWeight: 17, bandKm: 60 }
      : { markerWeight: 12, bandKm: 100 }

  return (
    <MapContainer center={[55.4, -3.2]} zoom={5.7} minZoom={5} zoomControl={false} className="map-canvas">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="topright" />
      <PlantFocus plant={focusedPlant} place={focusedPlace} />
      <MapClickDeselect onDeselect={() => onPlantSelect()} />
      <NetworkOverlay enabled={networkLayer} options={networkOptions} />
      {activeNeedLayer && <NeedHeatmap layer={activeNeedLayer} opacity={heatOpacity} points={locationNeeds.map((location) => ({ latitude: location.latitude, longitude: location.longitude, intensity: Math.sqrt(location.need * location.retiringService / largestServiceLoss) / largestLocationalImportance }))} />}
      {locationNeeds.map((location) => {
        const colour = needColour(location.need)
        const locationalImportance = Math.sqrt(location.need * location.retiringService / largestServiceLoss)
        return <CircleMarker key={`${activeNeedLayer}-${location.nodeId}`} center={[location.latitude, location.longitude]} radius={6 + localityVisual.markerWeight * locationalImportance} pathOptions={{ color: colour, weight: 1.5, fillColor: colour, fillOpacity: 0.16 + location.need * 0.28 }}>
          <Popup><div className="popup-content"><p className="popup-kicker">{layerLabel} screening</p><h3>{location.nodeName}</h3><dl><div><dt>Screening need</dt><dd>{needLabel(location.need)}</dd></div><div><dt>Relative locational importance</dt><dd>{Math.round(locationalImportance * 100)}%</dd></div><div><dt>Estimated provision lost</dt><dd>{new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(location.retiringService)} {serviceUnit}</dd></div><div><dt>Retiring by {year}</dt><dd>{formatMw(location.retiringMw)}</dd></div><div><dt>Heat spread assumption</dt><dd>~{localityVisual.bandKm} km</dd></div><div><dt>Basis</dt><dd>Technology and locality assumptions</dd></div></dl></div></Popup>
        </CircleMarker>
      })}
      {visiblePlants.map((plant) => <Marker key={plant.assetId} position={[plant.latitude, plant.longitude]} icon={plantIcon(plant)} opacity={lifespanOpacity(plant, year, portfolio)} eventHandlers={{ click: () => onPlantSelect(plant) }}><Popup><PlantPopup plant={plant} portfolio={portfolio} /></Popup></Marker>)}
    </MapContainer>
  )
}
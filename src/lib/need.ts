import type { HorizonYear, NeedLayer, Plant } from '../models'
import { isRetiredByYear } from './risk'

export interface LocationNeed {
  nodeId: string
  nodeName: string
  latitude: number
  longitude: number
  need: number
  retiringMw: number
  totalMw: number
}

const proxyFor = (plant: Plant, layer: Exclude<NeedLayer, 'none'>) => {
  if (layer === 'inertia') return plant.inertiaProxy ?? plant.netMw * 5
  if (layer === 'scl') return plant.faultLevelProxy ?? plant.netMw * 1.1
  return plant.reactiveProxy ?? plant.netMw * 0.33
}

export function getLocationNeeds(plants: Plant[], year: HorizonYear, layer: Exclude<NeedLayer, 'none'>): LocationNeed[] {
  const locations = new Map<string, Plant[]>()
  plants.filter((plant) => plant.hasCoordinates && plant.status !== 'Archived').forEach((plant) => {
    locations.set(plant.nodeId, [...(locations.get(plant.nodeId) ?? []), plant])
  })
  return [...locations.values()].flatMap((locationPlants) => {
    const totalService = locationPlants.reduce((sum, plant) => sum + proxyFor(plant, layer), 0)
    const retiredService = locationPlants.filter((plant) => isRetiredByYear(plant, year)).reduce((sum, plant) => sum + proxyFor(plant, layer), 0)
    const retiringMw = locationPlants.filter((plant) => isRetiredByYear(plant, year)).reduce((sum, plant) => sum + plant.netMw, 0)
    if (!totalService || !retiredService) return []
    const reference = locationPlants[0]
    return [{
      nodeId: reference.nodeId,
      nodeName: reference.nodeName || reference.nodeId,
      latitude: reference.latitude,
      longitude: reference.longitude,
      need: retiredService / totalService,
      retiringMw,
      totalMw: locationPlants.reduce((sum, plant) => sum + plant.netMw, 0),
    }]
  })
}

export function needLabel(need: number) {
  if (need >= 0.7) return 'High screening need'
  if (need >= 0.3) return 'Moderate screening need'
  return 'Low screening need'
}

export function needColour(need: number) {
  if (need >= 0.7) return '#c53b3e'
  if (need >= 0.3) return '#d7901a'
  return '#1f8a56'
}
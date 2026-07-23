import type { HorizonYear, NeedLayer, Plant } from '../models'
import { isRetiredByYear } from './risk'

export interface LocationNeed {
  nodeId: string
  nodeName: string
  latitude: number
  longitude: number
  need: number
  retiringService: number
  totalService: number
  retiringMw: number
  totalMw: number
}

interface TechnologyProvision {
  inertia: number
  scl: number
  voltage: number
}

const technologyProvisions: { match: RegExp, provision: TechnologyProvision }[] = [
  { match: /pumped storage/, provision: { inertia: 5.5, scl: 3.2, voltage: 0.65 } },
  { match: /\bhydro\b/, provision: { inertia: 4.8, scl: 3, voltage: 0.55 } },
  { match: /nuclear/, provision: { inertia: 6, scl: 3.8, voltage: 0.5 } },
  { match: /ccgt/, provision: { inertia: 4.5, scl: 3, voltage: 0.45 } },
  { match: /ocgt|gas turbine/, provision: { inertia: 3.5, scl: 2.5, voltage: 0.4 } },
  { match: /chp/, provision: { inertia: 4, scl: 2.8, voltage: 0.45 } },
  { match: /biomass|waste|coal|steam turbine/, provision: { inertia: 5, scl: 3.2, voltage: 0.5 } },
  { match: /wind|solar/, provision: { inertia: 0, scl: 0.15, voltage: 0.3 } },
  { match: /battery|bess/, provision: { inertia: 0, scl: 0.1, voltage: 0.5 } },
]

const defaultProvision: TechnologyProvision = { inertia: 3.5, scl: 2.5, voltage: 0.35 }

const proxyFor = (plant: Plant, layer: Exclude<NeedLayer, 'none'>) => {
  const profile = technologyProvisions.find(({ match }) => match.test(plant.technology.toLowerCase()))?.provision ?? defaultProvision
  return plant.netMw * profile[layer]
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
      retiringService: retiredService,
      totalService,
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
  if (need >= 0.7) return '#a50091'
  if (need >= 0.3) return '#b999f6'
  return '#29b263'
}
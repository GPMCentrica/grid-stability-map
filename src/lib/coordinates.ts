import type { CoordinateRecord, Plant, RiskNode } from '../models'

const normalise = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')

const parseCsvLine = (line: string) => {
  const fields: string[] = []
  let current = ''
  let isQuoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (isQuoted && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        isQuoted = !isQuoted
      }
    } else if (character === ',' && !isQuoted) {
      fields.push(current.trim())
      current = ''
    } else {
      current += character
    }
  }

  fields.push(current.trim())
  return fields
}

export function parseCoordinatesCsv(content: string): CoordinateRecord[] {
  const [headerLine, ...rows] = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean)
  if (!headerLine) return []

  const headers = parseCsvLine(headerLine).map(normalise)
  const getField = (values: string[], name: string) => values[headers.indexOf(normalise(name))]?.trim()

  return rows.flatMap((row) => {
    const values = parseCsvLine(row)
    const latitude = Number(getField(values, 'Latitude'))
    const longitude = Number(getField(values, 'Longitude'))
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return []

    return [{
      latitude,
      longitude,
      nodeId: getField(values, 'Node ID'),
      nodeName: getField(values, 'Node Name'),
      plantName: getField(values, 'Plant Name'),
    }]
  })
}

function buildCoordinateIndex(coordinates: CoordinateRecord[]) {
  const index = new Map<string, CoordinateRecord>()
  coordinates.forEach((coordinate) => {
    [coordinate.nodeId, coordinate.nodeName, coordinate.plantName]
      .filter((value): value is string => Boolean(value))
      .forEach((value) => index.set(normalise(value), coordinate))
  })
  return index
}

function coordinatesFor(index: Map<string, CoordinateRecord>, ...keys: string[]) {
  return keys.map((key) => index.get(normalise(key))).find(Boolean)
}

export function linkCoordinates(
  plants: Omit<Plant, 'latitude' | 'longitude' | 'hasCoordinates'>[],
  riskNodes: Omit<RiskNode, 'latitude' | 'longitude' | 'hasCoordinates'>[],
  coordinates: CoordinateRecord[],
) {
  const index = buildCoordinateIndex(coordinates)
  const plantsWithCoordinates: Plant[] = plants.map((plant) => {
    const coordinate = coordinatesFor(index, plant.nodeId, plant.name, plant.nodeName)
    return {
      ...plant,
      latitude: coordinate?.latitude ?? 0,
      longitude: coordinate?.longitude ?? 0,
      hasCoordinates: Boolean(coordinate),
    }
  })
  const nodesWithCoordinates: RiskNode[] = riskNodes.map((node) => {
    const coordinate = coordinatesFor(index, node.nodeId, node.nodeName)
    return {
      ...node,
      latitude: coordinate?.latitude ?? 0,
      longitude: coordinate?.longitude ?? 0,
      hasCoordinates: Boolean(coordinate),
    }
  })

  return { plants: plantsWithCoordinates, riskNodes: nodesWithCoordinates }
}
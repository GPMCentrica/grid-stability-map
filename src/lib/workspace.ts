import type { Plant, WorkbookData, WorkspaceFilters } from '../models'

const storageKey = 'uk-grid-stability-workspace-v2'

const requiredPlantFields = ['assetId', 'name', 'nodeId', 'nodeName', 'region', 'technology'] as const

interface WorkspaceSnapshot {
  workbook: WorkbookData
  savedAt: string
}

export function loadWorkspaceSnapshot(): WorkspaceSnapshot | undefined {
  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return undefined
    const parsed = JSON.parse(stored) as WorkbookData | WorkspaceSnapshot
    if ('workbook' in parsed) return parsed
    return { workbook: parsed, savedAt: '' }
  } catch {
    return undefined
  }
}

export function loadWorkspace() {
  return loadWorkspaceSnapshot()?.workbook
}

export function saveWorkspace(workbook: WorkbookData) {
  const savedAt = new Date().toISOString()
  localStorage.setItem(storageKey, JSON.stringify({ workbook, savedAt } satisfies WorkspaceSnapshot))
  return savedAt
}

export function parsePlantBackup(value: unknown): Plant[] {
  const plants = Array.isArray(value) ? value : undefined
  if (!plants?.length) throw new Error('Choose a non-empty plant-register backup JSON file.')

  const assetIds = new Set<string>()
  plants.forEach((plant, index) => {
    if (!plant || typeof plant !== 'object') throw new Error(`Record ${index + 1} is not a plant record.`)
    const candidate = plant as Record<string, unknown>
    if (requiredPlantFields.some((field) => typeof candidate[field] !== 'string' || !candidate[field])) throw new Error(`Record ${index + 1} is missing a required plant field.`)
    if (typeof candidate.netMw !== 'number' || !Number.isFinite(candidate.netMw)) throw new Error(`Record ${index + 1} has an invalid net MW value.`)
    if (typeof candidate.latitude !== 'number' || typeof candidate.longitude !== 'number' || typeof candidate.hasCoordinates !== 'boolean') throw new Error(`Record ${index + 1} has invalid location data.`)
    if (assetIds.has(candidate.assetId as string)) throw new Error(`Record ${index + 1} duplicates asset ID ${candidate.assetId}.`)
    assetIds.add(candidate.assetId as string)
  })

  return plants as Plant[]
}

export function filterPlants(plants: Plant[], filters: WorkspaceFilters) {
  const searchTerm = filters.query.trim().toLowerCase()
  return plants.filter((plant) => {
    const confidence = plant.confidenceScore ?? 0
    const matchesConfidence = filters.confidence === 'all'
      || (filters.confidence === 'high' && confidence >= 75)
      || (filters.confidence === 'medium' && confidence >= 50 && confidence < 75)
      || (filters.confidence === 'low' && confidence < 50)
    return (filters.includeArchived || plant.status !== 'Archived')
      && (!searchTerm || [plant.name, plant.nodeName, plant.nodeId, plant.region, plant.technology].join(' ').toLowerCase().includes(searchTerm))
      && (filters.country === 'all' || plant.country === filters.country)
      && (filters.region === 'all' || plant.region === filters.region)
      && (filters.technology === 'all' || plant.technology === filters.technology)
      && (filters.nodeId === 'all' || plant.nodeId === filters.nodeId)
      && (filters.retirementClass === 'all' || plant.retirementClass === filters.retirementClass)
      && matchesConfidence
  })
}
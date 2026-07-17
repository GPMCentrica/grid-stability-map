import type { Plant, WorkbookData, WorkspaceFilters } from '../models'

const storageKey = 'uk-grid-stability-workspace-v3'
const legacyStorageKey = 'uk-grid-stability-workspace-v2'

const requiredPlantFields = ['assetId', 'name', 'nodeId', 'nodeName', 'region', 'technology'] as const

interface WorkspaceSnapshot {
  workbook: WorkbookData
  savedAt: string
}

export interface SavedRegister extends WorkspaceSnapshot {
  id: string
  name: string
}

export interface WorkspaceStore {
  activeRegisterId: string
  registers: SavedRegister[]
}

function parseWorkspaceSnapshot(value: unknown): WorkspaceSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as Partial<WorkspaceSnapshot>
  return candidate.workbook && Array.isArray(candidate.workbook.plants) && typeof candidate.savedAt === 'string' ? candidate as WorkspaceSnapshot : undefined
}

export function loadWorkspaceStore(): WorkspaceStore | undefined {
  try {
    const stored = localStorage.getItem(storageKey) ?? localStorage.getItem(legacyStorageKey)
    if (!stored) return undefined
    const parsed = JSON.parse(stored) as WorkspaceStore | WorkbookData | WorkspaceSnapshot
    if ('registers' in parsed && Array.isArray(parsed.registers) && typeof parsed.activeRegisterId === 'string') {
      const registers = parsed.registers.filter((register): register is SavedRegister => Boolean(register) && typeof register.id === 'string' && typeof register.name === 'string' && Boolean(parseWorkspaceSnapshot(register)))
      if (registers.some((register) => register.id === parsed.activeRegisterId)) return { activeRegisterId: parsed.activeRegisterId, registers }
      return registers.length ? { activeRegisterId: registers[0].id, registers } : undefined
    }
    const snapshot = 'workbook' in parsed ? parseWorkspaceSnapshot(parsed) : { workbook: parsed as WorkbookData, savedAt: '' }
    return snapshot ? { activeRegisterId: 'current-register', registers: [{ id: 'current-register', name: 'Current register', ...snapshot }] } : undefined
  } catch {
    return undefined
  }
}

export function saveWorkspaceStore(store: WorkspaceStore) {
  localStorage.setItem(storageKey, JSON.stringify(store))
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
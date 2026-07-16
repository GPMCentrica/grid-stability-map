import type { Plant, WorkbookData, WorkspaceFilters } from '../models'

const storageKey = 'uk-grid-stability-workspace-v2'

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
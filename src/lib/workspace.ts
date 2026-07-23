import type { Plant, PortfolioId, WorkbookData, WorkspaceFilters } from '../models'

const storageKey = 'uk-grid-stability-workspace-v8'

const requiredPlantFields = ['assetId', 'name', 'nodeId', 'nodeName', 'region', 'technology'] as const

interface WorkspaceSnapshot {
  workbook: WorkbookData
  savedAt: string
}

export interface SavedRegister extends WorkspaceSnapshot {
  id: string
  name: string
}

export interface PortfolioWorkspaceStore {
  activeRegisterId: string
  registers: SavedRegister[]
}

export interface WorkspaceStore {
  portfolios: Partial<Record<PortfolioId, PortfolioWorkspaceStore>>
}

function parseWorkspaceSnapshot(value: unknown): WorkspaceSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as Partial<WorkspaceSnapshot>
  return candidate.workbook && Array.isArray(candidate.workbook.plants) && typeof candidate.savedAt === 'string' ? candidate as WorkspaceSnapshot : undefined
}

export function loadWorkspaceStore(): WorkspaceStore | undefined {
  try {
    const stored = localStorage.getItem(storageKey) ?? localStorage.getItem('uk-grid-stability-workspace-v7') ?? localStorage.getItem('uk-grid-stability-workspace-v6') ?? localStorage.getItem('uk-grid-stability-workspace-v5') ?? localStorage.getItem('uk-grid-stability-workspace-v4')
    if (!stored) return undefined
    const parsed = JSON.parse(stored) as WorkspaceStore | PortfolioWorkspaceStore | WorkbookData | WorkspaceSnapshot
    if ('portfolios' in parsed && parsed.portfolios && typeof parsed.portfolios === 'object') {
      const portfolios = Object.fromEntries((['retirement', 'future-generation', 'centrica'] as PortfolioId[]).flatMap((portfolio) => {
        const candidate = parsed.portfolios[portfolio]
        if (!candidate || !Array.isArray(candidate.registers) || typeof candidate.activeRegisterId !== 'string') return []
        const registers = candidate.registers.filter((register): register is SavedRegister => Boolean(register) && typeof register.id === 'string' && typeof register.name === 'string' && Boolean(parseWorkspaceSnapshot(register)))
        if (!registers.length) return []
        return [[portfolio, { activeRegisterId: registers.some((register) => register.id === candidate.activeRegisterId) ? candidate.activeRegisterId : registers[0].id, registers }]]
      })) as Partial<Record<PortfolioId, PortfolioWorkspaceStore>>
      return Object.keys(portfolios).length ? { portfolios } : undefined
    }
    if ('registers' in parsed && Array.isArray(parsed.registers) && typeof parsed.activeRegisterId === 'string') {
      const registers = parsed.registers.filter((register): register is SavedRegister => Boolean(register) && typeof register.id === 'string' && typeof register.name === 'string' && Boolean(parseWorkspaceSnapshot(register)))
      if (registers.length) return { portfolios: { retirement: { activeRegisterId: registers.some((register) => register.id === parsed.activeRegisterId) ? parsed.activeRegisterId : registers[0].id, registers } } }
    }
    const snapshot = 'workbook' in parsed ? parseWorkspaceSnapshot(parsed) : { workbook: parsed as WorkbookData, savedAt: '' }
    return snapshot ? { portfolios: { retirement: { activeRegisterId: 'published-register', registers: [{ id: 'published-register', name: 'Shared register - 17 Jul 2026', ...snapshot }] } } } : undefined
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

function csvText(row: Record<string, unknown>, column: string, recordNumber: number, required = false) {
  const value = String(row[column] ?? '').trim()
  if (required && !value) throw new Error(`Record ${recordNumber} is missing ${column}.`)
  return value
}

function csvNumber(row: Record<string, unknown>, column: string, recordNumber: number, required = false) {
  const value = csvText(row, column, recordNumber, required)
  if (!value) return undefined
  const number = Number(value)
  if (!Number.isFinite(number)) throw new Error(`Record ${recordNumber} has an invalid ${column} value.`)
  return number
}

export async function parsePlantCsv(text: string): Promise<Plant[]> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(text, { type: 'string' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) throw new Error('Choose a CSV file with a header row and at least one plant record.')
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false, defval: '' })
  if (!rows.length) throw new Error('Choose a CSV file with at least one plant record.')

  const plants = rows.map((row, index) => {
    const recordNumber = index + 2
    const status = csvText(row, 'status', recordNumber, true)
    if (!['Active', 'Retiring', 'Retired', 'Archived'].includes(status)) throw new Error(`Record ${recordNumber} has an unsupported status.`)
    const retirementBasis = csvText(row, 'retirement_basis', recordNumber)
    if (retirementBasis && !['Confirmed', 'Modelled', 'Unconfirmed'].includes(retirementBasis)) throw new Error(`Record ${recordNumber} has an unsupported retirement_basis.`)

    const latitude = csvNumber(row, 'latitude', recordNumber, true)
    const longitude = csvNumber(row, 'longitude', recordNumber, true)
    return {
      assetId: csvText(row, 'asset_id', recordNumber, true),
      name: csvText(row, 'plant_name', recordNumber, true),
      nodeId: csvText(row, 'node_id', recordNumber, true),
      nodeName: csvText(row, 'node_substation', recordNumber, true),
      country: csvText(row, 'country', recordNumber, true),
      region: csvText(row, 'region', recordNumber, true),
      technology: csvText(row, 'technology', recordNumber, true),
      netMw: csvNumber(row, 'net_mw', recordNumber, true)!,
      ownerGroup: csvText(row, 'owner_group', recordNumber) || undefined,
      projectStatus: csvText(row, 'project_status', recordNumber) as Plant['projectStatus'],
      commissioningDate: csvText(row, 'commissioning_date', recordNumber) || undefined,
      commissioningBasis: csvText(row, 'commissioning_basis', recordNumber) as Plant['commissioningBasis'],
      modelledCommissioningYear: csvNumber(row, 'modelled_commissioning_year', recordNumber),
      modelledCommissioningReason: csvText(row, 'modelled_commissioning_reason', recordNumber) || undefined,
      status: status as Plant['status'],
      latitude: latitude!,
      longitude: longitude!,
      hasCoordinates: true,
      retirementDate: csvText(row, 'retirement_date', recordNumber) || undefined,
      retirementBasis: retirementBasis as Plant['retirementBasis'],
      retirementClass: csvText(row, 'retirement_class', recordNumber) || undefined,
      confidenceScore: csvNumber(row, 'confidence_score', recordNumber),
      evidenceSource: csvText(row, 'evidence_source', recordNumber) || undefined,
      modelledRetirementYear: csvNumber(row, 'modelled_retirement_year', recordNumber),
      modelledRetirementReason: csvText(row, 'modelled_retirement_reason', recordNumber) || undefined,
      inertiaProxy: csvNumber(row, 'inertiaProxy', recordNumber),
      faultLevelProxy: csvNumber(row, 'faultLevelProxy', recordNumber),
      reactiveProxy: csvNumber(row, 'reactiveProxy', recordNumber),
      notes: csvText(row, 'data_quality_note', recordNumber) || undefined,
    }
  })

  return parsePlantBackup(plants)
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
      && (!searchTerm || [plant.name, plant.nodeName, plant.nodeId, plant.region, plant.technology, plant.ownerGroup].join(' ').toLowerCase().includes(searchTerm))
      && (filters.country === 'all' || plant.country === filters.country)
      && (filters.region === 'all' || plant.region === filters.region)
      && (filters.technology === 'all' || plant.technology === filters.technology)
      && (filters.nodeId === 'all' || plant.nodeId === filters.nodeId)
      && (filters.retirementClass === 'all' || plant.retirementClass === filters.retirementClass)
      && matchesConfidence
  })
}
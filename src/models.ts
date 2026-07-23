export type HorizonYear = 2026 | 2030 | 2040 | 2050
export type RiskLevel = 'low' | 'medium' | 'high'
export type RetiredAssetMode = 'hide' | 'fade'
export type PlantStatus = 'Active' | 'Retiring' | 'Retired' | 'Archived'
export type PortfolioId = 'retirement' | 'future-generation' | 'centrica'
export type NeedLayer = 'none' | 'inertia' | 'scl' | 'voltage'
export interface NetworkLayerOptions {
  transmission: boolean
  substations: boolean
  lowerVoltage: boolean
  future: boolean
}
export type RetirementBasis = 'Confirmed' | 'Modelled' | 'Unconfirmed'

export interface Coordinates {
  latitude: number
  longitude: number
}

export interface PlaceResult extends Coordinates {
  name: string
  description: string
  registeredPlant?: Plant
}

export interface Plant extends Coordinates {
  assetId: string
  name: string
  nodeId: string
  nodeName: string
  region: string
  country?: string
  technology: string
  netMw: number
  ownerGroup?: string
  projectStatus?: 'Proposed' | 'Consented' | 'Under construction' | 'Operational'
  commissioningDate?: string
  commissioningBasis?: RetirementBasis
  modelledCommissioningYear?: number
  modelledCommissioningReason?: string
  retirementDate?: string
  retirementBasis?: RetirementBasis
  modelledRetirementYear?: number
  modelledRetirementReason?: string
  retirementClass?: string
  confidenceScore?: number
  evidenceSource?: string
  notes?: string
  status?: PlantStatus
  inertiaProxy?: number
  faultLevelProxy?: number
  reactiveProxy?: number
  hasCoordinates: boolean
}

export interface RiskNode extends Coordinates {
  nodeId: string
  nodeName: string
  region: string
  deficits: Record<2030 | 2040 | 2050, number>
  timingClassification: string
  confidenceScore?: number
  hasCoordinates: boolean
}

export interface CoordinateRecord extends Coordinates {
  nodeId?: string
  nodeName?: string
  plantName?: string
}

export interface WorkbookData {
  plants: Plant[]
  riskNodes: RiskNode[]
  importedFileName: string
}

export interface WorkspaceFilters {
  query: string
  country: string
  region: string
  technology: string
  nodeId: string
  confidence: 'all' | 'high' | 'medium' | 'low'
  retirementClass: string
  includeArchived: boolean
}

export const emptyWorkspaceFilters: WorkspaceFilters = {
  query: '',
  country: 'all',
  region: 'all',
  technology: 'all',
  nodeId: 'all',
  confidence: 'all',
  retirementClass: 'all',
  includeArchived: false,
}

export interface FutureLayerDefinition {
  id: string
  label: string
  description: string
  visible: boolean
}

export const FUTURE_LAYER_DEFINITIONS: FutureLayerDefinition[] = [
  { id: 'synchronous-condensers', label: 'Synchronous Condensers', description: 'Stability support assets', visible: false },
  { id: 'bess', label: 'BESS', description: 'Battery energy storage', visible: false },
  { id: 'substations', label: 'Substations', description: 'Transmission network assets', visible: false },
  { id: 'ai-data-centres', label: 'AI Data Centres', description: 'Future demand centres', visible: false },
  { id: 'opportunity-sites', label: 'Opportunity Sites', description: 'Candidate intervention locations', visible: false },
]
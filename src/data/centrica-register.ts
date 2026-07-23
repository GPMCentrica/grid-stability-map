import type { Plant, WorkbookData } from '../models'

type Lifecycle = 'Operational' | 'AUC'

interface OperationalRecord {
  assetId: string
  name: string
  nodeName: string
  region: string
  country: string
  technology: string
  netMw: number
  lifecycle: Lifecycle
  latitude?: number
  longitude?: number
  voltageKv?: number
  commissioningDate?: string
  retirementDate?: string
}

const operationalRecords: OperationalRecord[] = [
  { assetId: 'CEN-OPS-001', name: 'Sizewell B', nodeName: 'Sizewell', region: 'East of England', country: 'Great Britain', technology: 'Nuclear', netMw: 239.6, lifecycle: 'Operational', latitude: 52.2149, longitude: 1.6199, voltageKv: 400, retirementDate: '2055-03-31' },
  { assetId: 'CEN-OPS-002', name: 'Brigg DG2', nodeName: 'South Humberside', region: 'Yorkshire and the Humber', country: 'Great Britain', technology: 'Gas Peakers', netMw: 48, lifecycle: 'Operational', latitude: 53.5417, longitude: -0.5037, voltageKv: 132 },
  { assetId: 'CEN-OPS-003', name: 'Brigg DG', nodeName: 'South Humberside', region: 'Yorkshire and the Humber', country: 'Great Britain', technology: 'Gas Peakers', netMw: 49, lifecycle: 'Operational', latitude: 53.5414, longitude: -0.5052, voltageKv: 132 },
  { assetId: 'CEN-OPS-004', name: 'Brigg LDES', nodeName: 'South Humberside', region: 'Yorkshire and the Humber', country: 'Great Britain', technology: 'BESS', netMw: 50, lifecycle: 'Operational', latitude: 53.5412, longitude: -0.5067, voltageKv: 132 },
  { assetId: 'CEN-OPS-005', name: 'Knapton', nodeName: 'Knapton', region: 'Yorkshire and the Humber', country: 'Great Britain', technology: 'BESS', netMw: 40, lifecycle: 'AUC', latitude: 54.1814, longitude: -0.6422, voltageKv: 132, commissioningDate: '2026-09-30' },
  { assetId: 'CEN-OPS-006', name: 'Hartlepool', nodeName: 'Hartlepool', region: 'North East', country: 'Great Britain', technology: 'Nuclear', netMw: 237, lifecycle: 'Operational', latitude: 54.6355, longitude: -1.1811, voltageKv: 275, retirementDate: '2028-03-31' },
  { assetId: 'CEN-OPS-007', name: 'Nursling', nodeName: 'Nursling', region: 'South East', country: 'Great Britain', technology: 'BESS', netMw: 50, lifecycle: 'AUC', latitude: 50.940506, longitude: -1.494995, voltageKv: 400, commissioningDate: '2027-02-28' },
  { assetId: 'CEN-OPS-008', name: 'Rolleston', nodeName: 'Rolleston', region: 'East Midlands', country: 'Great Britain', technology: 'Solar', netMw: 18, lifecycle: 'AUC', latitude: 52.8497, longitude: -1.6804, voltageKv: 33, commissioningDate: '2026-05-31' },
  { assetId: 'CEN-OPS-009', name: 'Redditch', nodeName: 'Redditch', region: 'West Midlands', country: 'Great Britain', technology: 'Gas Peakers', netMw: 20, lifecycle: 'Operational', latitude: 52.2895, longitude: -1.913, voltageKv: 66 },
  { assetId: 'CEN-OPS-010', name: 'Codford', nodeName: 'Wiltshire', region: 'South West', country: 'Great Britain', technology: 'Solar', netMw: 18, lifecycle: 'Operational', latitude: 51.1566, longitude: -2.0391, voltageKv: 11 },
  { assetId: 'CEN-OPS-011', name: 'Roundponds', nodeName: 'Wiltshire', region: 'South West', country: 'Great Britain', technology: 'Solar', netMw: 13, lifecycle: 'Operational', latitude: 51.3798, longitude: -2.1511, voltageKv: 33 },
  { assetId: 'CEN-OPS-012', name: 'Dyce 2', nodeName: 'Dyce', region: 'Scotland', country: 'Great Britain', technology: 'BESS', netMw: 30, lifecycle: 'AUC', latitude: 57.2007, longitude: -2.19, voltageKv: 132, commissioningDate: '2026-10-31' },
  { assetId: 'CEN-OPS-013', name: 'Winterborne', nodeName: 'Winterborne', region: 'South West', country: 'Great Britain', technology: 'Solar', netMw: 15, lifecycle: 'AUC', latitude: 50.7953, longitude: -2.2235, voltageKv: 33, commissioningDate: '2026-08-31' },
  { assetId: 'CEN-OPS-014', name: 'Torness', nodeName: 'Torness', region: 'Scotland', country: 'Great Britain', technology: 'Nuclear', netMw: 238, lifecycle: 'Operational', latitude: 55.9686, longitude: -2.4094, voltageKv: 400, retirementDate: '2030-03-31' },
  { assetId: 'CEN-OPS-015', name: 'Heysham 1', nodeName: 'Heysham 1', region: 'North West', country: 'Great Britain', technology: 'Nuclear', netMw: 220, lifecycle: 'Operational', latitude: 54.0719, longitude: -2.8669, voltageKv: 400, retirementDate: '2028-03-31' },
  { assetId: 'CEN-OPS-016', name: 'Heysham 2', nodeName: 'Heysham 2', region: 'North West', country: 'Great Britain', technology: 'Nuclear', netMw: 245, lifecycle: 'Operational', latitude: 54.0302, longitude: -2.9174, voltageKv: 400, retirementDate: '2030-03-31' },
  { assetId: 'CEN-OPS-017', name: 'RBESS', nodeName: 'Barrow-in-Furness', region: 'North West', country: 'Great Britain', technology: 'BESS', netMw: 49, lifecycle: 'Operational', latitude: 54.1108, longitude: -3.2261, voltageKv: 132 },
  { assetId: 'CEN-OPS-018', name: 'Pencoed', nodeName: 'Pencoed', region: 'Wales', country: 'Great Britain', technology: 'Gas Peakers', netMw: 40, lifecycle: 'AUC', latitude: 51.5221, longitude: -3.4836, voltageKv: 132, commissioningDate: '2026-10-31' },
  { assetId: 'CEN-OPS-019', name: 'Sizewell C', nodeName: 'Sizewell', region: 'East of England', country: 'Great Britain', technology: 'Nuclear', netMw: 491.7, lifecycle: 'AUC', latitude: 52.2193, longitude: 1.6203, voltageKv: 400, commissioningDate: '2038-06-30' },
  { assetId: 'CEN-OPS-020', name: 'Carrington', nodeName: 'Carrington', region: 'North West', country: 'Great Britain', technology: 'LAES', netMw: 50, lifecycle: 'AUC', voltageKv: 400 },
  { assetId: 'CEN-OPS-021', name: 'Hunterston', nodeName: 'Hunterston', region: 'Scotland', country: 'Great Britain', technology: 'LDES', netMw: 0, lifecycle: 'AUC', voltageKv: 400 },
  { assetId: 'CEN-OPS-022', name: 'Camelot', nodeName: 'Severn', region: 'South West', country: 'Great Britain', technology: 'CCGT', netMw: 850, lifecycle: 'Operational', voltageKv: 400 },
  { assetId: 'CEN-OPS-023', name: 'Bullerforsen', nodeName: 'Dalarna County', region: 'Dalarna County', country: 'Sweden', technology: 'BESS', netMw: 20, lifecycle: 'Operational', latitude: 60.5237, longitude: 15.3898, voltageKv: 130, commissioningDate: '2026-03-31' },
  { assetId: 'CEN-OPS-024', name: 'Romme', nodeName: 'Romme', region: 'Dalarna County', country: 'Sweden', technology: 'BESS', netMw: 20, lifecycle: 'Operational', latitude: 60.458, longitude: 15.5431, voltageKv: 47, commissioningDate: '2026-03-31' },
  { assetId: 'CEN-OPS-025', name: 'Whitegate', nodeName: 'Whitegate', region: 'County Cork', country: 'Ireland', technology: 'CCGT', netMw: 445, lifecycle: 'Operational', latitude: 51.8157, longitude: -8.2517, voltageKv: 220 },
  { assetId: 'CEN-OPS-026', name: 'Profile Park', nodeName: 'Kildare', region: 'County Kildare', country: 'Ireland', technology: 'Gas Peakers', netMw: 100, lifecycle: 'AUC', latitude: 53.3153, longitude: -6.4433, voltageKv: 220, commissioningDate: '2026-06-30' },
  { assetId: 'CEN-OPS-027', name: 'Athlone', nodeName: 'Athlone', region: 'County Westmeath', country: 'Ireland', technology: 'Gas Peakers', netMw: 100, lifecycle: 'AUC', latitude: 53.4166, longitude: -7.9925, voltageKv: 110, commissioningDate: '2026-06-30' },
  { assetId: 'CEN-OPS-028', name: 'Terhills', nodeName: 'Terhills', region: 'Limburg', country: 'Belgium', technology: 'BESS', netMw: 18, lifecycle: 'Operational', latitude: 51.0285, longitude: 5.7311 },
  { assetId: 'CEN-OPS-029', name: 'OBC', nodeName: 'Ostend', region: 'West Flanders', country: 'Belgium', technology: 'BESS', netMw: 24, lifecycle: 'Operational', latitude: 51.2161, longitude: 2.9296 },
]

const nodeIdFor = (nodeName: string) => `CEN-NODE-${nodeName.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '')}`

const toPlant = (record: OperationalRecord): Plant => ({
  assetId: record.assetId,
  name: record.name,
  nodeId: nodeIdFor(record.nodeName),
  nodeName: record.nodeName,
  region: record.region,
  country: record.country,
  technology: record.technology,
  netMw: record.netMw,
  ownerGroup: 'Centrica',
  projectStatus: record.lifecycle === 'AUC' ? 'Under construction' : 'Operational',
  commissioningDate: record.commissioningDate,
  commissioningBasis: record.commissioningDate ? 'Confirmed' : undefined,
  retirementDate: record.retirementDate,
  retirementBasis: record.retirementDate ? 'Confirmed' : 'Unconfirmed',
  retirementClass: record.retirementDate ? 'Published decommissioning date' : 'Unconfirmed',
  confidenceScore: 75,
  evidenceSource: 'Operational Data.xlsx · Operational Data',
  notes: [`Source lifecycle: ${record.lifecycle}`, record.voltageKv ? `Connection voltage: ${record.voltageKv} kV` : 'Connection voltage: not supplied', record.netMw > 0 ? undefined : 'Capacity: not supplied in source workbook'].filter(Boolean).join('. '),
  status: 'Active',
  latitude: record.latitude ?? 0,
  longitude: record.longitude ?? 0,
  hasCoordinates: record.latitude !== undefined && record.longitude !== undefined,
})

export const centricaRegister: WorkbookData = {
  importedFileName: 'Operational Data.xlsx · Operational Data',
  riskNodes: [],
  plants: operationalRecords.map(toPlant),
}
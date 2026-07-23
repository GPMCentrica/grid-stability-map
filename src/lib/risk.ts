import type { HorizonYear, Plant, RiskLevel, RiskNode } from '../models'

export function technologyColour(technology: string) {
  const value = technology.toLowerCase()
  if (value.includes('nuclear')) return '#0f2067'
  if (value.includes('pumped storage') || value === 'hydro') return '#036130'
  if (value.includes('battery') || value.includes('bess') || value.includes('ldes') || value.includes('laes')) return '#b999f6'
  if (value.includes('wind')) return '#29b263'
  if (value.includes('solar')) return '#85db9c'
  if (value.includes('biomass') || value.includes('waste')) return '#664fad'
  if (value.includes('coal') || value.includes('oil') || value.includes('hfo') || value.includes('emergency')) return '#a50091'
  if (value.includes('ccgt') || value.includes('ocgt') || value.includes('gas')) return '#3675c2'
  return '#7b92a3'
}

export function isRetiredByYear(plant: Plant, year: HorizonYear) {
  const retirementYear = effectiveRetirementYear(plant)
  return retirementYear !== undefined && retirementYear <= year
}

export function effectiveRetirementYear(plant: Plant) {
  if (plant.retirementBasis === 'Modelled') return plant.modelledRetirementYear
  if (plant.retirementDate) return Number(plant.retirementDate.slice(0, 4))
  return undefined
}

export function effectiveCommissioningYear(plant: Plant) {
  if (plant.commissioningBasis === 'Modelled') return plant.modelledCommissioningYear
  if (plant.commissioningDate) return Number(plant.commissioningDate.slice(0, 4))
  return undefined
}

export function retirementLabel(plant: Plant) {
  if (plant.retirementBasis === 'Modelled' && plant.modelledRetirementYear) return `Modelled ${plant.modelledRetirementYear}`
  if (plant.retirementBasis === 'Confirmed' && plant.retirementDate) return `Confirmed ${plant.retirementDate}`
  if (plant.retirementDate) return `Modelled ${plant.retirementDate.slice(0, 4)}`
  return 'Unconfirmed'
}

export function commissioningLabel(plant: Plant) {
  if (plant.commissioningBasis === 'Modelled' && plant.modelledCommissioningYear) return `Modelled ${plant.modelledCommissioningYear}`
  if (plant.commissioningBasis === 'Confirmed' && plant.commissioningDate) return `Confirmed ${plant.commissioningDate}`
  if (plant.commissioningDate) return `Modelled ${plant.commissioningDate.slice(0, 4)}`
  return 'Unconfirmed'
}

export function riskForYear(node: RiskNode, year: HorizonYear) {
  const riskYear = year === 2026 ? 2030 : year
  return node.deficits[riskYear]
}

export function riskLevel(deficit: number): RiskLevel {
  if (deficit >= 0.7) return 'high'
  if (deficit >= 0.25) return 'medium'
  return 'low'
}

export function riskColour(deficit: number) {
  return { low: '#29b263', medium: '#b999f6', high: '#a50091' }[riskLevel(deficit)]
}

export function riskLabel(deficit: number) {
  return { low: 'Secure', medium: 'Under pressure', high: 'Critical gap' }[riskLevel(deficit)]
}

export function formatMw(value: number) {
  return `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(value)} MW`
}

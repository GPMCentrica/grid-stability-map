import type { HorizonYear, Plant, RiskLevel, RiskNode } from '../models'

export const technologyColours = ['#0f2067', '#85db9c', '#b999f6', '#664fad', '#d03e9d', '#3675c2', '#036130']

export function technologyColour(technology: string) {
  const hash = [...technology].reduce((total, character) => total + character.charCodeAt(0), 0)
  return technologyColours[hash % technologyColours.length]
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

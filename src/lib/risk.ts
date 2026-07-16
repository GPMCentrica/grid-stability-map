import type { HorizonYear, Plant, RiskLevel, RiskNode } from '../models'

export const technologyColours = ['#006e75', '#2e8b57', '#d27800', '#6654a5', '#a93d5c', '#496b9c', '#58706f']

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

export function retirementLabel(plant: Plant) {
  if (plant.retirementBasis === 'Modelled' && plant.modelledRetirementYear) return `Modelled ${plant.modelledRetirementYear}`
  if (plant.retirementBasis === 'Confirmed' && plant.retirementDate) return `Confirmed ${plant.retirementDate}`
  if (plant.retirementDate) return `Modelled ${plant.retirementDate.slice(0, 4)}`
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
  return { low: '#1f8a56', medium: '#d7901a', high: '#c53b3e' }[riskLevel(deficit)]
}

export function riskLabel(deficit: number) {
  return { low: 'Secure', medium: 'Under pressure', high: 'Critical gap' }[riskLevel(deficit)]
}

export function formatMw(value: number) {
  return `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(value)} MW`
}

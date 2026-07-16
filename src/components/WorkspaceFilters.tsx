import { Search, SlidersHorizontal } from 'lucide-react'
import type { Plant, WorkspaceFilters as FilterState } from '../models'

interface WorkspaceFiltersProps {
  plants: Plant[]
  filters: FilterState
  onChange: (filters: FilterState) => void
  compact?: boolean
}

const uniqueValues = (plants: Plant[], key: keyof Plant) => [...new Set(plants.map((plant) => String(plant[key] ?? '')).filter(Boolean))].sort()

export function WorkspaceFilters({ plants, filters, onChange, compact = false }: WorkspaceFiltersProps) {
  const update = (partial: Partial<FilterState>) => onChange({ ...filters, ...partial })
  const suggestions = new Map<string, string>()
  plants.forEach((plant) => {
    suggestions.set(plant.name, `Plant · ${plant.nodeName || plant.region}`)
    if (plant.nodeName) suggestions.set(plant.nodeName, `Grid location · ${plant.region}`)
    if (plant.region) suggestions.set(plant.region, 'Region')
    if (plant.technology) suggestions.set(plant.technology, 'Technology')
    if (plant.country) suggestions.set(plant.country, 'Market')
  })
  return (
    <section className={`workspace-filters ${compact ? 'compact' : ''}`} aria-label="Register filters">
      {!compact && <div className="filter-heading"><SlidersHorizontal size={15} /><span>Filter records</span></div>}
      <label className="filter-search"><Search size={16} /><input list="workspace-search-suggestions" value={filters.query} onChange={(event) => update({ query: event.target.value })} placeholder="Search or choose a plant, location or region" /></label>
      <datalist id="workspace-search-suggestions">{[...suggestions.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([value, label]) => <option key={`${label}-${value}`} value={value} label={label} />)}</datalist>
      {!compact && <select value={filters.country} onChange={(event) => update({ country: event.target.value })}><option value="all">All markets</option>{uniqueValues(plants, 'country').map((value) => <option key={value}>{value}</option>)}</select>}
      <select value={filters.region} onChange={(event) => update({ region: event.target.value })}><option value="all">All regions</option>{uniqueValues(plants, 'region').map((value) => <option key={value}>{value}</option>)}</select>
      <select value={filters.technology} onChange={(event) => update({ technology: event.target.value })}><option value="all">All technologies</option>{uniqueValues(plants, 'technology').map((value) => <option key={value}>{value}</option>)}</select>
      {!compact && <select value={filters.nodeId} onChange={(event) => update({ nodeId: event.target.value })}><option value="all">All locations</option>{uniqueValues(plants, 'nodeId').map((value) => <option key={value}>{value}</option>)}</select>}
      {!compact && <select value={filters.confidence} onChange={(event) => update({ confidence: event.target.value as FilterState['confidence'] })}><option value="all">All confidence</option><option value="high">High confidence</option><option value="medium">Medium confidence</option><option value="low">Low confidence</option></select>}
      {!compact && <select value={filters.retirementClass} onChange={(event) => update({ retirementClass: event.target.value })}><option value="all">All retirement classes</option>{uniqueValues(plants, 'retirementClass').map((value) => <option key={value}>{value}</option>)}</select>}
    </section>
  )
}
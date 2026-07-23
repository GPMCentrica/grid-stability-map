import type { Plant } from '../models'
import { effectiveCommissioningYear, effectiveRetirementYear, formatMw } from '../lib/risk'

interface TimelineViewProps {
  retirementPlants: Plant[]
  futurePlants: Plant[]
}

interface TimelineEntry {
  year: number
  retiring: number
  commissioning: number
}

export function TimelineView({ retirementPlants, futurePlants }: TimelineViewProps) {
  const byYear = new Map<number, TimelineEntry>()
  retirementPlants.forEach((plant) => {
    const year = effectiveRetirementYear(plant)
    if (year && Number.isFinite(year)) byYear.set(year, { ...(byYear.get(year) ?? { year, retiring: 0, commissioning: 0 }), retiring: (byYear.get(year)?.retiring ?? 0) + plant.netMw })
  })
  futurePlants.forEach((plant) => {
    const year = effectiveCommissioningYear(plant)
    if (year && Number.isFinite(year)) byYear.set(year, { ...(byYear.get(year) ?? { year, retiring: 0, commissioning: 0 }), commissioning: (byYear.get(year)?.commissioning ?? 0) + plant.netMw })
  })
  const entries = [...byYear.values()].sort((left, right) => left.year - right.year)
  const maxMw = Math.max(...entries.flatMap((entry) => [entry.retiring, entry.commissioning]), 1)
  const totalRetiring = entries.reduce((sum, entry) => sum + entry.retiring, 0)
  const totalCommissioning = entries.reduce((sum, entry) => sum + entry.commissioning, 0)
  let cumulativeNet = 0

  return <section className="workspace-view timeline-view"><div className="view-heading"><div><p>System transition profile</p><h2>Retirement and commissioning timeline</h2><span>Active Retirement and Future Generation registers</span></div></div><div className="timeline-summary"><article><span>Scheduled retiring capacity</span><strong>{formatMw(totalRetiring)}</strong></article><article><span>Expected commissioning capacity</span><strong>{formatMw(totalCommissioning)}</strong></article><article><span>Net scheduled change</span><strong>{formatMw(totalCommissioning - totalRetiring)}</strong></article></div><div className="timeline-chart timeline-chart-comparison" role="img" aria-label="Capacity retirement and commissioning by year">
    {entries.map((entry) => { cumulativeNet += entry.commissioning - entry.retiring; return <div className="timeline-bar" key={entry.year}><div className="bar-track comparison-track"><div className="bar-fill retirement-bar" style={{ height: `${Math.max(0, entry.retiring / maxMw * 100)}%` }}><span>{entry.retiring ? `-${formatMw(entry.retiring)}` : ''}</span></div><div className="bar-fill commissioning-bar" style={{ height: `${Math.max(0, entry.commissioning / maxMw * 100)}%` }}><span>{entry.commissioning ? `+${formatMw(entry.commissioning)}` : ''}</span></div></div><strong>{entry.year}</strong><small>{formatMw(cumulativeNet)} net</small></div> })}
    {!entries.length && <div className="empty-state">No dated retirement or commissioning records are available.</div>}
  </div><div className="timeline-legend"><span className="timeline-key retirement-key" />Retirement <span className="timeline-key commissioning-key" />Future commissioning</div></section>
}
import type { Plant } from '../models'
import { effectiveRetirementYear, formatMw } from '../lib/risk'

interface TimelineViewProps { plants: Plant[] }

export function TimelineView({ plants }: TimelineViewProps) {
  const data = [...plants.filter((plant) => effectiveRetirementYear(plant))].reduce((years, plant) => {
    const year = effectiveRetirementYear(plant)
    if (year !== undefined && Number.isFinite(year)) years.set(year, (years.get(year) ?? 0) + plant.netMw)
    return years
  }, new Map<number, number>())
  const entries = [...data.entries()].sort(([left], [right]) => left - right)
  const maxMw = Math.max(...entries.map(([, mw]) => mw), 1)
  let cumulativeMw = 0
  return <section className="workspace-view timeline-view"><div className="view-heading"><div><p>Retirement profile</p><h2>Capacity timeline</h2><span>Filtered records only</span></div></div><div className="timeline-summary"><article><span>Scheduled retiring capacity</span><strong>{formatMw(entries.reduce((total, [, mw]) => total + mw, 0))}</strong></article><article><span>Confirmed retirement years</span><strong>{entries.length}</strong></article><article><span>Largest single-year change</span><strong>{entries.length ? formatMw(Math.max(...entries.map(([, mw]) => mw))) : '0 MW'}</strong></article></div><div className="timeline-chart" role="img" aria-label="Capacity retirement by year">
    {entries.map(([year, mw]) => { cumulativeMw += mw; return <div className="timeline-bar" key={year}><div className="bar-track"><div className="bar-fill" style={{ height: `${Math.max(5, mw / maxMw * 100)}%` }}><span>{formatMw(mw)}</span></div></div><strong>{year}</strong><small>{formatMw(cumulativeMw)} cumulative</small></div> })}
    {!entries.length && <div className="empty-state">No dated retirement records match the current filters.</div>}
  </div></section>
}
import { useState } from 'react'
import { CalendarClock, MapPinned, Zap } from 'lucide-react'
import type { HorizonYear, Plant } from '../models'
import { effectiveRetirementYear, formatMw, isRetiredByYear, retirementLabel } from '../lib/risk'

interface DashboardPanelProps {
  plants: Plant[]
  year: HorizonYear
  selectedPlant?: Plant
}

const retiredMwByYear = (plants: Plant[], year: number) => plants.filter((plant) => plant.retirementDate && Number(plant.retirementDate.slice(0, 4)) <= year).reduce((sum, plant) => sum + plant.netMw, 0)

export function DashboardPanel({ plants, year, selectedPlant }: DashboardPanelProps) {
  const [position, setPosition] = useState({ left: 16, top: 16 })
  const [dragStart, setDragStart] = useState<{ x: number, y: number, left: number, top: number }>()
  const retiredCapacity = plants.filter((plant) => isRetiredByYear(plant, year)).reduce((sum, plant) => sum + plant.netMw, 0)
  const affectedLocations = new Set(plants.filter((plant) => isRetiredByYear(plant, year)).map((plant) => plant.nodeId)).size
  const nextPlant = [...plants].filter((plant) => plant.retirementDate && Number(plant.retirementDate.slice(0, 4)) >= 2026).sort((left, right) => (left.retirementDate ?? '').localeCompare(right.retirementDate ?? ''))[0]
  const locationPlants = selectedPlant ? plants.filter((plant) => plant.nodeId === selectedPlant.nodeId) : []
  const locationName = selectedPlant?.nodeName || selectedPlant?.nodeId
  const locationRetiringMw = locationPlants.filter((plant) => isRetiredByYear(plant, year)).reduce((sum, plant) => sum + plant.netMw, 0)
  const locationNextRetirement = [...locationPlants].filter((plant) => effectiveRetirementYear(plant)).sort((left, right) => (effectiveRetirementYear(left) ?? 9999) - (effectiveRetirementYear(right) ?? 9999))[0]
  const localCapacity = locationPlants.reduce((sum, plant) => sum + plant.netMw, 0)
  const selectedShare = selectedPlant && localCapacity ? Math.round(selectedPlant.netMw / localCapacity * 100) : 0

  return (
    <aside className="dashboard-panel" style={{ left: position.left, top: position.top }} aria-label="Grid stability dashboard">
      <div className="panel-heading panel-drag-handle" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragStart({ x: event.clientX, y: event.clientY, left: position.left, top: position.top }) }} onPointerMove={(event) => { if (dragStart) { const panel = event.currentTarget.parentElement; const workspace = panel?.parentElement; const maxLeft = Math.max(8, (workspace?.clientWidth ?? 340) - (panel?.offsetWidth ?? 316) - 8); const maxTop = Math.max(8, (workspace?.clientHeight ?? 600) - (panel?.offsetHeight ?? 400) - 8); setPosition({ left: Math.min(maxLeft, Math.max(8, dragStart.left + event.clientX - dragStart.x)), top: Math.min(maxTop, Math.max(8, dragStart.top + event.clientY - dragStart.y)) }) } }} onPointerUp={() => setDragStart(undefined)}>
        <p>Retirement outlook</p>
        <h2>{year} planning horizon</h2>
      </div>
      <div className="metric-grid">
        <article className="metric-card"><Zap aria-hidden="true" /><span>Capacity retiring</span><strong>{formatMw(retiredCapacity)}</strong></article>
        <article className="metric-card"><MapPinned aria-hidden="true" /><span>Locations affected</span><strong>{affectedLocations}</strong></article>
        <article className="metric-card metric-card-wide"><CalendarClock aria-hidden="true" /><span>Next known retirement</span><strong>{nextPlant ? nextPlant.name : 'No date recorded'}</strong><small>{nextPlant?.retirementDate ?? 'Add dates in the register'}</small></article>
      </div>

      {selectedPlant && (
        <section className="location-summary">
          <header><div><span>Selected site</span><strong>{selectedPlant.name}</strong><small>{locationName} · {selectedPlant.region}</small></div><b>{formatMw(selectedPlant.netMw)}</b></header>
          <div className="selected-site-outlook"><div><i>Retirement outlook</i><strong>{retirementLabel(selectedPlant)}</strong>{selectedPlant.retirementBasis === 'Modelled' && selectedPlant.modelledRetirementReason && <small>{selectedPlant.modelledRetirementReason}</small>}</div><div><i>Confidence</i><strong>{selectedPlant.confidenceScore ?? 'Not scored'}{selectedPlant.confidenceScore ? '/100' : ''}</strong><small>{selectedPlant.evidenceSource || 'No evidence source recorded'}</small></div></div>
          <div className="location-facts"><span><i>By {year}</i><strong>{formatMw(locationRetiringMw)}</strong></span><span><i>Local capacity share</i><strong>{selectedShare}%</strong></span><span><i>Next at location</i><strong>{locationNextRetirement ? `${locationNextRetirement.name} · ${effectiveRetirementYear(locationNextRetirement)}` : 'Unconfirmed'}</strong></span></div>
          <div className="location-assets">{locationPlants.sort((left, right) => (effectiveRetirementYear(left) ?? 9999) - (effectiveRetirementYear(right) ?? 9999)).slice(0, 4).map((plant) => <div key={plant.assetId} className={plant.assetId === selectedPlant.assetId ? 'selected-asset' : ''}><span>{plant.name}</span><b>{formatMw(plant.netMw)}</b><small>{retirementLabel(plant)}</small></div>)}</div>
        </section>
      )}

      <section className="deficit-list">
        <div className="section-heading"><h3>{selectedPlant ? 'Cumulative retirement at this location' : 'Retirement timeline'}</h3><span>{selectedPlant ? locationPlants.length + ' assets' : 'Cumulative MW'}</span></div>
        <ol>
          {[2030, 2040, 2050].map((timelineYear, index) => (
            <li key={timelineYear}>
              <span className="rank">{String(index + 1).padStart(2, '0')}</span>
              <span className="node-name">By {timelineYear}</span>
              <span className="deficit-value">{formatMw(retiredMwByYear(selectedPlant ? locationPlants : plants, timelineYear))}</span>
            </li>
          ))}
          {!plants.length && <li className="empty-list">Import a workbook to populate the retirement timeline.</li>}
        </ol>
      </section>
    </aside>
  )
}
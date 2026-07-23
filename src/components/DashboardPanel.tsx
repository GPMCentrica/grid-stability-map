import { useState } from 'react'
import { CalendarClock, MapPinned, Zap } from 'lucide-react'
import type { HorizonYear, Plant, PortfolioId } from '../models'
import { commissioningLabel, effectiveCommissioningYear, effectiveRetirementYear, formatMw, isRetiredByYear, retirementLabel } from '../lib/risk'

interface DashboardPanelProps {
  plants: Plant[]
  year: HorizonYear
  selectedPlant?: Plant
  portfolio: PortfolioId
}

const retiredMwByYear = (plants: Plant[], year: number) => plants.filter((plant) => plant.retirementDate && Number(plant.retirementDate.slice(0, 4)) <= year).reduce((sum, plant) => sum + plant.netMw, 0)

export function DashboardPanel({ plants, year, selectedPlant, portfolio }: DashboardPanelProps) {
  const [position, setPosition] = useState({ left: 16, top: 16 })
  const [dragStart, setDragStart] = useState<{ x: number, y: number, left: number, top: number }>()
  const isFuture = portfolio === 'future-generation'
  const timingYear = (plant: Plant) => isFuture ? effectiveCommissioningYear(plant) : effectiveRetirementYear(plant)
  const isTimedByYear = (plant: Plant) => isFuture ? Boolean(timingYear(plant) && timingYear(plant)! <= year) : isRetiredByYear(plant, year)
  const retiredCapacity = plants.filter(isTimedByYear).reduce((sum, plant) => sum + plant.netMw, 0)
  const affectedLocations = new Set(plants.filter(isTimedByYear).map((plant) => plant.nodeId)).size
  const nextPlant = [...plants].filter((plant) => (timingYear(plant) ?? 0) >= 2026).sort((left, right) => (timingYear(left) ?? 9999) - (timingYear(right) ?? 9999))[0]
  const locationPlants = selectedPlant ? plants.filter((plant) => plant.nodeId === selectedPlant.nodeId) : []
  const locationName = selectedPlant?.nodeName || selectedPlant?.nodeId
  const locationRetiringMw = locationPlants.filter(isTimedByYear).reduce((sum, plant) => sum + plant.netMw, 0)
  const locationNextRetirement = [...locationPlants].filter(timingYear).sort((left, right) => (timingYear(left) ?? 9999) - (timingYear(right) ?? 9999))[0]
  const localCapacity = locationPlants.reduce((sum, plant) => sum + plant.netMw, 0)
  const selectedShare = selectedPlant && localCapacity ? Math.round(selectedPlant.netMw / localCapacity * 100) : 0

  return (
    <aside className="dashboard-panel" style={{ left: position.left, top: position.top }} aria-label="Grid stability dashboard">
      <div className="panel-heading panel-drag-handle" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragStart({ x: event.clientX, y: event.clientY, left: position.left, top: position.top }) }} onPointerMove={(event) => { if (dragStart) { const panel = event.currentTarget.parentElement; const workspace = panel?.parentElement; const maxLeft = Math.max(8, (workspace?.clientWidth ?? 340) - (panel?.offsetWidth ?? 316) - 8); const maxTop = Math.max(8, (workspace?.clientHeight ?? 600) - (panel?.offsetHeight ?? 400) - 8); setPosition({ left: Math.min(maxLeft, Math.max(8, dragStart.left + event.clientX - dragStart.x)), top: Math.min(maxTop, Math.max(8, dragStart.top + event.clientY - dragStart.y)) }) } }} onPointerUp={() => setDragStart(undefined)}>
        <p>{isFuture ? 'Commissioning outlook' : 'Retirement outlook'}</p>
        <h2>{year} planning horizon</h2>
      </div>
      <div className="metric-grid">
        <article className="metric-card"><Zap aria-hidden="true" /><span>{isFuture ? 'Capacity commissioning' : 'Capacity retiring'}</span><strong>{formatMw(retiredCapacity)}</strong></article>
        <article className="metric-card"><MapPinned aria-hidden="true" /><span>Locations affected</span><strong>{affectedLocations}</strong></article>
        <article className="metric-card metric-card-wide"><CalendarClock aria-hidden="true" /><span>{isFuture ? 'Next expected commissioning' : 'Next known retirement'}</span><strong>{nextPlant ? nextPlant.name : 'No date recorded'}</strong><small>{nextPlant ? `${timingYear(nextPlant)}` : 'Add dates in the register'}</small></article>
      </div>

      {selectedPlant && (
        <section className="location-summary">
          <header><div><span>Selected site</span><strong>{selectedPlant.name}</strong><small>{locationName} · {selectedPlant.region}</small></div><b>{formatMw(selectedPlant.netMw)}</b></header>
          <div className="site-primary-metrics"><div><span>{isFuture ? 'Commissioning' : 'Retirement'}</span><strong>{isFuture ? commissioningLabel(selectedPlant) : retirementLabel(selectedPlant)}</strong></div><div><span>Confidence</span><strong>{selectedPlant.confidenceScore ? `${selectedPlant.confidenceScore}/100` : 'Not scored'}</strong></div></div>
          {selectedPlant.retirementBasis === 'Modelled' && selectedPlant.modelledRetirementReason && <p className="site-rationale"><i>Model basis</i>{selectedPlant.modelledRetirementReason}</p>}
          <div className="site-context"><div><span>By {year}</span><strong>{formatMw(locationRetiringMw)} at location</strong></div><div><span>Share of local capacity</span><strong>{selectedShare}%</strong></div><div><span>Next at location</span><strong>{locationNextRetirement ? `${locationNextRetirement.name} · ${timingYear(locationNextRetirement)}` : 'Unconfirmed'}</strong></div></div>
          {selectedPlant.evidenceSource && <p className="site-evidence"><i>Evidence</i>{selectedPlant.evidenceSource}</p>}
          <div className="location-assets"><div className="site-assets-heading"><span>Other assets at this location</span><b>{locationPlants.length}</b></div>{locationPlants.sort((left, right) => (effectiveRetirementYear(left) ?? 9999) - (effectiveRetirementYear(right) ?? 9999)).slice(0, 4).map((plant) => <div key={plant.assetId} className={plant.assetId === selectedPlant.assetId ? 'selected-asset' : ''}><span>{plant.name}</span><b>{formatMw(plant.netMw)}</b><small>{retirementLabel(plant)}</small></div>)}</div>
        </section>
      )}

      <section className="deficit-list">
        <div className="section-heading"><h3>{selectedPlant ? `Cumulative ${isFuture ? 'commissioning' : 'retirement'} at this location` : `${isFuture ? 'Commissioning' : 'Retirement'} timeline`}</h3><span>{selectedPlant ? locationPlants.length + ' assets' : 'Cumulative MW'}</span></div>
        <ol>
          {[2030, 2040, 2050].map((timelineYear, index) => (
            <li key={timelineYear}>
              <span className="rank">{String(index + 1).padStart(2, '0')}</span>
              <span className="node-name">By {timelineYear}</span>
              <span className="deficit-value">{formatMw(isFuture ? (selectedPlant ? locationPlants : plants).filter((plant) => (effectiveCommissioningYear(plant) ?? Infinity) <= timelineYear).reduce((sum, plant) => sum + plant.netMw, 0) : retiredMwByYear(selectedPlant ? locationPlants : plants, timelineYear))}</span>
            </li>
          ))}
          {!plants.length && <li className="empty-list">Import a workbook to populate the retirement timeline.</li>}
        </ol>
      </section>
    </aside>
  )
}
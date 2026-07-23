import { AlertCircle, CalendarDays, CheckCircle2, MapPin, SearchCheck } from 'lucide-react'
import type { Plant, PortfolioId } from '../models'
import { effectiveCommissioningYear, effectiveRetirementYear } from '../lib/risk'

interface Dataset { portfolio: PortfolioId, label: string, plants: Plant[] }
interface Issue { type: string, detail: string, plant: Plant, portfolio: PortfolioId, portfolioLabel: string }

export function DataQualityView({ datasets, onEdit }: { datasets: Dataset[], onEdit: (portfolio: PortfolioId, plant: Plant) => void }) {
  const issues: Issue[] = datasets.flatMap(({ portfolio, label, plants }) => plants.flatMap((plant) => {
    const recordIssues: Issue[] = []
    const timingMissing = portfolio === 'future-generation' ? !effectiveCommissioningYear(plant) : !effectiveRetirementYear(plant)
    if (timingMissing) recordIssues.push({ type: portfolio === 'future-generation' ? 'Missing commissioning timing' : 'Missing retirement timing', detail: portfolio === 'future-generation' ? 'Add a confirmed commissioning date or a modelled year with a reason.' : 'Add a confirmed retirement date or a modelled year with a reason.', plant, portfolio, portfolioLabel: label })
    if (!plant.hasCoordinates && (!plant.latitude || !plant.longitude)) recordIssues.push({ type: 'Missing location', detail: 'Add latitude and longitude to place this asset on the map.', plant, portfolio, portfolioLabel: label })
    if ((plant.confidenceScore ?? 0) < 50) recordIssues.push({ type: 'Low confidence', detail: 'Review supporting evidence or increase the confidence score once verified.', plant, portfolio, portfolioLabel: label })
    if (plants.some((candidate) => candidate.assetId !== plant.assetId && candidate.name.trim().toLowerCase() === plant.name.trim().toLowerCase())) recordIssues.push({ type: 'Duplicate plant name', detail: 'Rename, merge, or archive the duplicate record.', plant, portfolio, portfolioLabel: label })
    if (plant.nodeName && plants.some((candidate) => candidate.nodeId === plant.nodeId && candidate.nodeName !== plant.nodeName)) recordIssues.push({ type: 'Inconsistent location name', detail: 'Use one node/substation name for this Node ID.', plant, portfolio, portfolioLabel: label })
    return recordIssues
  }))
  const types = ['Missing retirement timing', 'Missing commissioning timing', 'Missing location', 'Low confidence', 'Duplicate plant name', 'Inconsistent location name']
  const grouped = types.map((type) => ({ type, items: issues.filter((issue) => issue.type === type) })).filter((group) => group.items.length)
  const icons = { 'Missing retirement timing': CalendarDays, 'Missing commissioning timing': CalendarDays, 'Missing location': MapPin, 'Low confidence': AlertCircle, 'Duplicate plant name': SearchCheck, 'Inconsistent location name': SearchCheck }
  const recordCount = datasets.reduce((sum, dataset) => sum + dataset.plants.length, 0)
  return <section className="workspace-view quality-view"><div className="view-heading"><div><p>Data quality</p><h2>Records to resolve</h2><span>{issues.length} actions across {recordCount} records</span></div></div>{issues.length === 0 ? <div className="quality-clear"><CheckCircle2 size={28} /><div><strong>Registers are ready</strong><span>No missing data or consistency issues were found.</span></div></div> : <div className="quality-groups">{grouped.map((group) => { const Icon = icons[group.type as keyof typeof icons]; return <section key={group.type} className="quality-group"><header><Icon size={17} /><div><h3>{group.type}</h3><span>{group.items.length} record{group.items.length === 1 ? '' : 's'}</span></div></header>{group.items.map((issue) => <article key={`${issue.type}-${issue.portfolio}-${issue.plant.assetId}`}><div><strong>{issue.plant.name}</strong><span>{issue.portfolioLabel} · {issue.plant.nodeName || issue.plant.nodeId} · {issue.detail}</span></div><button type="button" onClick={() => onEdit(issue.portfolio, issue.plant)}>Resolve</button></article>)}</section>})}</div>}</section>
}
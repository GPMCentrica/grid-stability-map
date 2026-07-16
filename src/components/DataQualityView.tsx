import { AlertCircle, CheckCircle2, MapPin, CalendarDays, SearchCheck } from 'lucide-react'
import type { Plant } from '../models'
import { effectiveRetirementYear } from '../lib/risk'

interface Issue { type: string, detail: string, plant: Plant }

export function DataQualityView({ plants, onEdit }: { plants: Plant[], onEdit: (plant: Plant) => void }) {
  const issues: Issue[] = plants.flatMap((plant) => {
    const recordIssues: Issue[] = []
    if (!effectiveRetirementYear(plant)) recordIssues.push({ type: 'Missing retirement timing', detail: 'Add a confirmed date or a modelled year with a quick reason.', plant })
    if (!plant.hasCoordinates && (!plant.latitude || !plant.longitude)) recordIssues.push({ type: 'Missing location', detail: 'Add latitude and longitude to place this asset on the map.', plant })
    if ((plant.confidenceScore ?? 0) < 50) recordIssues.push({ type: 'Low confidence', detail: 'Review supporting evidence or increase the confidence score once verified.', plant })
    if (plants.some((candidate) => candidate.assetId !== plant.assetId && candidate.name.trim().toLowerCase() === plant.name.trim().toLowerCase())) recordIssues.push({ type: 'Duplicate plant name', detail: 'Rename, merge, or archive the duplicate record.', plant })
    if (plant.nodeName && plants.some((candidate) => candidate.nodeId === plant.nodeId && candidate.nodeName !== plant.nodeName)) recordIssues.push({ type: 'Inconsistent location name', detail: 'Use one node/substation name for this Node ID.', plant })
    return recordIssues
  })
  const grouped = ['Missing retirement timing', 'Missing location', 'Low confidence', 'Duplicate plant name', 'Inconsistent location name'].map((type) => ({ type, items: issues.filter((issue) => issue.type === type) })).filter((group) => group.items.length)
  const icons = { 'Missing retirement timing': CalendarDays, 'Missing location': MapPin, 'Low confidence': AlertCircle, 'Duplicate plant name': SearchCheck, 'Inconsistent location name': SearchCheck }
  return <section className="workspace-view quality-view"><div className="view-heading"><div><p>Data quality</p><h2>Records to resolve</h2><span>{issues.length} actions across {plants.length} plant records</span></div></div>{issues.length === 0 ? <div className="quality-clear"><CheckCircle2 size={28} /><div><strong>Register is ready</strong><span>No missing data or consistency issues were found.</span></div></div> : <div className="quality-groups">{grouped.map((group) => { const Icon = icons[group.type as keyof typeof icons]; return <section key={group.type} className="quality-group"><header><Icon size={17} /><div><h3>{group.type}</h3><span>{group.items.length} record{group.items.length === 1 ? '' : 's'}</span></div></header>{group.items.map((issue) => <article key={`${issue.type}-${issue.plant.assetId}`}><div><strong>{issue.plant.name}</strong><span>{issue.plant.nodeName || issue.plant.nodeId} · {issue.detail}</span></div><button type="button" onClick={() => onEdit(issue.plant)}>Resolve</button></article>)}</section>})}</div>}</section>
}
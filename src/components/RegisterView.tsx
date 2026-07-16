import { useEffect, useState } from 'react'
import { Archive, Copy, LoaderCircle, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { Plant, PlantStatus, RetirementBasis, WorkspaceFilters } from '../models'
import { effectiveRetirementYear, formatMw, retirementLabel } from '../lib/risk'
import { WorkspaceFilters as FilterControls } from './WorkspaceFilters'

interface RegisterViewProps {
  plants: Plant[]
  filteredPlants: Plant[]
  filters: WorkspaceFilters
  onFiltersChange: (filters: WorkspaceFilters) => void
  onSave: (plant: Plant) => void
  onArchive: (assetId: string) => void
  onDelete: (assetId: string) => void
  onDuplicate: (plant: Plant) => void
  editingPlant?: Plant
  onEditingPlantHandled: () => void
}

const blankPlant = (): Plant => ({ assetId: crypto.randomUUID(), name: '', nodeId: '', nodeName: '', region: '', country: 'Great Britain', technology: '', netMw: 0, retirementDate: '', retirementBasis: 'Unconfirmed', retirementClass: 'Unclear', confidenceScore: 50, evidenceSource: '', notes: '', status: 'Active', latitude: 0, longitude: 0, hasCoordinates: false })

function validationMessages(plant: Plant, allPlants: Plant[]) {
  const messages: string[] = []
  if (!plant.name.trim()) messages.push('Plant name is required.')
  if (!Number.isFinite(plant.netMw) || plant.netMw <= 0) messages.push('Net MW must be greater than zero.')
  if (plant.retirementBasis === 'Confirmed' && !plant.retirementDate) messages.push('Confirmed retirement needs a date.')
  if (plant.retirementBasis === 'Modelled' && !plant.modelledRetirementYear) messages.push('Modelled retirement needs a year.')
  if (plant.retirementBasis === 'Modelled' && !plant.modelledRetirementReason?.trim()) messages.push('Modelled retirement needs a short reason.')
  if (!plant.hasCoordinates && (!plant.latitude || !plant.longitude)) messages.push('Location coordinates are missing.')
  if (allPlants.some((candidate) => candidate.assetId !== plant.assetId && candidate.name.trim().toLowerCase() === plant.name.trim().toLowerCase())) messages.push('Plant name duplicates an existing record.')
  return messages
}

function derivedNodeId(plant: Plant) {
  const source = plant.nodeName || plant.name
  return `NODE-${source.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20) || 'NEW'}`
}

const suggestedValues = (plants: Plant[], key: keyof Plant) => [...new Set(plants.map((plant) => String(plant[key] ?? '')).filter(Boolean))].sort()

function prepareForEditing(plant: Plant): Plant {
  if (plant.retirementBasis || !plant.retirementDate) return plant
  return { ...plant, retirementBasis: 'Modelled', modelledRetirementYear: Number(plant.retirementDate.slice(0, 4)), modelledRetirementReason: 'Existing register assumption' }
}

function PlantEditor({ initialPlant, plants, onClose, onSave }: { initialPlant: Plant, plants: Plant[], onClose: () => void, onSave: (plant: Plant) => void }) {
  const [plant, setPlant] = useState(() => prepareForEditing(initialPlant))
  const [locationResults, setLocationResults] = useState<Array<{ display_name: string, lat: string, lon: string }>>([])
  const [lookupError, setLookupError] = useState('')
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false)
  const [step, setStep] = useState(initialPlant.name ? 2 : 1)
  useEffect(() => setPlant(prepareForEditing(initialPlant)), [initialPlant])
  const messages = validationMessages(plant, plants)
  const update = <K extends keyof Plant>(key: K, value: Plant[K]) => setPlant((current) => ({ ...current, [key]: value }))
  const save = () => {
    setHasAttemptedSave(true)
    if (messages.some((message) => message.includes('required') || message.includes('greater than zero') || message.includes('duplicates'))) return
    onSave({ ...plant, assetId: plant.assetId.trim() || crypto.randomUUID(), nodeId: plant.nodeId.trim() || derivedNodeId(plant), hasCoordinates: Boolean(plant.latitude && plant.longitude) })
    onClose()
  }
  const lookupLocation = async () => {
    const buildQuery = (locationName: string) => [locationName, plant.region, plant.country].filter(Boolean).join(', ')
    const primaryQuery = buildQuery(plant.nodeName || plant.name)
    if (!primaryQuery) { setLookupError('Enter a plant or location name before searching.'); return }
    setIsLookingUp(true)
    setLookupError('')
    try {
      const search = async (query: string) => {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`)
        if (!response.ok) throw new Error('Location search is currently unavailable.')
        return response.json() as Promise<Array<{ display_name: string, lat: string, lon: string }>>
      }
      let results = await search(primaryQuery)
      if (!results.length && plant.nodeName && plant.name && plant.nodeName !== plant.name) results = await search(buildQuery(plant.name))
      setLocationResults(results)
      if (!results.length) setLookupError('No locations matched. Refine the node name or enter coordinates manually.')
    } catch {
      setLookupError('OpenStreetMap lookup could not be reached. Enter coordinates manually and try again later.')
    } finally {
      setIsLookingUp(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="plant-editor" role="dialog" aria-modal="true" aria-label="Edit plant record" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p>Local register</p><h2>{initialPlant.name ? 'Edit plant record' : 'Add plant record'}</h2></div><button className="close-button" type="button" onClick={onClose} aria-label="Close editor"><X size={18} /></button></header>
        <div className="editor-steps"><span className={step === 1 ? 'active' : ''}>1. Find site</span><span className={step === 2 ? 'active' : ''}>2. Technical details</span></div>
        {step === 1 ? <div className="editor-fields location-step">
          <label>Plant name<input list="plant-name-suggestions" value={plant.name} onChange={(event) => update('name', event.target.value)} /></label>
          <label>Grid location / substation<input list="grid-location-suggestions" value={plant.nodeName} onChange={(event) => update('nodeName', event.target.value)} placeholder="e.g. Moneypoint" /></label>
          <label>Country / market<input list="market-suggestions" value={plant.country ?? ''} onChange={(event) => update('country', event.target.value)} placeholder="Great Britain, Northern Ireland or Ireland" /></label>
          <div className="location-lookup full-width"><div><strong>Location lookup</strong><span>Search OpenStreetMap, then select the matching site.</span></div><button type="button" className="secondary-action" onClick={() => void lookupLocation()} disabled={isLookingUp}>{isLookingUp ? <LoaderCircle className="spinning" size={15} /> : <MapPin size={15} />}{isLookingUp ? 'Searching' : 'Find location'}</button></div>
          {locationResults.length > 0 && <div className="location-results full-width">{locationResults.map((result) => <button key={`${result.lat}-${result.lon}`} type="button" onClick={() => { update('latitude', Number(result.lat)); update('longitude', Number(result.lon)); update('hasCoordinates', true); setLocationResults([]) }}><MapPin size={14} /><span>{result.display_name}</span><small>{Number(result.lat).toFixed(4)}, {Number(result.lon).toFixed(4)}</small></button>)}</div>}
          {lookupError && <p className="lookup-error full-width">{lookupError}</p>}
          <button className="primary-action step-next" type="button" disabled={!plant.name.trim()} onClick={() => setStep(2)}>Continue to technical details</button>
        </div> : <div className="editor-fields">
          <label>Plant name<input value={plant.name} onChange={(event) => update('name', event.target.value)} /></label>
          <label>Grid location<input value={plant.nodeName} onChange={(event) => update('nodeName', event.target.value)} /></label>
          <label>Region<input list="region-suggestions" value={plant.region} onChange={(event) => update('region', event.target.value)} /></label>
          <label>Technology<input list="technology-suggestions" value={plant.technology} onChange={(event) => update('technology', event.target.value)} /></label>
          <label>Net MW<input type="number" min="0" value={plant.netMw || ''} onChange={(event) => update('netMw', Number(event.target.value))} /></label>
          <label>Retirement basis<select value={plant.retirementBasis ?? (plant.retirementDate ? 'Modelled' : 'Unconfirmed')} onChange={(event) => update('retirementBasis', event.target.value as RetirementBasis)}><option>Unconfirmed</option><option>Confirmed</option><option>Modelled</option></select></label>
          {plant.retirementBasis === 'Confirmed' && <label>Confirmed retirement date<input type="date" value={plant.retirementDate ?? ''} onChange={(event) => update('retirementDate', event.target.value)} /></label>}
          {plant.retirementBasis === 'Modelled' && <><label>Modelled retirement year<input type="number" min="2020" max="2100" value={plant.modelledRetirementYear ?? ''} onChange={(event) => update('modelledRetirementYear', Number(event.target.value))} /></label><label>Quick model reason<input value={plant.modelledRetirementReason ?? ''} onChange={(event) => update('modelledRetirementReason', event.target.value)} placeholder="e.g. asset age assumption" /></label></>}
          <label>Confidence score<input type="number" min="0" max="100" value={plant.confidenceScore ?? ''} onChange={(event) => update('confidenceScore', Number(event.target.value))} /></label>
          <details className="advanced-fields full-width"><summary>More details and manual overrides</summary><div className="advanced-grid">
            <label>Plant ID<input value={plant.assetId} onChange={(event) => update('assetId', event.target.value)} /></label>
            <label>Node ID<input value={plant.nodeId} onChange={(event) => update('nodeId', event.target.value)} placeholder={derivedNodeId(plant)} /></label>
            <label>Retirement class<input value={plant.retirementClass ?? ''} onChange={(event) => update('retirementClass', event.target.value)} /></label>
            <label>Status<select value={plant.status ?? 'Active'} onChange={(event) => update('status', event.target.value as PlantStatus)}><option>Active</option><option>Retiring</option><option>Retired</option><option>Archived</option></select></label>
            <label>Evidence / source<input value={plant.evidenceSource ?? ''} onChange={(event) => update('evidenceSource', event.target.value)} /></label>
            <label>Latitude<input type="number" step="any" value={plant.latitude || ''} onChange={(event) => update('latitude', Number(event.target.value))} /></label>
            <label>Longitude<input type="number" step="any" value={plant.longitude || ''} onChange={(event) => update('longitude', Number(event.target.value))} /></label>
            <label className="full-width">Notes<textarea value={plant.notes ?? ''} onChange={(event) => update('notes', event.target.value)} /></label>
          </div></details>
          <datalist id="plant-name-suggestions">{suggestedValues(plants, 'name').map((value) => <option key={value} value={value} />)}</datalist>
          <datalist id="grid-location-suggestions">{suggestedValues(plants, 'nodeName').map((value) => <option key={value} value={value} />)}</datalist>
          <datalist id="region-suggestions">{suggestedValues(plants, 'region').map((value) => <option key={value} value={value} />)}</datalist>
          <datalist id="market-suggestions">{suggestedValues(plants, 'country').map((value) => <option key={value} value={value} />)}</datalist>
          <datalist id="technology-suggestions">{suggestedValues(plants, 'technology').map((value) => <option key={value} value={value} />)}</datalist>
        </div>}
        {hasAttemptedSave && messages.length > 0 && <div className="editor-validation">{messages.map((message) => <p key={message}>{message}</p>)}</div>}
        <footer><button className="secondary-action" type="button" onClick={step === 1 ? onClose : () => setStep(1)}>{step === 1 ? 'Cancel' : 'Back'}</button>{step === 2 && <button className="primary-action" type="button" onClick={save}>Save record</button>}</footer>
      </section>
    </div>
  )
}

export function RegisterView({ plants, filteredPlants, filters, onFiltersChange, onSave, onArchive, onDelete, onDuplicate, editingPlant, onEditingPlantHandled }: RegisterViewProps) {
  const [editorPlant, setEditorPlant] = useState<Plant>()
  useEffect(() => {
    if (editingPlant) {
      setEditorPlant(editingPlant)
      onEditingPlantHandled()
    }
  }, [editingPlant, onEditingPlantHandled])
  return (
    <section className="workspace-view register-view">
      <div className="view-heading"><div><p>Working register</p><h2>Plant retirement register</h2><span>{filteredPlants.length} of {plants.length} records</span></div><button className="primary-action" type="button" onClick={() => setEditorPlant(blankPlant())}><Plus size={16} />Add plant</button></div>
      <FilterControls plants={plants} filters={filters} onChange={onFiltersChange} />
      <div className="register-table-shell"><table className="register-table"><thead><tr><th>Plant</th><th>Location</th><th>Technology</th><th>Net MW</th><th>Retirement</th><th>Confidence</th><th>Data</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
        {filteredPlants.map((plant) => {
          const issues = validationMessages(plant, plants)
          return <tr key={plant.assetId}><td><strong>{plant.name}</strong><small>{plant.assetId}</small></td><td>{plant.nodeName || plant.nodeId}<small>{[plant.region, plant.country].filter(Boolean).join(' · ')}</small></td><td>{plant.technology}</td><td>{formatMw(plant.netMw)}</td><td>{effectiveRetirementYear(plant) ? retirementLabel(plant) : <em>Unconfirmed</em>}<small>{plant.modelledRetirementReason || plant.retirementClass}</small></td><td><span className={`confidence confidence-${plant.confidenceScore && plant.confidenceScore >= 75 ? 'high' : plant.confidenceScore && plant.confidenceScore >= 50 ? 'medium' : 'low'}`}>{plant.confidenceScore ?? 'No score'}</span></td><td>{issues.length ? <span className="issue-count">{issues.length} to review</span> : <span className="complete-status">Complete</span>}</td><td><div className="row-actions"><button type="button" title="Edit record" aria-label={`Edit ${plant.name}`} onClick={() => setEditorPlant(plant)}><Pencil size={15} /></button><button type="button" title="Duplicate record" aria-label={`Duplicate ${plant.name}`} onClick={() => onDuplicate(plant)}><Copy size={15} /></button><button type="button" title="Archive record" aria-label={`Archive ${plant.name}`} onClick={() => onArchive(plant.assetId)}><Archive size={15} /></button><button type="button" title="Delete record" aria-label={`Delete ${plant.name}`} onClick={() => onDelete(plant.assetId)}><Trash2 size={15} /></button></div></td></tr>
        })}
      </tbody></table>{filteredPlants.length === 0 && <div className="empty-state">No plant records match these filters.</div>}</div>
      {editorPlant && <PlantEditor initialPlant={editorPlant} plants={plants} onClose={() => setEditorPlant(undefined)} onSave={onSave} />}
    </section>
  )
}
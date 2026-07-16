import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Database, Map, Moon, RotateCcw, Sun, TableProperties, TimerReset } from 'lucide-react'
import { DashboardPanel } from './components/DashboardPanel'
import { DataQualityView } from './components/DataQualityView'
import { MapView } from './components/MapView'
import { MapPlaceSearch } from './components/MapPlaceSearch'
import { RegisterView } from './components/RegisterView'
import { TimelineView } from './components/TimelineView'
import { WorkspaceFilters } from './components/WorkspaceFilters'
import { defaultRegister } from './data/default-register'
import { filterPlants, loadWorkspace, saveWorkspace } from './lib/workspace'
import type { HorizonYear, NeedLayer, PlaceResult, Plant, WorkbookData } from './models'
import { emptyWorkspaceFilters, type WorkspaceFilters as FilterState } from './models'

const years: HorizonYear[] = [2026, 2030, 2040, 2050]
type Theme = 'light' | 'dark'
type WorkspaceView = 'map' | 'register' | 'timeline' | 'quality'

const createDefaultWorkspace = (): WorkbookData => structuredClone(defaultRegister)

export default function App() {
  const [workbook, setWorkbook] = useState<WorkbookData>(() => loadWorkspace() ?? createDefaultWorkspace())
  const [year, setYear] = useState<HorizonYear>(2030)
  const [needLayer, setNeedLayer] = useState<NeedLayer>('none')
  const [filters, setFilters] = useState<FilterState>(emptyWorkspaceFilters)
  const [selectedPlant, setSelectedPlant] = useState<Plant>()
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult>()
  const [view, setView] = useState<WorkspaceView>('map')
  const [notice, setNotice] = useState('Local retirement register loaded. Changes are saved in this browser.')
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem('grid-stability-theme') === 'dark' ? 'dark' : 'light')
  const deferredQuery = useDeferredValue(filters.query)

  useEffect(() => {
    localStorage.setItem('grid-stability-theme', theme)
  }, [theme])

  useEffect(() => {
    saveWorkspace(workbook)
  }, [workbook])

  const activeFilters = useMemo(() => ({ ...filters, query: deferredQuery }), [deferredQuery, filters])
  const filteredPlants = useMemo(() => filterPlants(workbook.plants, activeFilters), [activeFilters, workbook.plants])
  const mapPlants = useMemo(() => filteredPlants.filter((plant) => plant.hasCoordinates), [filteredPlants])

  const focusedPlant = useMemo(() => {
    const exactName = deferredQuery.trim().toLowerCase()
    return mapPlants.find((plant) => plant.name.toLowerCase() === exactName)
  }, [deferredQuery, mapPlants])
  const savePlant = (plant: Plant) => setWorkbook((current) => ({ ...current, plants: current.plants.some((candidate) => candidate.assetId === plant.assetId) ? current.plants.map((candidate) => candidate.assetId === plant.assetId ? plant : candidate) : [...current.plants, plant] }))
  const archivePlant = (assetId: string) => setWorkbook((current) => ({ ...current, plants: current.plants.map((plant) => plant.assetId === assetId ? { ...plant, status: 'Archived' } : plant) }))
  const deletePlant = (assetId: string) => { if (window.confirm('Delete this plant record from this browser workspace?')) setWorkbook((current) => ({ ...current, plants: current.plants.filter((plant) => plant.assetId !== assetId) })) }
  const duplicatePlant = (plant: Plant) => savePlant({ ...plant, assetId: crypto.randomUUID(), name: `${plant.name} copy`, status: 'Active' })
  const resolveIssue = (plant: Plant) => { setFilters({ ...emptyWorkspaceFilters, query: plant.name }); setView('register') }
  const resetWorkspace = () => {
    if (!window.confirm('Replace all local edits with the built-in retirement register?')) return
    setWorkbook(createDefaultWorkspace())
    setFilters(emptyWorkspaceFilters)
    setSelectedPlant(undefined)
    setNotice('Local register reset to the built-in baseline.')
  }

  const tabs: { id: WorkspaceView, label: string, icon: typeof Map }[] = [
    { id: 'map', label: 'Map', icon: Map }, { id: 'register', label: 'Register', icon: TableProperties }, { id: 'timeline', label: 'Timeline', icon: TimerReset }, { id: 'quality', label: 'Data quality', icon: Database },
  ]

  return (
    <main className={`app-shell theme-${theme}`}>
      <header className="app-header">
        <div className="brand-lockup"><span className="brand-mark">UK</span><div><p>Electricity system analysis</p><h1>Grid Stability Map</h1></div></div>
        <div className="import-actions">
          <button className="icon-text-button reset-button" type="button" onClick={resetWorkspace} title="Reset local register to the built-in baseline"><RotateCcw size={16} />Reset data</button>
          <button className="theme-toggle" type="button" onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>{theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}</button>
        </div>
      </header>

      <nav className="workspace-tabs" aria-label="Workspace areas">{tabs.map((tab) => { const Icon = tab.icon; return <button key={tab.id} type="button" className={view === tab.id ? 'active' : ''} onClick={() => setView(tab.id)}><Icon size={16} />{tab.label}</button> })}</nav>

      {view === 'map' && <section className="control-bar" aria-label="Map controls">
        <MapPlaceSearch plants={workbook.plants} onSelect={(place) => { setSelectedPlace(place); if (place.registeredPlant) setSelectedPlant(place.registeredPlant) }} />
        <div className="segmented-control" aria-label="Retirement horizon">
          {years.map((option) => <button key={option} type="button" className={option === year ? 'active' : ''} onClick={() => setYear(option)}>{option}</button>)}
        </div>
        <div className="need-control" aria-label="Stability screening overlay">
          <span>Need overlay</span>
          {([{ id: 'none', label: 'Off' }, { id: 'inertia', label: 'Inertia' }, { id: 'scl', label: 'SCL' }, { id: 'voltage', label: 'Voltage' }] as const).map((layer) => <button key={layer.id} type="button" className={needLayer === layer.id ? 'active' : ''} onClick={() => setNeedLayer(layer.id)}>{layer.label}</button>)}
        </div>
        <p className="import-status">{notice}</p>
      </section>}

      {view === 'map' && <section className="map-workspace">
        <MapView plants={mapPlants} year={year} retiredMode="fade" needLayer={needLayer} focusedPlant={focusedPlant ?? selectedPlace?.registeredPlant} focusedPlace={selectedPlace} onPlantSelect={setSelectedPlant} />
        <DashboardPanel plants={filteredPlants} year={year} selectedPlant={selectedPlant} />
        <div className="map-legend" aria-label="Map legend">
          {needLayer === 'none' ? <><span className="legend-title">Generation markers</span><span className="marker-key" />Size: Net MW<span className="marker-key technology" />Colour: technology<span className="marker-key lifespan" />Opacity: retirement timing</> : <><span className="legend-title">Screening need</span><span className="risk-key low" />Low<span className="risk-key medium" />Moderate<span className="risk-key high" />High</>}
        </div>
      </section>}
      {view === 'register' && <RegisterView plants={workbook.plants} filteredPlants={filteredPlants} filters={filters} onFiltersChange={setFilters} onSave={savePlant} onArchive={archivePlant} onDelete={deletePlant} onDuplicate={duplicatePlant} />}
      {view === 'timeline' && <section className="workspace-with-filter"><WorkspaceFilters plants={workbook.plants} filters={filters} onChange={setFilters} /><TimelineView plants={filteredPlants} /></section>}
      {view === 'quality' && <DataQualityView plants={workbook.plants.filter((plant) => plant.status !== 'Archived')} onEdit={resolveIssue} />}
    </main>
  )
}
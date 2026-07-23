import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Building2, Check, Database, Download, FilePlus2, Map, Moon, Network, Rocket, Save, Sun, TableProperties, TimerReset, Upload, X } from 'lucide-react'
import { DashboardPanel } from './components/DashboardPanel'
import { DataQualityView } from './components/DataQualityView'
import { MapView } from './components/MapView'
import { MapPlaceSearch } from './components/MapPlaceSearch'
import { RegisterView } from './components/RegisterView'
import { TimelineView } from './components/TimelineView'
import { centricaRegister } from './data/centrica-register'
import { defaultRegister } from './data/default-register'
import { futureGenerationRegister } from './data/future-generation-register'
import { filterPlants, loadWorkspaceStore, parsePlantBackup, parsePlantCsv, saveWorkspaceStore, type PortfolioWorkspaceStore, type WorkspaceStore } from './lib/workspace'
import type { HorizonYear, NeedLayer, NetworkLayerOptions, PlaceResult, Plant, PortfolioId, WorkbookData } from './models'
import { emptyWorkspaceFilters, type WorkspaceFilters as FilterState } from './models'

const years: HorizonYear[] = [2026, 2030, 2040, 2050]
type Theme = 'light' | 'dark'
type PortfolioView = 'map' | 'register'
type WorkspaceArea = PortfolioId | 'timeline' | 'quality'

const portfolioDefinitions: Record<PortfolioId, { label: string, registerName: string, workbook: WorkbookData, description: string }> = {
  retirement: { label: 'Retirement', registerName: 'Shared retirement register - 17 Jul 2026', workbook: defaultRegister, description: 'Published system retirement register' },
  'future-generation': { label: 'Future Generation', registerName: 'Offshore wind prototype register', workbook: futureGenerationRegister, description: 'Offshore wind projects and onshore grid connections' },
  centrica: { label: 'Centrica', registerName: 'Centrica operational register', workbook: centricaRegister, description: 'Operational and AUC asset register' },
}

const isPortfolio = (area: WorkspaceArea): area is PortfolioId => area === 'retirement' || area === 'future-generation' || area === 'centrica'
const createDefaultPortfolioStore = (portfolio: PortfolioId): PortfolioWorkspaceStore => {
  const definition = portfolioDefinitions[portfolio]
  const id = portfolio === 'retirement' ? 'retirement-owner-register' : portfolio === 'centrica' ? 'centrica-published-register' : `${portfolio}-published`
  return { activeRegisterId: id, registers: [{ id, name: definition.registerName, workbook: structuredClone(definition.workbook), savedAt: '' }] }
}
const createInitialWorkspaceStore = (): WorkspaceStore => {
  const stored = loadWorkspaceStore()
  return { portfolios: { retirement: stored?.portfolios.retirement ?? createDefaultPortfolioStore('retirement'), 'future-generation': stored?.portfolios['future-generation'] ?? createDefaultPortfolioStore('future-generation'), centrica: stored?.portfolios.centrica ?? createDefaultPortfolioStore('centrica') } }
}

export default function App() {
  const [workspaceStore, setWorkspaceStore] = useState(createInitialWorkspaceStore)
  const [area, setArea] = useState<WorkspaceArea>('retirement')
  const [portfolioView, setPortfolioView] = useState<PortfolioView>('map')
  const [year, setYear] = useState<HorizonYear>(2030)
  const [needLayer, setNeedLayer] = useState<NeedLayer>('none')
  const [heatOpacity, setHeatOpacity] = useState(100)
  const [networkLayer, setNetworkLayer] = useState(false)
  const [networkOptions, setNetworkOptions] = useState<NetworkLayerOptions>({ transmission: true, substations: false, lowerVoltage: false, future: false })
  const [filtersByPortfolio, setFiltersByPortfolio] = useState<Record<PortfolioId, FilterState>>({ retirement: emptyWorkspaceFilters, 'future-generation': emptyWorkspaceFilters, centrica: emptyWorkspaceFilters })
  const [selectedPlant, setSelectedPlant] = useState<Plant>()
  const [editingPlant, setEditingPlant] = useState<Plant>()
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult>()
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem('grid-stability-theme') === 'dark' ? 'dark' : 'light')
  const [saveCopyOpen, setSaveCopyOpen] = useState(false)
  const [newRegisterName, setNewRegisterName] = useState('')
  const [qualityPortfolio, setQualityPortfolio] = useState<PortfolioId | 'all'>('all')
  const backupInputRef = useRef<HTMLInputElement>(null)
  const mergeInputRef = useRef<HTMLInputElement>(null)
  const activePortfolio: PortfolioId = isPortfolio(area) ? area : 'retirement'
  const activeStore = workspaceStore.portfolios[activePortfolio]!
  const activeRegister = activeStore.registers.find((register) => register.id === activeStore.activeRegisterId) ?? activeStore.registers[0]
  const workbook = activeRegister.workbook
  const filters = filtersByPortfolio[activePortfolio]
  const deferredQuery = useDeferredValue(filters.query)

  useEffect(() => { localStorage.setItem('grid-stability-theme', theme) }, [theme])
  useEffect(() => { saveWorkspaceStore(workspaceStore) }, [workspaceStore])

  const activeFilters = useMemo(() => ({ ...filters, query: deferredQuery }), [deferredQuery, filters])
  const filteredPlants = useMemo(() => filterPlants(workbook.plants, activeFilters), [activeFilters, workbook.plants])
  const mapPlants = useMemo(() => filteredPlants.filter((plant) => plant.hasCoordinates), [filteredPlants])
  const focusedPlant = useMemo(() => mapPlants.find((plant) => plant.name.toLowerCase() === deferredQuery.trim().toLowerCase()), [deferredQuery, mapPlants])
  const updateFilters = (nextFilters: FilterState) => setFiltersByPortfolio((current) => ({ ...current, [activePortfolio]: nextFilters }))
  const updateActiveStore = (update: (current: PortfolioWorkspaceStore) => PortfolioWorkspaceStore) => setWorkspaceStore((current) => ({ ...current, portfolios: { ...current.portfolios, [activePortfolio]: update(current.portfolios[activePortfolio]!) } }))
  const updateWorkbook = (update: (current: WorkbookData) => WorkbookData) => updateActiveStore((current) => ({ ...current, registers: current.registers.map((register) => register.id === current.activeRegisterId ? { ...register, workbook: update(register.workbook), savedAt: new Date().toISOString() } : register) }))
  const savePlant = (plant: Plant) => updateWorkbook((current) => ({ ...current, plants: current.plants.some((candidate) => candidate.assetId === plant.assetId) ? current.plants.map((candidate) => candidate.assetId === plant.assetId ? plant : candidate) : [...current.plants, plant] }))
  const archivePlant = (assetId: string) => updateWorkbook((current) => ({ ...current, plants: current.plants.map((plant) => plant.assetId === assetId ? { ...plant, status: 'Archived' } : plant) }))
  const deletePlant = (assetId: string) => { if (window.confirm('Delete this plant record from this browser workspace?')) updateWorkbook((current) => ({ ...current, plants: current.plants.filter((plant) => plant.assetId !== assetId) })) }
  const duplicatePlant = (plant: Plant) => savePlant({ ...plant, assetId: crypto.randomUUID(), name: `${plant.name} copy`, status: 'Active' })
  const clearSelection = () => { setSelectedPlant(undefined); setEditingPlant(undefined); setSelectedPlace(undefined) }
  const selectArea = (nextArea: WorkspaceArea) => { setArea(nextArea); clearSelection() }
  const selectPortfolioView = (nextView: PortfolioView) => { setPortfolioView(nextView); clearSelection() }
  const downloadRegister = () => {
    const blob = new Blob([JSON.stringify(workbook.plants, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${activePortfolio}-register-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }
  const restoreRegister = async (file?: File) => {
    if (!file) return
    try {
      const plants = parsePlantBackup(JSON.parse(await file.text()))
      if (!window.confirm(`Replace the current ${portfolioDefinitions[activePortfolio].label} register with ${plants.length} records from ${file.name}?`)) return
      updateWorkbook(() => ({ plants, riskNodes: [], importedFileName: `Restored from ${file.name}` }))
      clearSelection()
    } catch (error) { window.alert(error instanceof Error ? `Backup was not restored: ${error.message}` : 'Backup was not restored.') }
  }
  const mergeCsvRegister = async (file?: File) => {
    if (!file) return
    try {
      const importedPlants = await parsePlantCsv(await file.text())
      const importedIds = new Set(importedPlants.map((plant) => plant.assetId))
      const updatedRecords = workbook.plants.filter((plant) => importedIds.has(plant.assetId)).length
      const baseName = `${activeRegister.name} + import`
      let name = baseName
      let copyNumber = 2
      while (activeStore.registers.some((register) => register.name.toLowerCase() === name.toLowerCase())) { name = `${baseName} (${copyNumber})`; copyNumber += 1 }
      const id = crypto.randomUUID()
      const savedAt = new Date().toISOString()
      const mergedPlants = [...workbook.plants.filter((plant) => !importedIds.has(plant.assetId)), ...importedPlants]
      updateActiveStore((current) => ({ activeRegisterId: id, registers: [...current.registers, { id, name, workbook: { ...workbook, plants: mergedPlants, importedFileName: `Merged ${file.name}` }, savedAt }] }))
      clearSelection()
      window.alert(`${importedPlants.length} CSV records merged into ${name}${updatedRecords ? `; ${updatedRecords} existing records updated.` : '.'}`)
    } catch (error) { window.alert(error instanceof Error ? `CSV was not merged: ${error.message}` : 'CSV was not merged.') }
  }
  const openRegisterSave = () => { setNewRegisterName(`${portfolioDefinitions[activePortfolio].label} register ${new Date().toLocaleDateString('en-GB')}`); setSaveCopyOpen(true) }
  const createRegisterSave = () => {
    const name = newRegisterName.trim()
    if (!name) return
    if (activeStore.registers.some((register) => register.name.toLowerCase() === name.toLowerCase())) { window.alert('Choose a different name. An internal register save already uses this name.'); return }
    const id = crypto.randomUUID()
    updateActiveStore((current) => ({ activeRegisterId: id, registers: [...current.registers, { id, name, workbook: structuredClone(workbook), savedAt: new Date().toISOString() }] }))
    setSaveCopyOpen(false)
  }
  const selectRegister = (registerId: string) => {
    if (registerId === activeStore.activeRegisterId) return
    updateActiveStore((current) => ({ ...current, activeRegisterId: registerId }))
    clearSelection()
  }
  const resolveIssue = (portfolio: PortfolioId, plant: Plant) => { setArea(portfolio); setPortfolioView('register'); updateFilters({ ...emptyWorkspaceFilters, query: plant.name }); setEditingPlant(plant) }
  const savedLabel = activeRegister.savedAt ? `${activeRegister.name} saved ${new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(activeRegister.savedAt))}` : `${activeRegister.name} ready`
  const networkLegend = [networkOptions.transmission && '220+ kV transmission', networkOptions.substations && 'substations', networkOptions.lowerVoltage && '110/132 kV lines'].filter(Boolean).join(' · ') || 'No network categories selected'
  const tabs: { id: WorkspaceArea, label: string, icon: typeof Map }[] = [{ id: 'retirement', label: 'Retirement', icon: Map }, { id: 'future-generation', label: 'Future Generation', icon: Rocket }, { id: 'centrica', label: 'Centrica', icon: Building2 }, { id: 'timeline', label: 'Timeline', icon: TimerReset }, { id: 'quality', label: 'Data quality', icon: Database }]
  const qualityDatasets = (['retirement', 'future-generation', 'centrica'] as PortfolioId[]).filter((portfolio) => qualityPortfolio === 'all' || qualityPortfolio === portfolio).map((portfolio) => {
    const store = workspaceStore.portfolios[portfolio]!
    const register = store.registers.find((candidate) => candidate.id === store.activeRegisterId) ?? store.registers[0]
    return { portfolio, label: portfolioDefinitions[portfolio].label, plants: register.workbook.plants.filter((plant) => plant.status !== 'Archived') }
  })

  return <main className={`app-shell theme-${theme}`}>
    <header className="app-header"><div className="brand-lockup"><span className="brand-mark">UK</span><div><p>Electricity system analysis</p><h1>Grid Stability Map</h1></div></div><div className="import-actions">{isPortfolio(area) && <><span className="save-indicator" role="status" title="Changes made in this browser are saved locally."><Check size={14} />{savedLabel}</span><label className="register-picker" title="Choose a sample register or local copy"><Database size={15} /><select value={activeStore.activeRegisterId} onChange={(event) => selectRegister(event.target.value)} aria-label="Active register">{activeStore.registers.map((register) => <option key={register.id} value={register.id}>{register.name}</option>)}</select></label><button className="icon-text-button backup-button" type="button" onClick={openRegisterSave} title="Save the current register as a named internal copy"><Save size={16} />Save copy</button><input ref={mergeInputRef} type="file" accept="text/csv,.csv" hidden onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void mergeCsvRegister(file) }} /><button className="icon-text-button backup-button" type="button" onClick={() => mergeInputRef.current?.click()} title="Merge a CSV into a new internal register copy"><FilePlus2 size={16} />Merge CSV</button><input ref={backupInputRef} type="file" accept="application/json,.json" hidden onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void restoreRegister(file) }} /><button className="icon-text-button backup-button" type="button" onClick={() => backupInputRef.current?.click()} title="Replace this browser's register with a backup JSON file"><Upload size={16} />Restore data</button><button className="icon-text-button backup-button" type="button" onClick={downloadRegister} title="Download all current portfolio data"><Download size={16} />Backup data</button></>}<button className="theme-toggle" type="button" onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>{theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}</button></div></header>
    {saveCopyOpen && <div className="modal-backdrop"><form className="save-register-dialog" onSubmit={(event) => { event.preventDefault(); createRegisterSave() }}><header><div><p>Internal register</p><h2>Save register copy</h2></div><button className="close-button" type="button" onClick={() => setSaveCopyOpen(false)} aria-label="Close save register dialog"><X size={16} /></button></header><label>Register name<input value={newRegisterName} onChange={(event) => setNewRegisterName(event.target.value)} autoFocus /></label><footer><button className="secondary-action" type="button" onClick={() => setSaveCopyOpen(false)}>Cancel</button><button className="primary-action" type="submit"><Save size={16} />Save copy</button></footer></form></div>}
    <nav className="workspace-tabs" aria-label="Workspace areas">{tabs.map((tab) => { const Icon = tab.icon; return <button key={tab.id} type="button" className={area === tab.id ? 'active' : ''} onClick={() => selectArea(tab.id)}><Icon size={16} />{tab.label}</button> })}</nav>
    {isPortfolio(area) && <nav className="portfolio-tabs" aria-label={`${portfolioDefinitions[activePortfolio].label} views`}><span>{portfolioDefinitions[activePortfolio].description}</span>{([{ id: 'map', label: 'Map', icon: Map }, { id: 'register', label: 'Register', icon: TableProperties }] as const).map((tab) => { const Icon = tab.icon; return <button key={tab.id} type="button" className={portfolioView === tab.id ? 'active' : ''} onClick={() => selectPortfolioView(tab.id)}><Icon size={15} />{tab.label}</button> })}</nav>}
    {isPortfolio(area) && portfolioView === 'map' && <section className="control-bar" aria-label="Map controls"><MapPlaceSearch plants={workbook.plants} onSelect={(place) => { setSelectedPlace(place); if (place.registeredPlant) setSelectedPlant(place.registeredPlant) }} /><div className="segmented-control" aria-label={activePortfolio === 'future-generation' ? 'Commissioning horizon' : 'Retirement horizon'}>{years.map((option) => <button key={option} type="button" className={option === year ? 'active' : ''} onClick={() => setYear(option)}>{option}</button>)}</div>{activePortfolio !== 'future-generation' && <div className="need-control" aria-label="Stability screening overlay"><span>Need overlay</span>{([{ id: 'none', label: 'Off' }, { id: 'inertia', label: 'Inertia' }, { id: 'scl', label: 'SCL' }, { id: 'voltage', label: 'Voltage' }] as const).map((layer) => <button key={layer.id} type="button" className={needLayer === layer.id ? 'active' : ''} onClick={() => setNeedLayer(layer.id)}>{layer.label}</button>)}</div>}{activePortfolio !== 'future-generation' && needLayer !== 'none' && <label className="heat-opacity-control">Heat <input type="range" min="20" max="100" step="5" value={heatOpacity} onChange={(event) => setHeatOpacity(Number(event.target.value))} aria-label="Heatmap opacity" /><output>{heatOpacity}%</output></label>}<button className={`network-layer-toggle ${networkLayer ? 'active' : ''}`} type="button" onClick={() => setNetworkLayer((current) => !current)} title="Show OpenStreetMap lines and substations"><Network size={15} />Network</button>{networkLayer && <div className="network-options" aria-label="Network data filters">{([{ id: 'transmission', label: '220+ kV' }, { id: 'substations', label: 'Substations' }, { id: 'lowerVoltage', label: '110/132 kV' }, { id: 'future', label: 'Future' }] as const).map((option) => <button key={option.id} type="button" className={networkOptions[option.id] ? 'active' : ''} aria-pressed={networkOptions[option.id]} onClick={() => setNetworkOptions((current) => ({ ...current, [option.id]: !current[option.id] }))}>{option.label}</button>)}</div>}</section>}
    {isPortfolio(area) && portfolioView === 'map' && <section className="map-workspace"><MapView plants={mapPlants} year={year} retiredMode="fade" needLayer={activePortfolio === 'future-generation' ? 'none' : needLayer} heatOpacity={heatOpacity / 100} networkLayer={networkLayer} networkOptions={networkOptions} portfolio={activePortfolio} focusedPlant={focusedPlant ?? selectedPlace?.registeredPlant} focusedPlace={selectedPlace} onPlantSelect={(plant) => setSelectedPlant((current) => current?.assetId === plant?.assetId ? undefined : plant)} /><DashboardPanel plants={filteredPlants} year={year} selectedPlant={selectedPlant} portfolio={activePortfolio} /><div className="map-legend" aria-label="Map legend">{networkLayer ? <><span className="legend-title">Network data</span><span className="network-key" />{networkLegend}{networkOptions.future && <><span className="network-key future" />Proposed / construction</>}</> : activePortfolio === 'future-generation' ? <><span className="legend-title">Offshore wind</span><span className="marker-key offshore-site-key" />Wind site<span className="connection-key" />Confirmed connection<span className="connection-key estimated" />Estimated connection<span className="node-key" />Onshore node</> : <><span className="legend-title">Generation markers</span><span className="marker-key" />Size: Net MW<span className="marker-key technology" />Colour: technology<span className="marker-key lifespan" />Opacity: retirement timing</>}</div></section>}
    {isPortfolio(area) && portfolioView === 'register' && <RegisterView portfolio={activePortfolio} plants={workbook.plants} filteredPlants={filteredPlants} filters={filters} onFiltersChange={updateFilters} onSave={savePlant} onArchive={archivePlant} onDelete={deletePlant} onDuplicate={duplicatePlant} editingPlant={editingPlant} onEditingPlantHandled={() => setEditingPlant(undefined)} />}
    {area === 'timeline' && <section className="workspace-with-filter"><TimelineView retirementPlants={(workspaceStore.portfolios.retirement!.registers.find((register) => register.id === workspaceStore.portfolios.retirement!.activeRegisterId) ?? workspaceStore.portfolios.retirement!.registers[0]).workbook.plants} futurePlants={(workspaceStore.portfolios['future-generation']!.registers.find((register) => register.id === workspaceStore.portfolios['future-generation']!.activeRegisterId) ?? workspaceStore.portfolios['future-generation']!.registers[0]).workbook.plants} /></section>}
    {area === 'quality' && <section className="workspace-with-filter"><label className="quality-portfolio-filter">Portfolio<select value={qualityPortfolio} onChange={(event) => setQualityPortfolio(event.target.value as PortfolioId | 'all')}><option value="all">All portfolios</option>{(['retirement', 'future-generation', 'centrica'] as PortfolioId[]).map((portfolio) => <option key={portfolio} value={portfolio}>{portfolioDefinitions[portfolio].label}</option>)}</select></label><DataQualityView datasets={qualityDatasets} onEdit={resolveIssue} /></section>}
  </main>
}
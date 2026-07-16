import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as XLSX from 'xlsx'

const projectPath = resolve(import.meta.dirname, '..')
const workspacePath = resolve(projectPath, '..')
const workbookPath = resolve(workspacePath, 'UK Generation Retirement Register.xlsx')
const coordinatesPath = resolve(projectPath, 'public', 'plant-coordinates.csv')
const outputPath = resolve(projectPath, 'src', 'data', 'default-register.ts')

const parseCsvLine = (line) => {
  const values = []
  let value = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') quoted = !quoted
    else if (character === ',' && !quoted) { values.push(value.trim()); value = '' }
    else value += character
  }
  values.push(value.trim())
  return values
}

const number = (value) => Number(String(value ?? '').replace(/,/g, '')) || 0
const date = (value) => {
  const dateText = String(value ?? '')
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(dateText)
  if (!match) return undefined
  const [, month, day, rawYear] = match
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

const coordinates = new Map()
const [coordinateHeader, ...coordinateRows] = readFileSync(coordinatesPath, 'utf8').trim().split(/\r?\n/)
const coordinateKeys = parseCsvLine(coordinateHeader)
coordinateRows.forEach((line) => {
  const record = Object.fromEntries(coordinateKeys.map((key, index) => [key, parseCsvLine(line)[index] ?? '']))
  coordinates.set(record['Node ID'], { latitude: Number(record.Latitude), longitude: Number(record.Longitude) })
})

const workbook = XLSX.read(readFileSync(workbookPath))
const rows = XLSX.utils.sheet_to_json(workbook.Sheets.PLANT_DATA, { raw: false, defval: '' })
const plants = rows.map((row) => {
  const coordinate = coordinates.get(row['Node ID'])
  return {
    assetId: String(row['Asset ID']),
    name: String(row['Plant name']),
    nodeId: String(row['Node ID']),
    nodeName: String(row['Node / substation']),
    region: String(row.Region),
    country: 'Great Britain',
    technology: String(row['Technology type']),
    netMw: number(row['Net MW']),
    retirementDate: date(row['Retirement date (most likely)']),
    retirementClass: String(row['Retirement class']),
    confidenceScore: number(row['Confidence score']),
    evidenceSource: String(row['Evidence flag']),
    notes: String(row['Analyst notes']),
    status: 'Active',
    inertiaProxy: number(row['Inertia proxy (MVA.s eq.)']),
    faultLevelProxy: number(row['Fault-level proxy (MVA)']),
    reactiveProxy: number(row['Reactive proxy (MVAr)']),
    latitude: coordinate?.latitude ?? 0,
    longitude: coordinate?.longitude ?? 0,
    hasCoordinates: Boolean(coordinate),
  }
})

const data = {
  plants,
  riskNodes: [],
  importedFileName: 'Built-in retirement register',
}

mkdirSync(resolve(projectPath, 'src', 'data'), { recursive: true })
writeFileSync(outputPath, `import type { WorkbookData } from '../models'\n\nexport const defaultRegister: WorkbookData = ${JSON.stringify(data, null, 2)}\n`)
console.log(`Built ${plants.length} local plant records in ${outputPath}`)
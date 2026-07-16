import * as XLSX from 'xlsx'
import type { RiskNode, WorkbookData } from '../models'

type CellValue = string | number | boolean | null | undefined
type TableRow = Record<string, CellValue>

const normalise = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
const text = (value: CellValue) => String(value ?? '').trim()

function valueAsNumber(value: CellValue) {
  const valueText = text(value).replace(/,/g, '')
  if (!valueText || valueText.includes('#REF!')) return undefined
  const parsed = Number(valueText.replace('%', ''))
  if (!Number.isFinite(parsed)) return undefined
  return valueText.includes('%') ? parsed / 100 : parsed
}

function columnValue(row: TableRow, aliases: string[]) {
  const entry = Object.entries(row).find(([header]) => aliases.some((alias) => normalise(header) === normalise(alias)))
  return entry?.[1]
}

function stringValue(row: TableRow, aliases: string[]) {
  return text(columnValue(row, aliases))
}

function numberValue(row: TableRow, aliases: string[], fallback = 0) {
  return valueAsNumber(columnValue(row, aliases)) ?? fallback
}

function parseRetirementDate(value: CellValue) {
  const valueText = text(value)
  const ukMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(valueText)
  if (ukMatch && Number(ukMatch[1]) > 0 && Number(ukMatch[2]) > 0) {
    const [, day, month, year] = ukMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  const usMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/.exec(valueText)
  if (usMatch && Number(usMatch[1]) > 0 && Number(usMatch[2]) > 0) {
    const [, month, day, shortYear] = usMatch
    return `20${shortYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  return undefined
}

function rowsFromSheet(sheet: XLSX.WorkSheet, requiredHeaders: string[]) {
  const values = XLSX.utils.sheet_to_json<CellValue[]>(sheet, { header: 1, raw: false, defval: '' })
  const headerIndex = values.findIndex((row) => {
    const headers = row.map(text).map(normalise)
    return requiredHeaders.every((required) => headers.includes(normalise(required)))
  })
  if (headerIndex === -1) return []

  const headers = values[headerIndex].map(text)
  return values.slice(headerIndex + 1)
    .filter((row) => row.some((cell) => text(cell)))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])))
}

function getSheet(workbook: XLSX.WorkBook, name: string) {
  const sheet = workbook.Sheets[name]
  if (!sheet) throw new Error(`The workbook does not contain a ${name} sheet.`)
  return sheet
}

function readRiskNodes(coreRows: TableRow[], outputRows: TableRow[]): Omit<RiskNode, 'latitude' | 'longitude' | 'hasCoordinates'>[] {
  const classificationByNode = new Map(outputRows.map((row) => [
    normalise(stringValue(row, ['Node'])),
    stringValue(row, ['Timing class']) || 'Unclassified',
  ]))

  return coreRows.flatMap((row) => {
    const nodeId = stringValue(row, ['Node ID'])
    const nodeName = stringValue(row, ['Node name'])
    if (!nodeId || !nodeName) return []

    const deficit2030 = valueAsNumber(columnValue(row, ['Deficit 2030']))
    const deficit2040 = valueAsNumber(columnValue(row, ['Deficit 2040']))
    const deficit2050 = valueAsNumber(columnValue(row, ['Deficit 2050']))
    if (deficit2030 === undefined || deficit2040 === undefined || deficit2050 === undefined) return []

    return [{
      nodeId,
      nodeName,
      region: stringValue(row, ['Region']),
      deficits: { 2030: deficit2030, 2040: deficit2040, 2050: deficit2050 },
      timingClassification: classificationByNode.get(normalise(nodeName)) ?? 'Unclassified',
      confidenceScore: valueAsNumber(columnValue(row, ['Min confidence'])),
    }]
  })
}

export async function importWorkbook(file: File): Promise<WorkbookData> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array', cellDates: false })
  const plantRows = rowsFromSheet(getSheet(workbook, 'PLANT_DATA'), ['Plant name', 'Net MW', 'Node ID'])
  const coreRows = rowsFromSheet(getSheet(workbook, 'CORE_MODEL'), ['Node ID', 'Node name', 'Deficit 2030', 'Deficit 2050'])
  const outputRows = rowsFromSheet(getSheet(workbook, 'OUTPUTS'), ['Node', 'Deficit 2030', 'Timing class'])
  if (!plantRows.length) throw new Error('No plant rows were found in PLANT_DATA.')

  const plants = plantRows.map((row) => ({
    assetId: stringValue(row, ['Asset ID']),
    name: stringValue(row, ['Plant name']),
    nodeId: stringValue(row, ['Node ID']),
    nodeName: stringValue(row, ['Node / substation']),
    region: stringValue(row, ['Region']),
    technology: stringValue(row, ['Technology type']) || 'Other',
    netMw: numberValue(row, ['Net MW']),
    retirementDate: parseRetirementDate(columnValue(row, ['Retirement date (most likely)'])),
    retirementClass: stringValue(row, ['Retirement class']),
    confidenceScore: valueAsNumber(columnValue(row, ['Confidence score'])),
  }))

  return {
    plants: plants.map((plant) => ({ ...plant, latitude: 0, longitude: 0, hasCoordinates: false })),
    riskNodes: readRiskNodes(coreRows, outputRows).map((node) => ({ ...node, latitude: 0, longitude: 0, hasCoordinates: false })),
    importedFileName: file.name,
  }
}
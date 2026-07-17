import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const projectPath = resolve(import.meta.dirname, '..')
const registerPath = resolve(projectPath, 'src', 'data', 'plant-register-2026-07-16.json')
const outputPath = resolve(projectPath, 'src', 'data', 'default-register.ts')

const plants = JSON.parse(readFileSync(registerPath, 'utf8'))
if (!Array.isArray(plants)) throw new Error(`Expected an array of plants in ${registerPath}`)

const data = {
  plants,
  riskNodes: [],
  importedFileName: 'plant-register-2026-07-16.json',
}

mkdirSync(resolve(projectPath, 'src', 'data'), { recursive: true })
writeFileSync(outputPath, `import type { WorkbookData } from '../models'\n\nexport const defaultRegister: WorkbookData = ${JSON.stringify(data, null, 2)}\n`)
console.log(`Built ${plants.length} local plant records in ${outputPath}`)
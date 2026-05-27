import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const type = process.argv[2] || 'npm'

// Generate the changelog content
const summary = execSync(`tsx ${join(__dirname, 'generate-summary.ts')} ${type}`, { encoding: 'utf-8' }).trim()

// Read current version from package.json
const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'))
const version = packageJson.version

// Determine changelog path based on type
const changelogPath = type === 'vscode' ? join(__dirname, '../tools/pelela-vscode/CHANGELOG.md') : join(__dirname, '../CHANGELOG.md')

// Read current CHANGELOG.md
let currentContent = ''
try {
  currentContent = readFileSync(changelogPath, 'utf-8')
} catch {
  // File doesn't exist, create empty
  currentContent = '# CHANGELOG\n\n'
}

// Add new entry at the top (after header) with actual version
const date = new Date().toISOString().split('T')[0]
const tagPrefix = type === 'vscode' ? 'vscode-v' : 'npm-v'
const newEntry = `## ${tagPrefix}${version} - ${date}\n${summary}\n\n`

// Find first version header or append after header
const firstVersionHeaderIndex = currentContent.search(/^## /m)
let newContent: string
if (firstVersionHeaderIndex === -1) {
  // No existing version headers, prepend new entry after header
  newContent = newEntry + currentContent
} else {
  const header = currentContent.slice(0, firstVersionHeaderIndex)
  const releases = currentContent.slice(firstVersionHeaderIndex)
  newContent = header + newEntry + releases
}

// Write updated CHANGELOG.md
writeFileSync(changelogPath, newContent)

// Open editor and wait for it to close
const editor = process.env.EDITOR || 'code'
execSync(`${editor} --wait ${changelogPath}`, { stdio: 'inherit' })

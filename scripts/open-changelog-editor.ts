import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { updateChangelog } from './update-changelog'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const type: 'npm' | 'vscode' = (process.argv[2] as 'npm' | 'vscode') || 'npm'

const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'))
const version = packageJson.version

const changelogFile =
  type === 'vscode'
    ? join(__dirname, '../tools/pelela-vscode/CHANGELOG.md')
    : join(__dirname, '../CHANGELOG.md')

updateChangelog(version, type, changelogFile)

if (!process.env.CI) {
  const editor = process.env.EDITOR || 'code'
  execSync(`${editor} --wait ${changelogFile}`, { stdio: 'inherit' })
}

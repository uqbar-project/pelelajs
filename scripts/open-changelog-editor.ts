import { execSync } from 'node:child_process'

const editor = process.env.EDITOR || 'code'
execSync(`${editor} CHANGELOG.md`, { stdio: 'inherit' })

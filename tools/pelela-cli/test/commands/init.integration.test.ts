import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { initCommand } from '../../src/commands/init'
import { initializeI18n } from '../../src/utils/i18n'

const BASE_COMPONENT_OPENING_TAG = '<pelela view-model="Base">'
const BASE_COMPONENT_CLOSING_TAG = '</pelela>'

describe('initCommand (Integration)', () => {
  let testDir: string

  beforeAll(async () => {
    await initializeI18n('en')
  })

  beforeEach(() => {
    testDir = `pelela-init-test-${randomUUID()}`
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('initializes a project from the base template', async () => {
    await initCommand({ projectName: testDir })

    const gitignorePath = join(testDir, '.gitignore')
    expect(existsSync(gitignorePath)).toBe(true)

    const packageJsonPath = join(testDir, 'package.json')
    expect(existsSync(packageJsonPath)).toBe(true)
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
    expect(packageJson.name).toBe(testDir)

    const biomeJsonPath = join(testDir, 'biome.json')
    expect(existsSync(biomeJsonPath)).toBe(true)

    expect(existsSync(join(testDir, 'src'))).toBe(true)
    expect(existsSync(join(testDir, 'index.html'))).toBe(true)
    expect(existsSync(join(testDir, 'main.ts'))).toBe(true)
  })

  it('creates the base component with pelela as root', async () => {
    await initCommand({ projectName: testDir })

    const baseTemplate = readFileSync(join(testDir, 'src', 'base.pelela'), 'utf-8')
    const templateLines = baseTemplate.trim().split('\n')

    expect(templateLines.at(0)).toBe(BASE_COMPONENT_OPENING_TAG)
    expect(templateLines.at(-1)).toBe(BASE_COMPONENT_CLOSING_TAG)
  })
})

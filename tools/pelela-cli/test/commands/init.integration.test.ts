import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { initCommand } from '../../src/commands/init'
import { initializeI18n } from '../../src/utils/i18n'

describe('initCommand (Integration)', () => {
  const testDir = `pelela-init-test-${randomUUID()}`

  beforeAll(async () => {
    await initializeI18n('en')
  })

  afterAll(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('copies .gitignore to the initialized project', async () => {
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
})

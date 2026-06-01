import { randomUUID } from 'node:crypto'
import { existsSync, rmSync } from 'node:fs'
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

    rmSync(testDir, { recursive: true, force: true })
  })
})

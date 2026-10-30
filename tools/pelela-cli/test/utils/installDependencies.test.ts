import { execSync } from 'node:child_process'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { initializeI18n, t } from '../../src/utils/i18n'
import { installDependencies } from '../../src/utils/shell'

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}))

const PROJECT_PATH = '/mock/project'
const INSTALL_COMMAND = 'pnpm install'

const mockedExecSync = vi.mocked(execSync)

beforeAll(async () => {
  await initializeI18n('en')
})

afterEach(() => {
  mockedExecSync.mockReset()
})

describe('installDependencies', () => {
  it('runs the package manager install inside the project directory', () => {
    installDependencies(PROJECT_PATH)

    expect(mockedExecSync).toHaveBeenCalledWith(INSTALL_COMMAND, {
      cwd: PROJECT_PATH,
      stdio: 'inherit',
    })
  })

  it('throws an actionable error preserving the original failure as cause', () => {
    const originalError = new Error('network down')
    mockedExecSync.mockImplementation(() => {
      throw originalError
    })

    try {
      installDependencies(PROJECT_PATH)
      throw new Error('Expected installDependencies to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe(t('errors.installDependencies', { path: PROJECT_PATH }))
      expect((error as Error).cause).toBe(originalError)
    }
  })
})

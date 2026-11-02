import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { beforeAll, describe, expect, it } from 'vitest'
import { initializeI18n, t } from '../../src/utils/i18n'
import { getRequiredNodeVersion, isSupportedNodeVersion } from '../../src/utils/nodeVersion'
import { getCliVersion } from '../../src/utils/version'

const execFileAsync = promisify(execFile)
const cliEntryUrl = new URL('../../src/index.ts', import.meta.url).href

function runCliWithNodeVersion(nodeVersion: string) {
  const source = `
    Object.defineProperty(process, 'version', { value: ${JSON.stringify(nodeVersion)} })
    process.argv = [process.execPath, 'pelela', '--version']
    await import(${JSON.stringify(cliEntryUrl)})
  `
  const environment = { ...process.env }
  environment.LANG = 'en'
  environment.FORCE_COLOR = '0'

  return execFileAsync(
    process.execPath,
    ['--import', 'tsx', '--input-type', 'module', '--eval', source],
    { env: environment },
  )
}

beforeAll(async () => {
  await initializeI18n('en')
})

describe('CLI Node.js requirements', () => {
  it.each(['v22.23.4', 'v24.22.1', 'v26.12.1', 'v22.23.5', 'v24.22.2', 'v26.12.2'])(
    'supports patched Node.js %s',
    (nodeVersion) => {
      expect(isSupportedNodeVersion(nodeVersion)).toBe(true)
    },
  )

  it.each(['v22.18.0', 'v22.23.3', 'v24.0.0', 'v24.22.0', 'v26.12.0', 'v23.0.0', 'v25.0.0'])(
    'rejects unpatched or unsupported Node.js %s',
    (nodeVersion) => {
      expect(isSupportedNodeVersion(nodeVersion)).toBe(false)
    },
  )

  it('runs the version command with a supported Node.js version', async () => {
    const nodeVersion = 'v22.23.4'
    const result = await runCliWithNodeVersion(nodeVersion)

    expect(result.stdout).toBe(`${getCliVersion()}\n`)
    expect(result.stderr).toBe('')
  })

  it('rejects an unsupported Node.js version before executing the command', async () => {
    const nodeVersion = 'v22.23.3'
    const requirementMessage = t('errors.nodeVersion', {
      requiredVersion: getRequiredNodeVersion(),
    })
    const currentVersionMessage = t('errors.currentVersion', { currentVersion: nodeVersion })

    await expect(runCliWithNodeVersion(nodeVersion)).rejects.toMatchObject({
      code: 1,
      stdout: '',
      stderr: `\n${requirementMessage}\n\n${currentVersionMessage}\n\n`,
    })
  })
})

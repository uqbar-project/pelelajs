function getPackageVersion(): string {
  const packageJson = require('../../package.json') as { version: string }
  return packageJson.version
}

export function getCliVersion(): string {
  return getPackageVersion()
}

export async function getLocalVersion(): Promise<string> {
  return getCliVersion()
}

export async function checkNewVersion(): Promise<{
  current: string
  latest: string | null
  hasUpdate: boolean
}> {
  const current = await getLocalVersion()

  try {
    const response = await fetch('https://registry.npmjs.org/@pelelajs/cli')
    const data = (await response.json()) as { 'dist-tags'?: { latest?: string } }
    const latest = data['dist-tags']?.latest

    const hasUpdate = typeof latest === 'string' && latest !== current

    return {
      current,
      latest: latest || null,
      hasUpdate,
    }
  } catch {
    return {
      current,
      latest: null,
      hasUpdate: false,
    }
  }
}

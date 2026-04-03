import { gt } from 'semver'
import packageJson from '../../package.json' with { type: 'json' }

function getPackageVersion(): string {
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
  const failResponse = {
    current,
    latest: null as string | null,
    hasUpdate: false,
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch('https://registry.npmjs.org/@pelelajs/cli', {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      return failResponse
    }

    const data = (await response.json()) as { 'dist-tags'?: { latest?: string } }
    const latest = data['dist-tags']?.latest

    const hasUpdate = typeof latest === 'string' && gt(latest, current)

    return {
      current,
      latest: latest || null,
      hasUpdate,
    }
  } catch (error) {
    console.error('Failed to check for new version:', error)
    return failResponse
  }
}

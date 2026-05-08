import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gt } from 'semver'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface PackageInfo {
  name: string
  version: string
}

const findVersionRecursively = (currentDir: string, depth: number): string => {
  if (depth <= 0) {
    return '0.0.0'
  }

  const pkgPath = join(currentDir, 'package.json')

  try {
    const content = readFileSync(pkgPath, 'utf-8')
    const pkg = JSON.parse(content) as PackageInfo

    return ['pelelajs', '@pelelajs/cli'].includes(pkg.name)
      ? pkg.version
      : findVersionRecursively(dirname(currentDir), depth - 1)
  } catch (_error) {
    return findVersionRecursively(dirname(currentDir), depth - 1)
  }
}

function getPackageVersion(): string {
  return findVersionRecursively(__dirname, 5)
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

    const response = await fetch('https://registry.npmjs.org/pelelajs', {
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

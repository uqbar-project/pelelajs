import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { gt } from 'semver'
import { getCurrentModuleDir } from './modulePath'

interface PackageInfo {
  name: string
  version: string
}

const supportedCliPackages = ['pelelajs', '@pelelajs/cli'] as const

type SupportedCliPackage = (typeof supportedCliPackages)[number]

const currentModuleDir = getCurrentModuleDir(import.meta.url)

function isSupportedCliPackage(name: string): name is SupportedCliPackage {
  return (supportedCliPackages as readonly string[]).includes(name)
}

const findVersionRecursively = (currentDir: string, depth: number): string => {
  if (depth <= 0) {
    return '0.0.0'
  }

  const pkgPath = join(currentDir, 'package.json')

  try {
    const content = readFileSync(pkgPath, 'utf-8')
    const pkg = JSON.parse(content) as PackageInfo

    return isSupportedCliPackage(pkg.name)
      ? pkg.version
      : findVersionRecursively(dirname(currentDir), depth - 1)
  } catch (_error) {
    return findVersionRecursively(dirname(currentDir), depth - 1)
  }
}

function getPackageVersion(): string {
  return findVersionRecursively(currentModuleDir, 5)
}

export function getCliVersion(): string {
  return getPackageVersion()
}

export const versionUtils = {
  getLocalVersion: async (): Promise<string> => getCliVersion(),
}

export async function getLocalVersion(): Promise<string> {
  return versionUtils.getLocalVersion()
}

export async function checkNewVersion(): Promise<{
  current: string
  latest: string | null
  hasUpdate: boolean
}> {
  const current = await versionUtils.getLocalVersion()
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

    let hasUpdate = false
    try {
      hasUpdate = typeof latest === 'string' && !!latest && gt(latest, current)
    } catch (error: unknown) {
      console.warn('Invalid version format while checking updates', { latest, current, error })
      hasUpdate = false
    }

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

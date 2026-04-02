export async function getLocalVersion(): Promise<string> {
  const version = '1.0.0'
  return version
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

    const hasUpdate = latest && latest !== current && compareVersions(latest, current) > 0

    return {
      current,
      latest: latest || null,
      hasUpdate: hasUpdate || false,
    }
  } catch {
    return {
      current,
      latest: null,
      hasUpdate: false,
    }
  }
}

function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0
    const part2 = parts2[i] || 0

    if (part1 !== part2) {
      return part1 - part2
    }
  }

  return 0
}

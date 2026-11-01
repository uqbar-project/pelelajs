import semver from 'semver'
import cliPackageJson from '../../package.json' with { type: 'json' }

export function getRequiredNodeVersion(): string {
  return cliPackageJson.engines.node
}

export function isSupportedNodeVersion(nodeVersion: string): boolean {
  return semver.satisfies(nodeVersion, getRequiredNodeVersion())
}

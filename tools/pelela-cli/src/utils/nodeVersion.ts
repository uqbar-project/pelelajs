import cliPackageJson from '../../package.json' with { type: 'json' }

export function getRequiredNodeVersion(): string {
  return cliPackageJson.engines.node
}
